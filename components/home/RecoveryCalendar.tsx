import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, AppState, AppStateStatus } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '@/context/ThemeContext';
import { useStreak } from '@/context/StreakContext';
import { format, startOfDay, eachDayOfInterval, parseISO, isAfter, addDays, subDays, isSameDay, isBefore, differenceInMilliseconds } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { getData, STORAGE_KEYS } from '@/utils/storage';

// Define custom colors for the calendar
const customCalendarColors = {
  clean: '#34D399', // A vibrant, encouraging green
  startDay: '#818CF8', // A distinct but harmonious start day color
  today: '#60A5FA', // A blue color for today if it's not marked
  future: '#9CA3AF', // Gray for future days that shouldn't be marked
};

const CalendarLegend = () => {
  const { colors } = useTheme();
  return (
    <View style={styles.legendContainer}>
      <View style={styles.legendItem}>
        <View style={[styles.legendIndicator, { backgroundColor: customCalendarColors.clean }]} />
        <Text style={[styles.legendText, { color: colors.secondaryText }]}>Clean Day</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendIndicator, { backgroundColor: customCalendarColors.startDay }]} />
        <Text style={[styles.legendText, { color: colors.secondaryText }]}>Start Day</Text>
      </View>
    </View>
  );
};

const RecoveryCalendar = () => {
  const { colors } = useTheme();
  const { streakStartDate, calendarHistory, forceRefresh, streak } = useStreak();
  const [expanded, setExpanded] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0); // Key to force re-render
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const currentDateRef = useRef<Date>(new Date());
  const appState = useRef(AppState.currentState);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCheckedDayRef = useRef<string>(format(new Date(), 'yyyy-MM-dd'));

  // Function to calculate time until midnight
  const calculateTimeUntilMidnight = useCallback(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return differenceInMilliseconds(tomorrow, now);
  }, []);

  // Function to check if day has changed
  const checkDayChanged = useCallback(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const lastCheckedDay = lastCheckedDayRef.current;
    
    if (todayStr !== lastCheckedDay) {
      console.log(`[RecoveryCalendar] Day changed from ${lastCheckedDay} to ${todayStr}`);
      lastCheckedDayRef.current = todayStr;
      setCurrentDate(now);
      refreshData();
      return true;
    }
    return false;
  }, []);

  // Set up timer to check for day change at midnight
  const setupDayChangeTimer = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Calculate time until midnight and set a timer
    const timeUntilMidnight = calculateTimeUntilMidnight();
    console.log(`[RecoveryCalendar] Setting up day change timer for ${timeUntilMidnight}ms from now`);
    
    timerRef.current = setTimeout(() => {
      console.log('[RecoveryCalendar] Midnight timer triggered');
      const dayChanged = checkDayChanged();
      
      // Set up the next day's timer regardless
      setupDayChangeTimer();
      
      // If day has changed, update the calendar
      if (dayChanged) {
        refreshData();
      }
    }, timeUntilMidnight + 1000); // Add 1 second buffer
  }, [calculateTimeUntilMidnight, checkDayChanged]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app comes to foreground from background
      if (
        appState.current.match(/inactive|background/) && 
        nextAppState === 'active'
      ) {
        console.log('[RecoveryCalendar] App has come to the foreground, checking for date change');
        checkDayChanged();
        setupDayChangeTimer();
      }
      
      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription.remove();
      // Clear timer on unmount
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [checkDayChanged, setupDayChangeTimer]);

  // Initial setup
  useEffect(() => {
    // Set initial current date
    currentDateRef.current = new Date();
    setCurrentDate(currentDateRef.current);
    
    // Set up initial day change timer
    setupDayChangeTimer();
    
    // Also set up a periodic check every minute to ensure we don't miss day changes
    // This acts as a fallback in case the midnight timer fails
    const intervalId = setInterval(() => {
      checkDayChanged();
    }, 60000); // Check every minute
    
    return () => {
      clearInterval(intervalId);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [setupDayChangeTimer, checkDayChanged]);

  // Check if user is new when component mounts
  useEffect(() => {
    const checkNewUserStatus = async () => {
      try {
        const isOnboardingCompleted = await getData(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
        setIsNewUser(isOnboardingCompleted === false);
        console.log(`RecoveryCalendar: User is ${isOnboardingCompleted ? 'existing' : 'new'}, streak: ${streak}`);
      } catch (err) {
        console.error('RecoveryCalendar: Failed to check onboarding status', err);
      }
    };
    
    checkNewUserStatus();
    // Force refresh to ensure we have the latest data
    forceRefresh();
  }, [forceRefresh, streak]); // Added streak back to dependency array to update when streak changes

  // Function to refresh data
  const refreshData = useCallback(async () => {
    try {
      await forceRefresh();
      setCalendarKey(prev => prev + 1);
      console.log('RecoveryCalendar: Data refreshed');
    } catch (error) {
      console.error('RecoveryCalendar: Error refreshing data', error);
    }
  }, [forceRefresh]);

  // Only refresh data on mount (not on every state change)
  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add current streak to calendarHistory - ensure all days within streak are marked
  const enrichedCalendarHistory = useMemo(() => {
    const enriched = { ...calendarHistory };
    
    // If we have a streak start date and streak > 0, mark all days as clean unless already marked
    if (streakStartDate && streak > 0) {
      const today = startOfDay(new Date());
      eachDayOfInterval({ start: streakStartDate, end: today }).forEach((date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        // Always mark as clean
        enriched[dateStr] = 'clean';
      });
    }
    
    // Convert any existing relapse days to clean days
    Object.keys(enriched).forEach(dateKey => {
      if (enriched[dateKey] !== 'clean') {
        enriched[dateKey] = 'clean';
      }
    });
    
    return enriched;
  }, [calendarHistory, streakStartDate, streak]);

  // Create a proper markedDates object based on calendarHistory
  const markedDates = useMemo(() => {
    // Initialize an empty object for marked dates
    const marked: any = {};
    const today = startOfDay(currentDate); // Use currentDate state instead of creating new Date
    const todayStr = format(today, 'yyyy-MM-dd');
    
    try {
      // If we have a streak start date, mark it specially
      if (streakStartDate) {
        const startDateStr = format(streakStartDate, 'yyyy-MM-dd');
        marked[startDateStr] = {
          selected: true,
          selectedColor: customCalendarColors.startDay,
        };
      }
      
      // Process calendar history - using our enriched history that includes streak days
      if (enrichedCalendarHistory && typeof enrichedCalendarHistory === 'object') {
        Object.entries(enrichedCalendarHistory).forEach(([dateStr, status]) => {
          // Skip future dates
          try {
            const entryDate = parseISO(dateStr);
            if (isAfter(entryDate, today)) return;
          } catch (e) {
            console.error(`RecoveryCalendar: Error parsing date ${dateStr}`, e);
            return;
          }
          
          // Always mark as clean, ignoring relapse status
          const color = customCalendarColors.clean;
          
          // Special case: if this is the start date, we keep the existing marking
          if (streakStartDate && format(streakStartDate, 'yyyy-MM-dd') === dateStr) {
            return;
          }
          
          // Otherwise mark with appropriate color
          marked[dateStr] = {
            selected: true,
            selectedColor: color,
          };
        });
      }
      
      // Always mark today if it's not already marked
      if (!marked[todayStr]) {
        marked[todayStr] = {
          selected: true,
          selectedColor: customCalendarColors.today,
        };
      }
      
      console.log(`RecoveryCalendar: Generated ${Object.keys(marked).length} marked dates`);
      return marked;
    } catch (error) {
      console.error('RecoveryCalendar: Error generating markedDates', error);
      return {};
    }
  }, [enrichedCalendarHistory, streakStartDate, currentDate]); // Changed dependency to use enrichedCalendarHistory

  // Log markedDates when it changes
  useEffect(() => {
    console.log('[RecoveryCalendar] markedDates updated:', Object.keys(markedDates).length, 'days');
  }, [markedDates]);

  return (
    <LinearGradient
      colors={[colors.card, colors.background]}
      style={[
        styles.container,
        expanded ? styles.expanded : null,
        { borderColor: colors.border }
      ]}
    >
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setExpanded(prev => !prev)}
        activeOpacity={0.8}
      >
        <Text style={[styles.title, { color: colors.text }]}>
          Recovery Calendar
        </Text>
        {expanded ? (
          <ChevronUp size={18} color={colors.text} />
        ) : (
          <ChevronDown size={18} color={colors.text} />
        )}
      </TouchableOpacity>
      
      <Calendar
        key={`calendar-${calendarKey}`}
        current={format(currentDate, 'yyyy-MM-dd')} // Use currentDate for calendar current
        markedDates={markedDates}
        // No markingType means it uses the default 'dot' type
        hideExtraDays={true}
        onDayPress={(day) => {
          console.log('[RecoveryCalendar] Day pressed:', day);
          refreshData(); // Refresh data when a day is pressed
        }}
        theme={{
          calendarBackground: 'transparent',
          monthTextColor: colors.text,
          dayTextColor: colors.text,
          textDisabledColor: colors.border,
          arrowColor: colors.primary,
          todayTextColor: colors.primary,
          textSectionTitleColor: colors.secondaryText,
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          selectedDayBackgroundColor: customCalendarColors.clean,
          selectedDayTextColor: 'white',
        }}
        style={{
          borderRadius: 12,
        }}
      />
      <CalendarLegend />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  expanded: {
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
  },
});

export default RecoveryCalendar; 