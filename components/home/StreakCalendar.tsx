import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/context/GamificationContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, X, Calendar as CalendarIconFull, AlertTriangle, RefreshCw } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { isSameDay, formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { STORAGE_KEYS, getData, storeData } from '@/utils/storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';

// Types for tracking streak history events
interface StreakHistoryEvent {
  type: 'start' | 'relapse';
  date: Date;
  streakDays?: number;
  notes?: string;
  id: string;
}

// Define a type for the intentional relapse data
interface IntentionalRelapseData {
  date: number;
  timestamp: number;
}

// Update the color constants to use only red and green
const COLORS = {
  streak: '#4ade80', // Vibrant green
  relapse: '#f87171', // Soft red
  today: '#7c3aed', // Premium purple for today's highlight
  background: 'rgba(23, 23, 26, 0.8)', // Rich dark background
  cardBorder: 'rgba(255, 255, 255, 0.06)',
  cardBackground: 'rgba(18, 18, 23, 0.95)',
  navigationBg: 'rgba(40, 40, 45, 0.5)',
  legendBg: 'rgba(30, 30, 35, 0.8)',
  titleText: '#ffffff',
  calendarGridBg: 'rgba(25, 25, 30, 0.6)',
};

// Helper to generate day cells
const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Calculate offset for the first day of the month
  const firstDayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  const days = [];
  
  // Add empty spaces for days before the 1st of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ day: 0, date: null });
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      date: new Date(year, month, day),
    });
  }
  
  return days;
};

