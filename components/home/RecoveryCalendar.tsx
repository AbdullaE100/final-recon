import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '@/context/ThemeContext';
import { useStreak } from '@/context/StreakContext';
import { format, startOfDay, eachDayOfInterval, parseISO, isAfter, addDays, subDays, isSameDay } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { getData, STORAGE_KEYS } from '@/utils/storage';

// Define custom colors for the calendar
const customCalendarColors = {
  clean: '#34D399', // A vibrant, encouraging green
  relapse: '#F87171', // A softer, less alarming red
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
        <View style={[styles.legendIndicator, { backgroundColor: customCalendarColors.relapse }]} />
        <Text style={[styles.legendText, { color: colors.secondaryText }]}>Relapse</Text>
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
  const { streakStartDate, calendarHistory, debugCalendarHistory, resetCalendar, forceRefresh, streak } = useStreak();
  const [expanded, setExpanded] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [calendarKey, setCalendarKey] = useState(0); // Key to force re-render

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
  }, [forceRefresh, streak]);

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

  // Force calendar to re-render when streak or calendar history changes
  useEffect(() => {
    setCalendarKey(prev => prev + 1);
    console.log(`RecoveryCalendar: Forcing re-render with new key ${calendarKey}, streak: ${streak}, history entries: ${Object.keys(calendarHistory).length}`);
    
    // Immediately refresh data to ensure we have the latest
    refreshData();
  }, [streak, calendarHistory, refreshData]);

  // Create a proper markedDates object based on calendarHistory
  const markedDates = useMemo(() => {
    // Initialize an empty object for marked dates
    const marked: any = {};
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');
    
    try {
      // If we have a streak start date, mark it specially
      if (streakStartDate) {
        const startDateStr = format(streakStartDate, 'yyyy-MM-dd');
        marked[startDateStr] = {
          customStyles: {
            container: {
              backgroundColor: customCalendarColors.startDay,
              borderRadius: 12,
            },
            text: {
              color: 'white',
              fontWeight: '700' as const,
            },
          },
        };
      }
      
      // Process calendar history
      if (calendarHistory && typeof calendarHistory === 'object') {
        Object.entries(calendarHistory).forEach(([dateStr, status]) => {
          // Skip future dates
          try {
            const entryDate = parseISO(dateStr);
            if (isAfter(entryDate, today)) return;
          } catch (e) {
            console.error(`RecoveryCalendar: Error parsing date ${dateStr}`, e);
            return;
          }
          
          // Set color based on status
          const color = status === 'clean' ? customCalendarColors.clean : customCalendarColors.relapse;
          
          // Special case: if this is the start date, we already marked it above
          if (streakStartDate && format(streakStartDate, 'yyyy-MM-dd') === dateStr) {
            return;
          }
          
          marked[dateStr] = {
            customStyles: {
              container: {
                backgroundColor: color,
                borderRadius: 12,
              },
              text: {
                color: 'white',
                fontWeight: '700' as const,
              },
            },
          };
        });
      }
      
      // Always mark today if it's not already marked
      if (!marked[todayStr]) {
        marked[todayStr] = {
          customStyles: {
            container: {
              backgroundColor: customCalendarColors.today,
              borderRadius: 12,
            },
            text: {
              color: 'white',
              fontWeight: '700' as const,
            },
          },
        };
      }
      
      console.log(`RecoveryCalendar: Generated ${Object.keys(marked).length} marked dates`);
      return marked;
    } catch (error) {
      console.error('RecoveryCalendar: Error generating markedDates', error);
      return {};
    }
  }, [calendarHistory, streakStartDate]);

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
        current={format(new Date(), 'yyyy-MM-dd')}
        markedDates={markedDates}
        markingType={'custom'}
        hideExtraDays={true}
        onDayPress={(day) => {
          console.log('[RecoveryCalendar] Day pressed:', day);
          console.log('[RecoveryCalendar] Marking for this day:', markedDates[day.dateString]);
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
        }}
        style={{
          borderRadius: 12,
        }}
      />
      <CalendarLegend />
      
      {/* Debug buttons - only show in development */}
      {__DEV__ && (
        <View style={styles.debugButtons}>
          <TouchableOpacity 
            style={[styles.debugButton, { backgroundColor: colors.primary }]} 
            onPress={() => {
              debugCalendarHistory();
              refreshData();
            }}
          >
            <Text style={{ color: colors.white }}>Debug</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.debugButton, { backgroundColor: colors.warning }]} 
            onPress={() => {
              console.log('[RecoveryCalendar] markedDates:', JSON.stringify(markedDates, null, 2));
              refreshData();
            }}
          >
            <Text style={{ color: colors.white }}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.debugButton, { backgroundColor: colors.error }]} 
            onPress={resetCalendar}
          >
            <Text style={{ color: colors.white }}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
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
  debugButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  debugButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
});

export default RecoveryCalendar; 