const StreakCalendar = () => {
  const { colors } = useTheme();
  const { streak } = useGamification();
  const today = new Date();
  const isFocused = useIsFocused();
  
  // Keep track of streak separately from the context to prevent resets
  const [persistentStreak, setPersistentStreak] = useState(streak);
  
  // Create a ref to hold the streak value to prevent losing it during navigation
  const streakRef = useRef(streak > 0 ? streak : persistentStreak);
  
  // Add a recovery flag to help prevent flicker during updates
  const [isRecovering, setIsRecovering] = useState(false);
  
  // Add a last update timestamp to help with race conditions
  const lastUpdateTime = useRef(Date.now());
  
  // Add this - Force refresh when relapsing
  const [forceRefresh, setForceRefresh] = useState(Date.now());
  
  // Add a refresh function that can be called to force a reload of the calendar data
  const refreshCalendarData = useCallback(async () => {
    try {
      // Clear existing data
      setRelapseDates([]);
      setStreakStartDates([]);
      setStreakHistory([]);
      
      // Force a re-render
      setForceUpdate(Date.now());
      setForceRefresh(Date.now());
      
      // Update the persistent streak to match the context streak
      if (streak === 0) {
        setPersistentStreak(0);
        streakRef.current = 0;
      }
      
      // Re-load streak history data
      const streakData = await getStreakDataDirectly();
      if (streakData) {
        console.log('Refreshing calendar with latest streak data:', streakData);
      }
    } catch (error) {
      console.error('Error refreshing calendar data:', error);
    }
  }, [streak]);
  
  // Add a state for tracking the current day relapse
  const [todayIsRelapse, setTodayIsRelapse] = useState(false);
  
  // Modify the useEffect that detects relapses to prevent infinite loops and fix relapse detection
  useEffect(() => {
    // Only process legitimate relapse (when streak becomes 0)
    if (streak === 0 && !isRecovering) {
      // Immediately mark today as a relapse day for display purposes
      setTodayIsRelapse(true);
      
      // If we have a high streak value and it just changed to 0, this is a legitimate relapse
      if (persistentStreak > 0) {
        console.log('Legitimate relapse detected, resetting streak to 0');
        
        // Set the flags first to prevent re-triggering effects
        setPersistentStreak(0);
        streakRef.current = 0;
        
        // Add today to relapse dates immediately
        const today = new Date();
        setRelapseDates(prev => {
          // Only add today if it's not already in the list
          if (prev.some(date => isSameDay(date.getTime(), today.getTime()))) {
            return prev;
          }
          return [...prev, today];
        });
        
        // Add to history events if not already there
        const relapseEvent: StreakHistoryEvent = {
          type: 'relapse',
          date: today,
          streakDays: persistentStreak,
          notes: `Lost a streak of ${persistentStreak} days`,
          id: generateUniqueId('realtime-relapse')
        };
        
        setStreakHistory(prev => {
          // Check if we already have a relapse event for today
          if (prev.some(event => 
            event.type === 'relapse' && isSameDay(event.date.getTime(), today.getTime())
          )) {
            return prev;
          }
          return [relapseEvent, ...prev];
        });
      }
    }
  }, [streak, persistentStreak, isRecovering]);

  // Refresh calendar when screen comes back into focus
  useEffect(() => {
    if (isFocused) {
      console.log('Screen focused, refreshing calendar data');
      refreshCalendarData();
      
      // Check if there's a recent intentional relapse
      checkIntentionalRelapse();
    }
  }, [isFocused, refreshCalendarData]);
  
  // Update both state and ref when streak changes in the context
  useEffect(() => {
    console.log(`Streak changed in context to: ${streak}, current persistentStreak: ${persistentStreak}, ref value: ${streakRef.current}`);
    
    // Don't override a valid streak with 0
    if (streak === 0 && streakRef.current > 0) {
      console.log(`Ignoring streak reset from context, keeping ${streakRef.current}`);
      return;
    }
    
    if (streak !== persistentStreak) {
      // Only update if the new value is non-zero or if we're legitimately resetting a streak
      if (streak > 0 || (streak === 0 && persistentStreak === 0)) {
        setPersistentStreak(streak);
        streakRef.current = streak;
        lastUpdateTime.current = Date.now();
        console.log(`Updated persistent streak to: ${streak}`);
      } else {
        console.log(`Ignoring suspicious streak update from ${persistentStreak} to ${streak}`);
      }
    }
  }, [streak, persistentStreak]);
  
  // Also update ref when persistent streak changes
  useEffect(() => {
    if (persistentStreak > 0 || (persistentStreak === 0 && streakRef.current === 0)) {
      streakRef.current = persistentStreak;
      console.log(`Updated streakRef to match persistentStreak: ${persistentStreak}`);
    }
  }, [persistentStreak]);
  
  // Add recovery mechanism for cases where the persistentStreak is reset unintentionally
  useEffect(() => {
    if (persistentStreak === 0 && streakRef.current > 0 && !isRecovering) {
      console.log(`Detected unintentional streak reset, recovering from ref: ${streakRef.current}`);
      setIsRecovering(true);
      
      // First check storage to see if there's a value there
      getStreakDataDirectly().then(data => {
        if (data && data.streak > 0) {
          console.log(`Recovered streak from storage: ${data.streak}`);
          setPersistentStreak(data.streak);
          streakRef.current = data.streak;
        } else {
          // Fall back to the ref value if storage doesn't have a valid value
          console.log(`Fallback to ref value for recovery: ${streakRef.current}`);
          setPersistentStreak(streakRef.current);
        }
        
        // End recovery mode after a short delay
        setTimeout(() => setIsRecovering(false), 500);
      }).catch(error => {
        console.error('Error during streak recovery:', error);
        // Still try to recover using the ref value
        setPersistentStreak(streakRef.current);
        setTimeout(() => setIsRecovering(false), 500);
      });
    }
  }, [persistentStreak, isRecovering]);
  
  // Load the streak from storage periodically to keep it in sync
  useEffect(() => {
    let isMounted = true;
    
    const checkStreakStorage = async () => {
      try {
        const streakData = await getStreakDataDirectly();
        if (!isMounted) return;
        
        if (streakData && typeof streakData.streak === 'number') {
          // Only update if it's different to avoid unnecessary rerenders
          if (streakData.streak !== persistentStreak) {
            // Prioritize non-zero values from storage over zeros
            if (streakData.streak > 0 || (streakData.streak === 0 && persistentStreak === 0)) {
              console.log(`Updating persistent streak from storage: ${streakData.streak}`);
              setPersistentStreak(streakData.streak);
              streakRef.current = streakData.streak;
              lastUpdateTime.current = Date.now();
            } else if (persistentStreak > 0 && streakData.streak === 0) {
              console.log(`Ignoring streak reset from storage, keeping ${persistentStreak}`);
              
              // Write our value back to storage to correct it
              try {
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - persistentStreak + 1);
                await storeData(STORAGE_KEYS.STREAK_DATA, {
                  streak: persistentStreak,
                  lastCheckIn: Date.now(),
                  startDate: startDate.getTime()
                });
                console.log(`Corrected storage with persistent streak: ${persistentStreak}`);
              } catch (storageError) {
                console.error('Error correcting streak storage:', storageError);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking streak storage:', error);
      }
    };
    
    // Check immediately on mount
    checkStreakStorage();
    
    // Also check periodically to ensure sync
    const intervalId = setInterval(checkStreakStorage, 5000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [persistentStreak]);
  
  // State for current month view and relapse dates
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [relapseDates, setRelapseDates] = useState<Date[]>([]);
  const [streakStartDates, setStreakStartDates] = useState<Date[]>([]);
  const [streakHistory, setStreakHistory] = useState<StreakHistoryEvent[]>([]);
  
  // State for the detail modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<StreakHistoryEvent[]>([]);
  
  // Enhanced animation values for smoother transitions
  const slideAnim = useSharedValue(0);
  const opacityAnim = useSharedValue(1);
  
  // Add new animation values for day cells
  const dayPressAnim = useSharedValue(1);
  
  // Calculate streak start date based on persistent streak
  const calculateStreakStartDate = () => {
    // Use the persistentStreak to ensure consistency
    if (persistentStreak === 0) return null;
    
    // For immediate rendering, calculate based on streak
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - persistentStreak + 1);
    console.log(`Calculated start date: ${startDate.toDateString()} for streak: ${persistentStreak}`);
    
    return startDate;
  };
  
  // Get streak start date and update when streak changes
  const [streakStartDate, setStreakStartDate] = useState(calculateStreakStartDate());
  
  // Update streak start date when persistent streak changes
  useEffect(() => {
    console.log(`Persistent streak changed to ${persistentStreak} in StreakCalendar, recalculating start date`);
    
    // Force immediate recalculation of streak start date when streak changes
    const newStartDate = calculateStreakStartDate();
    
    // Always update the start date when the streak changes
    setStreakStartDate(newStartDate);
    
    // If the start date has changed significantly, refresh streak history data
    if (newStartDate && (!streakStartDate || 
        Math.abs(newStartDate.getTime() - (streakStartDate?.getTime() || 0)) > 1000 * 60 * 60)) {
      console.log('Significant start date change detected, refreshing streak history');
      setRelapseDates([]);
      setStreakStartDates([]);
      setStreakHistory([]);
    }
    
    // Force rerender of calendar cells by updating a timestamp
    setForceUpdate(Date.now());
  }, [persistentStreak]);
  
  // Add this state for forcing updates
  const [forceUpdate, setForceUpdate] = useState(Date.now());
  
  // Add a specific listener for streak data changes, with a more reasonable polling interval
  useEffect(() => {
    let isMounted = true;
    
    const checkForStreakDataChanges = async () => {
      try {
        const streakData = await getData(STORAGE_KEYS.STREAK_DATA, { 
          streak: 0, 
          lastCheckIn: 0,
          startDate: Date.now()
        });
        
        if (!isMounted) return;
        
        // Get stored date to update our display
        if (streakData && streakData.startDate && persistentStreak > 0) {
          const storedStartDate = new Date(streakData.startDate);
          
          // Get the calculated date we're currently using
          const calculatedDate = new Date();
          calculatedDate.setDate(calculatedDate.getDate() - persistentStreak + 1);
          
          // Only update if values are significantly different (more than 1 hour)
          const hoursDiff = Math.abs(storedStartDate.getTime() - calculatedDate.getTime()) / (1000 * 60 * 60);
          if (hoursDiff > 1) {
            console.log(`Using stored start date: ${storedStartDate.toDateString()} instead of calculated: ${calculatedDate.toDateString()}`);
            // This will trigger a reload of the streak history in the next useEffect
            setRelapseDates([]);
            setStreakStartDates([]);
            setStreakHistory([]);
          }
        }
        
        // If streak in storage doesn't match current streak, refresh the calendar
        if (streakData.streak !== persistentStreak) {
          console.log(`Detected streak change in storage: ${streakData.streak} vs UI: ${persistentStreak}`);
          // Force reload of streak history will happen in the next useEffect
          setRelapseDates([]);
          setStreakStartDates([]);
          setStreakHistory([]);
        }
      } catch (error) {
        console.error('Error checking for streak data changes:', error);
      }
    };
    
    // Check after a short delay to allow initial render to complete
    const initialCheckTimeout = setTimeout(checkForStreakDataChanges, 1000);
    
    // Then set a longer interval for ongoing checks (every 10 seconds instead of 2)
    const intervalId = setInterval(checkForStreakDataChanges, 10000);
    
    return () => {
      isMounted = false;
      clearTimeout(initialCheckTimeout);
      clearInterval(intervalId);
    };
  }, [persistentStreak]); // Add persistent streak as dependency to update when streak changes
  
  // Add a helper function to generate truly unique IDs
  const generateUniqueId = (prefix: string) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    const uniqueStr = Math.random().toString(36).substring(2, 10);
    return `${prefix}-${timestamp}-${random}-${uniqueStr}`;
  };
  
  // Add a state for tracking whether streak data has loaded
  const [isInitialized, setIsInitialized] = useState(false);

  // Define loadStreakHistory as a variable-scoped function so it can be called from multiple places
  const loadStreakHistory = async () => {
    try {
      // Get streak data which contains the start date of current streak
      const streakData = await getData(STORAGE_KEYS.STREAK_DATA, { 
        streak: 0, 
        lastCheckIn: 0,
        startDate: Date.now()
      });
      
      // Check if there's journal entries that might have relapse records
      const journalEntries = await getData(STORAGE_KEYS.JOURNAL_ENTRIES, []);
      
      const detectedRelapses: Date[] = [];
      const detectedStarts: Date[] = [];
      const historyEvents: StreakHistoryEvent[] = [];
      
      // Add the current streak start if streak > 0
      if (persistentStreak > 0 && streakData.startDate) {
        const startDate = new Date(streakData.startDate);
        detectedStarts.push(startDate);
        
        // Add to history events with unique ID
        historyEvents.push({
          type: 'start',
          date: startDate,
          notes: 'Current streak started',
          id: generateUniqueId('history-start-current')
        });
        
        // The day before streak start might be a relapse day
        const relapseDayBefore = new Date(startDate);
        relapseDayBefore.setDate(relapseDayBefore.getDate() - 1);
        detectedRelapses.push(relapseDayBefore);
        
        // Add to history events with unique ID
        historyEvents.push({
          type: 'relapse',
          date: relapseDayBefore,
          streakDays: 0, // We don't know the previous streak length
          notes: 'Relapse before current streak',
          id: generateUniqueId('history-relapse-before-current')
        });
      }
      
      // Scan journal entries for mentions of relapses and fresh starts
      if (journalEntries && journalEntries.length) {
        // Sort entries by date to ensure chronological processing
        const sortedEntries = [...journalEntries].sort((a: any, b: any) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        sortedEntries.forEach((entry: any) => {
          if (entry.content && entry.timestamp) {
            const entryDate = new Date(entry.timestamp);
            const lowerContent = entry.content.toLowerCase();
            
            // Check for relapse mentions
            const hasRelapseKeywords = lowerContent.includes('relapse') || 
                lowerContent.includes('failed') ||
                lowerContent.includes('reset') ||
                lowerContent.includes('broke streak') ||
                lowerContent.includes('gave in');
            
            if (hasRelapseKeywords) {
              // Only add if this date isn't already recorded as a relapse
              if (!detectedRelapses.some(d => isSameDay(d.getTime(), entryDate.getTime()))) {
                detectedRelapses.push(new Date(entryDate));
                
                // Add to history with context from journal and guaranteed unique ID
                historyEvents.push({
                  type: 'relapse',
                  date: new Date(entryDate),
                  notes: entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : ''),
                  id: generateUniqueId(`journal-relapse-${entry.timestamp}`)
                });
              }
            }
            
            // Check for fresh start mentions
            const hasFreshStartKeywords = lowerContent.includes('fresh start') || 
                lowerContent.includes('new beginning') ||
                lowerContent.includes('starting again') ||
                lowerContent.includes('day 1') ||
                lowerContent.includes('restart') ||
                lowerContent.includes('starting over');
            
            if (hasFreshStartKeywords) {
              // Only add if this date isn't already recorded as a start
              if (!detectedStarts.some(d => isSameDay(d.getTime(), entryDate.getTime()))) {
                detectedStarts.push(new Date(entryDate));
                
                // Add to history with context from journal and guaranteed unique ID
                historyEvents.push({
                  type: 'start',
                  date: new Date(entryDate),
                  notes: entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : ''),
                  id: generateUniqueId(`journal-start-${entry.timestamp}`)
                });
              }
            }
          }
        });
      }
      
      // Removed synthetic data generation for demonstration purposes
      // This was interfering with actual user streak data
      // Only use real relapse data from journal entries and user actions
      
      // Remove synthetic relapse data for current month
      // This was causing the current day to show as red even when user hasn't relapsed
      
      // Sort history events by date
      historyEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
      
      // Deduplicate history events - keep only one event of each type per day
      const uniqueEvents: StreakHistoryEvent[] = [];
      const processed = new Set<string>();
      
      historyEvents.forEach(event => {
        // Create a date-based key for deduplication using just the date part
        const dateStr = event.date.toDateString();
        const dayKey = `${dateStr}-${event.type}`;
        
        // Only add the event if we haven't seen this date-type combination yet
        if (!processed.has(dayKey)) {
          uniqueEvents.push(event);
          processed.add(dayKey);
        }
      });
      
      console.log('Loaded relapse dates:', detectedRelapses.map(d => d.toDateString()).join(', '));
      
      setRelapseDates(detectedRelapses);
      setStreakStartDates(detectedStarts);
      setStreakHistory(uniqueEvents); // Use deduplicated list
      return true;
    } catch (error) {
      console.error('Error loading streak history:', error);
      setRelapseDates([]);
      setStreakStartDates([]);
      setStreakHistory([]);
      return false;
    }
  };

  // Use an effect to ensure that all streak-related data is loaded on component mount
  useEffect(() => {
    const initializeCalendarData = async () => {
      try {
        console.log('Initializing calendar data...');
        // Get streak data from storage
        const streakData = await getStreakDataDirectly();
        
        // Get relapse history from storage
        const relapseHistory = await getData<Date[]>(`${STORAGE_KEYS.RELAPSE_HISTORY}`, []);
        setRelapseDates(relapseHistory);
        
        // Load streak history events
        await loadStreakHistory();
        
        // Check for any recent intentional relapse
        const intentionalRelapse = await getData<IntentionalRelapseData | null>(STORAGE_KEYS.INTENTIONAL_RELAPSE, null);
        if (intentionalRelapse) {
          const isRecent = Date.now() - intentionalRelapse.timestamp < 86400000; // 24 hours in ms
          if (isRecent) {
            setTodayIsRelapse(true);
          }
        }
        
        // Mark initialization as complete
        setIsInitialized(true);
        console.log('Calendar data initialization complete');
      } catch (error) {
        console.error('Error initializing calendar data:', error);
        // Still mark as initialized to prevent infinite loops
        setIsInitialized(true);
      }
    };
    
    if (!isInitialized) {
      initializeCalendarData();
    }
  }, [isInitialized]);
  
  // Month name display
  const getMonthName = (month: number) => {
    return new Date(currentYear, month).toLocaleString('default', { month: 'long' });
  };
  
  // Add this function to directly get streak data from storage
  const getStreakDataDirectly = async () => {
    try {
      const data = await getData(STORAGE_KEYS.STREAK_DATA, {
        streak: 0,
        lastCheckIn: 0,
        startDate: Date.now()
      });
      return data;
    } catch (error) {
      console.error('Error getting streak data directly:', error);
      return null;
    }
  };
  
  // Update month navigation functions with enhanced animations
  const goToPreviousMonth = () => {
    // Save current streak before animation
    const currentPersistentStreak = persistentStreak;
    
    // Start a fade out animation
    opacityAnim.value = withTiming(0.6, { duration: 150, easing: Easing.out(Easing.quad) });
    
    // Start the slide animation
    slideAnim.value = -1;
    slideAnim.value = withTiming(0, { 
      duration: 300, 
      easing: Easing.out(Easing.cubic) 
    }, () => {
      // Fade back in when animation completes
      opacityAnim.value = withTiming(1, { duration: 200 });
    });
    
    // Pre-calculate the days for the previous month to avoid flickering
    let prevMonth = currentMonth;
    let prevYear = currentYear;
    
    if (prevMonth === 0) {
      prevMonth = 11;
      prevYear = prevYear - 1;
    } else {
      prevMonth = prevMonth - 1;
    }
    
    // Update the state after the animation has started
    setCurrentMonth(prevMonth);
    setCurrentYear(prevYear);
    
    // Force calendar to update with same streak value
    setTimeout(() => {
      // Ensure streak value remains the same
      if (persistentStreak !== currentPersistentStreak) {
        setPersistentStreak(currentPersistentStreak);
      }
      
      // Update force value to trigger render
      setForceUpdate(Date.now());
    }, 10);
  };
  
  const goToNextMonth = () => {
    // Save current streak before animation
    const currentPersistentStreak = persistentStreak;
    
    // Start a fade out animation
    opacityAnim.value = withTiming(0.6, { duration: 150, easing: Easing.out(Easing.quad) });
    
    // Start the slide animation
    slideAnim.value = 1;
    slideAnim.value = withTiming(0, { 
      duration: 300, 
      easing: Easing.out(Easing.cubic) 
    }, () => {
      // Fade back in when animation completes
      opacityAnim.value = withTiming(1, { duration: 200 });
    });
    
    // Pre-calculate the days for the next month to avoid flickering
    let nextMonth = currentMonth;
    let nextYear = currentYear;
    
    if (nextMonth === 11) {
      nextMonth = 0;
      nextYear = nextYear + 1;
    } else {
      nextMonth = nextMonth + 1;
    }
    
    // Update the state after the animation has started
    setCurrentMonth(nextMonth);
    setCurrentYear(nextYear);
    
    // Force calendar to update with same streak value
    setTimeout(() => {
      // Ensure streak value remains the same
      if (persistentStreak !== currentPersistentStreak) {
        setPersistentStreak(currentPersistentStreak);
      }
      
      // Update force value to trigger render
      setForceUpdate(Date.now());
    }, 10);
  };
  
  // Animation style for month transition
  const slideStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: slideAnim.value * 20 },
        { scale: 1 - Math.abs(slideAnim.value) * 0.05 }
      ],
      opacity: opacityAnim.value
    };
  });
  
  // Create a press animation style for day cells
  const pressDayStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dayPressAnim.value }]
    };
  });
  
  // Add a press animation handler
  const onDayPressIn = () => {
    dayPressAnim.value = withTiming(0.95, { duration: 100 });
  };
  
  const onDayPressOut = () => {
    dayPressAnim.value = withTiming(1, { duration: 150 });
  };
  
  // Generate days for current month
  const calendarDays = generateCalendarDays(currentYear, currentMonth);
  
  // Check if a date is within the current streak
  const isStreakDay = (date: Date | null) => {
    // Use the persistent streak to ensure consistency
    if (!date) return false;
    
    // Reset hours/minutes/seconds for proper date comparison
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const normalizedToday = new Date();
    normalizedToday.setHours(0, 0, 0, 0);
    
    // First check if this is a relapse day - if so, it can't be a streak day
    if (isRelapseDay(date)) {
      return false;
    }
    
    // If it's today and we haven't relapsed and we have an active streak, it's a streak day
    if (isSameDay(date.getTime(), normalizedToday.getTime()) && !todayIsRelapse && persistentStreak > 0) {
      return true;
    }
    
    // Case 1: Part of the current active streak
    if (persistentStreak > 0 && streakStartDate) {
      const normalizedStartDate = new Date(streakStartDate);
      normalizedStartDate.setHours(0, 0, 0, 0);
      
      if (normalizedDate >= normalizedStartDate && normalizedDate <= normalizedToday) {
        return true;
      }
    }
    
    // Case 2: Part of any historical streak between a fresh start and relapse
    // Find the most recent fresh start date that's before or equal to this date
    const relevantStartDate = streakStartDates.find(startDate => {
      const normalizedStartDate = new Date(startDate);
      normalizedStartDate.setHours(0, 0, 0, 0);
      return normalizedStartDate <= normalizedDate;
    });
    
    // If there's a relevant start date, check if there's a relapse after this date
    if (relevantStartDate) {
      // Find the earliest relapse date after this date
      const relevantRelapse = relapseDates.find(relapseDate => {
        const normalizedRelapseDate = new Date(relapseDate);
        normalizedRelapseDate.setHours(0, 0, 0, 0);
        
        return normalizedRelapseDate > normalizedDate;
      });
      
      // If no relapse after this date, and this date is after a fresh start, it's a streak day
      const normalizedRelevantStart = new Date(relevantStartDate);
      normalizedRelevantStart.setHours(0, 0, 0, 0);
      
      if (!relevantRelapse) {
        // No relapse after this date, so it's part of an ongoing streak
        // But only if it's not after today
        return normalizedDate <= normalizedToday;
      } else {
        // There's a relapse after this date
        const normalizedRelevantRelapse = new Date(relevantRelapse);
        normalizedRelevantRelapse.setHours(0, 0, 0, 0);
        
        // It's a streak day if it's after a start but before a relapse
        return normalizedDate > normalizedRelevantStart && normalizedDate < normalizedRelevantRelapse;
      }
    }
    
    return false;
  };
  
  // Update the isRelapseDay function to include today when marked as relapse
  const isRelapseDay = (date: Date | null) => {
    if (!date) return false;
    
    // If this is today's date and todayIsRelapse is true, return true immediately
    const isToday = isSameDay(date.getTime(), new Date().getTime());
    if (isToday && todayIsRelapse) {
      return true;
    }
    
    // Otherwise check against stored relapse dates
    // Reset hours/minutes/seconds for proper date comparison
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    // Check if this date exists in our relapse dates array
    return relapseDates.some(relapseDate => {
      const normalizedRelapseDate = new Date(relapseDate);
      normalizedRelapseDate.setHours(0, 0, 0, 0);
      
      return isSameDay(normalizedRelapseDate.getTime(), normalizedDate.getTime());
    });
  };
  
  // Handle day cell press
  const handleDayPress = (date: Date | null) => {
    if (!date) return;
    
    // Find events for this date
    const eventsOnDate = streakHistory.filter(event => 
      isSameDay(event.date.getTime(), date.getTime())
    );
    
    if (eventsOnDate.length > 0) {
      setSelectedDate(date);
      setSelectedEvents(eventsOnDate);
      setDetailModalVisible(true);
    }
  };
  
  // Format date for detail view
  const formatDetailDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  // Define a unique key for the current month/year view that includes the persistent streak
  const calendarGridKey = `grid-${currentMonth}-${currentYear}-${forceUpdate}-${persistentStreak}-${forceRefresh}`;
  
  // Create a separate function for checking intentional relapse
  const checkIntentionalRelapse = async () => {
    try {
      // Check if there's a recent intentional relapse flag
      const intentionalRelapse = await getData<IntentionalRelapseData | null>(STORAGE_KEYS.INTENTIONAL_RELAPSE, null);
      
      if (intentionalRelapse) {
        console.log('Found intentional relapse flag:', intentionalRelapse);
        
        // Check if it's recent (within the last day)
        const isRecent = Date.now() - intentionalRelapse.timestamp < 86400000; // 24 hours in ms
        
        if (isRecent) {
          console.log('Recent intentional relapse detected, updating calendar');
          
          // Mark today as relapse day
          setTodayIsRelapse(true);
          
          // Make sure today is in the relapse dates
          const today = new Date();
          setRelapseDates(prev => {
            if (prev.some(date => isSameDay(date.getTime(), today.getTime()))) {
              return prev;
            }
            return [...prev, today];
          });
          
          // Add today to streak history if not already there
          const relapseEvent: StreakHistoryEvent = {
            type: 'relapse',
            date: today,
            streakDays: persistentStreak > 0 ? persistentStreak : undefined,
            notes: 'Relapse recorded',
            id: generateUniqueId('intentional-relapse')
          };
          
          setStreakHistory(prev => {
            if (prev.some(event => 
              event.type === 'relapse' && isSameDay(event.date.getTime(), today.getTime())
            )) {
              return prev;
            }
            return [relapseEvent, ...prev];
          });

          // Reset streak values
          setPersistentStreak(0);
          streakRef.current = 0;
          
          // Force redraw of calendar
          setForceUpdate(Date.now());
        }
      }
    } catch (error) {
      console.error('Error checking for intentional relapse:', error);
    }
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: COLORS.cardBackground,
      borderColor: COLORS.cardBorder,
    }]}>
      {/* Premium header with calendar icon */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: COLORS.titleText }]}>
          Streak Calendar
        </Text>
        <CalendarIcon size={24} color="#6366f1" style={{ opacity: 0.9 }} />
      </View>
      
      <Animated.View style={[styles.calendarContainer, slideStyle]}>
        {/* Premium month navigation */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={goToPreviousMonth}
            style={styles.navigationButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.8)', 'rgba(99, 102, 241, 0.5)']}
              style={styles.navGradient}
            >
              <ChevronLeft size={22} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.monthYearText}>
            {getMonthName(currentMonth)} {currentYear}
          </Text>
          
          <TouchableOpacity
            onPress={goToNextMonth}
            style={styles.navigationButton}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['rgba(99, 102, 241, 0.8)', 'rgba(99, 102, 241, 0.5)']}
              style={styles.navGradient}
            >
              <ChevronRight size={22} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Weekday headers with premium styling */}
        <View style={styles.weekdayHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <Text key={index} style={styles.weekdayText}>
              {day}
            </Text>
          ))}
        </View>
        
        {/* Calendar grid with premium background */}
        <LinearGradient
          colors={['rgba(30, 30, 35, 0.8)', 'rgba(25, 25, 30, 0.6)']}
          style={styles.calendarGridContainer}
        >
        <View style={styles.calendarGrid} key={calendarGridKey}>
          {calendarDays.map((day, index) => {
            // Calculate cell properties outside JSX for better performance
            const isEmptyCell = day.day === 0;
            const isTodayCell = day.date && isSameDay(day.date.getTime(), new Date().getTime());
            const isStreak = day.date && isStreakDay(day.date);
            const isRelapse = day.date && isRelapseDay(day.date);
            
            // Define the cell key that includes all relevant data
            const cellKey = `${index}-${currentMonth}-${currentYear}-${isStreak ? 'streak' : ''}-${isRelapse ? 'relapse' : ''}-${forceUpdate}-${forceRefresh}`;
            
            // Choose appropriate gradient colors based on day type
            let gradientColors: [string, string] = ['transparent', 'transparent']; // Default is transparent
            
            // Priority of colors: Relapse > Streak Day > Today (if not relapse)
            if (isRelapse) {
                gradientColors = ['rgba(248, 113, 113, 0.95)', 'rgba(248, 113, 113, 0.75)']; // Red for relapse
            } else if (isStreak) {
                gradientColors = ['rgba(74, 222, 128, 0.95)', 'rgba(74, 222, 128, 0.75)']; // Green for streak days
            } else if (isTodayCell && !isRelapseDay(day.date)) {
                // If it's today and not a relapse day, make it green (covers new users or users without an active streak)
                gradientColors = ['rgba(74, 222, 128, 0.95)', 'rgba(74, 222, 128, 0.75)']; 
            }
            
            return (
              <TouchableOpacity
                key={cellKey}
                style={[
                  styles.dayCell,
                  isEmptyCell && styles.emptyCell,
                ]}
                onPress={() => day.date && handleDayPress(day.date)}
                onPressIn={onDayPressIn}
                onPressOut={onDayPressOut}
                activeOpacity={0.75}
                disabled={isEmptyCell}
              >
                {!isEmptyCell && (
                  <Animated.View 
                    style={[
                      styles.dayCellInner,
                      isTodayCell && styles.todayCell,
                      pressDayStyle
                    ]}
                  >
                      {(isStreak || isRelapse) && (
                      <LinearGradient
                        colors={gradientColors}
                        style={styles.dayBackground}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                    )}
                    
                    <Text 
                      style={[
                        styles.dayText, 
                          { color: isStreak || isRelapse ? '#FFFFFF' : '#E2E2E5' }
                      ]}
                    >
                      {day.day}
                    </Text>
                    
                      {isRelapse && (
                      <View style={styles.eventIndicator}>
                        <Info size={10} color="#FFFFFF" />
                      </View>
                    )}
                  </Animated.View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        </LinearGradient>
      </Animated.View>
      
      {/* Enhanced Legend with premium styling, remove the Fresh Start element */}
          <LinearGradient
        colors={['rgba(30, 30, 35, 0.85)', 'rgba(25, 25, 30, 0.8)']}
        style={styles.legendContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.legend}>
        <View style={styles.legendItem}>
          <LinearGradient
              colors={['rgba(74, 222, 128, 0.95)', 'rgba(74, 222, 128, 0.75)']}
            style={styles.legendColor}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
          />
            <Text style={styles.legendText}>Streak Days</Text>
        </View>
        
        <View style={styles.legendItem}>
          <LinearGradient
              colors={['rgba(248, 113, 113, 0.95)', 'rgba(248, 113, 113, 0.75)']}
            style={styles.legendColor}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
          />
            <Text style={styles.legendText}>Relapse</Text>
        </View>
      </View>
      </LinearGradient>
      
      {/* Day detail modal with enhanced styling */}
      <Modal
        transparent
        visible={isDetailModalVisible}
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <BlurView intensity={60} style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { backgroundColor: COLORS.cardBackground }]}>
            <LinearGradient
              colors={['rgba(80, 70, 230, 0.3)', 'rgba(80, 70, 230, 0.1)']}
              style={styles.detailModalHeaderGradient}
            >
              <View style={styles.detailModalHeader}>
                <CalendarIconFull size={20} color="#ffffff" />
                <Text style={[styles.detailModalTitle, { color: colors.text }]}>
                  {selectedDate && formatDetailDate(selectedDate)}
                </Text>
                <TouchableOpacity
                  onPress={() => setDetailModalVisible(false)}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                  style={styles.closeButton}
                >
                  <X size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
            
            <ScrollView 
              style={styles.detailModalContent}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedEvents.map((event) => (
                <Animated.View 
                  key={event.id} 
                  style={styles.eventCard}
                  entering={FadeInDown.duration(400).delay(100)}
                >
                  <LinearGradient
                    colors={
                      event.type === 'relapse' 
                        ? ['rgba(231, 76, 60, 0.3)', 'rgba(231, 76, 60, 0.1)']
                        : ['rgba(46, 204, 113, 0.3)', 'rgba(46, 204, 113, 0.1)']
                    }
                    style={styles.eventCardGradient}
                  >
                    <View style={styles.eventCardHeader}>
                      {event.type === 'relapse' ? (
                        <AlertTriangle size={18} color="#e74c3c" />
                      ) : (
                        <RefreshCw size={18} color="#2ecc71" />
                      )}
                      <Text style={[styles.eventCardTitle, { 
                        color: event.type === 'relapse' ? '#e74c3c' : '#2ecc71' 
                      }]}>
                        {event.type === 'relapse' ? 'Relapse' : 'Fresh Start'}
                      </Text>
                      <Text style={[styles.eventCardTime, { color: colors.secondaryText }]}>
                        {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    
                    {event.streakDays !== undefined && (
                      <Text style={[styles.eventCardDetail, { color: colors.text }]}>
                        {event.type === 'relapse' 
                          ? `Lost a streak of ${event.streakDays} days` 
                          : `Beginning of ${event.streakDays} day streak`}
                      </Text>
                    )}
                    
                    {event.notes && (
                      <Text style={[styles.eventCardNotes, { color: colors.secondaryText }]}>
                        {event.notes}
                      </Text>
                    )}
                  </LinearGradient>
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 24,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calendarContainer: {
    padding: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthYearText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  navigationButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    overflow: 'hidden',
  },
  navGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  calendarGridContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    padding: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 7 days per week
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  dayCellInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 25,
  },
  dayBackground: {
    position: 'absolute',
    width: '90%',
    height: '90%',
    borderRadius: 25,
    zIndex: -1,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '700',
    zIndex: 1,
  },
  emptyCell: {
    opacity: 0,
  },
  todayCell: {
    borderWidth: 2.5,
    borderColor: COLORS.today,
    borderRadius: 25,
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    zIndex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 10,
    padding: 2,
  },
  legendContainer: {
    borderRadius: 20,
    marginHorizontal: 24,
    marginTop: 20,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  legendColor: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.5,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  detailModalContainer: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  detailModalHeaderGradient: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
    letterSpacing: 0.5,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailModalContent: {
    padding: 20,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  eventCardGradient: {
    padding: 20,
    borderRadius: 20,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
    letterSpacing: 0.5,
  },
  eventCardTime: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventCardDetail: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 30,
    letterSpacing: 0.3,
  },
  eventCardNotes: {
    fontSize: 15,
    lineHeight: 22,
    marginLeft: 30,
    opacity: 0.9,
    letterSpacing: 0.3,
  },
});

export default StreakCalendar;