import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  getData,
  storeData,
  STORAGE_KEYS,
  removeData,
} from '../utils/storage';
import {
  format,
  eachDayOfInterval,
  isBefore,
  startOfToday,
  addDays,
  isAfter,
  isSameDay,
  parseISO,
  differenceInDays,
  isValid,
  subDays,
  startOfDay,
} from 'date-fns';
import { setStreak as setStreakService, checkAndAdjustStreak } from '../utils/streakService';
import { AppState, AppStateStatus } from 'react-native';

// Define types
type DayStatus = 'clean' | 'relapse';
type CalendarHistory = Record<string, DayStatus>;

interface StreakContextType {
  calendarHistory: CalendarHistory;
  setStreakStartDate: (date: Date) => Promise<void>;
  recordRelapse: (date: Date) => Promise<void>;
  streak: number;
  streakStartDate: Date | null;
  debugCalendarHistory: () => void;
  forceRefresh: () => Promise<boolean>;
  setStreak: (days: number, startDateTimestamp?: number) => Promise<void>;
  resetCalendar: () => Promise<void>;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

const DATE_FORMAT = 'yyyy-MM-dd';

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [calendarHistory, setCalendarHistory] = useState<CalendarHistory>({});
  const [streak, setStreakState] = useState(0);
  const [streakStartDate, setStreakStartDateState] = useState<Date | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // Debug function to log calendar history
  const debugCalendarHistory = () => {
    console.log('===== CALENDAR HISTORY DEBUG =====');
    console.log(`Current streak: ${streak} days`);
    console.log(`Streak start date: ${streakStartDate ? format(streakStartDate, DATE_FORMAT) : 'Not set'}`);
    console.log(`Calendar history entries: ${Object.keys(calendarHistory).length}`);
    
    if (Object.keys(calendarHistory).length > 0) {
      console.log('Calendar history entries:');
      Object.entries(calendarHistory).forEach(([date, status]) => {
        console.log(`${date}: ${status}`);
      });
    } else {
      console.log('Calendar history is empty!');
    }
    console.log('=================================');
  };

  // Reset calendar function
  const resetCalendar = async () => {
    console.log('Resetting calendar data...');
    try {
      // Clear all calendar data from storage
      await removeData(STORAGE_KEYS.CALENDAR_HISTORY);
      await removeData(STORAGE_KEYS.STREAK_START_DATE);
      await removeData(STORAGE_KEYS.STREAK_DATA);

      // Reset state
      setCalendarHistory({});
      setStreakState(0);
      setStreakStartDateState(null);
      
      console.log('Calendar data reset successfully');
      
      // Increment refresh counter to trigger UI update
      setRefreshCounter(prev => prev + 1);
    } catch (error) {
      console.error('Error resetting calendar data:', error);
    }
  };

  // Force refresh function
  const forceRefresh = async () => {
    console.log('Forcing refresh of streak data...');
    try {
      // Update last refresh time
      const now = Date.now();
      setLastRefreshTime(now);

      // Load calendar history
      const history = await getData<CalendarHistory>(STORAGE_KEYS.CALENDAR_HISTORY, {});
      
      // Load streak start date
      const startDateStr = await getData<string | null>(STORAGE_KEYS.STREAK_START_DATE, null);
      
      // Load streak data and check for any needed adjustments
      const streakData = await checkAndAdjustStreak();
      
      // Parse start date if available
      let startDate: Date | null = null;
      if (startDateStr) {
        const parsed = parseISO(startDateStr);
        if (isValid(parsed)) {
          startDate = parsed;
        }
      }
      
      // If no valid start date from storage, try to use streak data
      if (!startDate && streakData && streakData.startDate) {
        const parsed = new Date(streakData.startDate);
        if (isValid(parsed)) {
          startDate = parsed;
          // Save this to streak start date storage for consistency
          await storeData(STORAGE_KEYS.STREAK_START_DATE, startDate.toISOString());
        }
      }
      
      // Update state with fresh data
      setCalendarHistory(history);
      
      // Check if the start date is in the future
      const today = startOfToday();
      if (startDate && isAfter(startDate, today)) {
        console.log('Streak start date is in the future, setting streak to 0');
        startDate = null;
        await removeData(STORAGE_KEYS.STREAK_START_DATE);
      }
      
      // Update streak start date state if different
      if (startDate !== streakStartDate) {
        setStreakStartDateState(startDate);
      }
      
      // Use streak from streak service
      const currentStreak = streakData.streak;
      
      // Update streak state if different
      if (currentStreak !== streak) {
        setStreakState(currentStreak);
      }
      
      // Increment refresh counter to trigger UI update
      setRefreshCounter(prev => (prev < 100 ? prev + 1 : 0));
      
      console.log('Streak data refreshed successfully');
      console.log(`Current streak: ${currentStreak} days`);
      console.log(`Start date: ${startDate ? format(startDate, DATE_FORMAT) : 'Not set'}`);
      console.log(`Calendar history entries: ${Object.keys(history).length}`);

      return true;
    } catch (error) {
      console.error('Error refreshing streak data:', error);
      return false;
    }
  };

  // Monitor app state to check streak when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Check how long the app has been in background
        const timeSinceLastRefresh = Date.now() - lastRefreshTime;
        const minutesSinceLastRefresh = Math.floor(timeSinceLastRefresh / (1000 * 60));
        
        // If app was in background for more than 15 minutes, refresh streak
        if (minutesSinceLastRefresh > 15) {
          console.log(`App became active after ${minutesSinceLastRefresh} minutes, refreshing streak`);
          forceRefresh();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [lastRefreshTime]);

  // Load history data
  const loadHistory = useCallback(async () => {
    try {
      console.log('Loading streak history...');
      await forceRefresh();
    } catch (error) {
      console.error('Failed to load streak history:', error);
    }
  }, []);

  // Load history on mount and when refresh counter changes
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Set streak function - sets streak to a specific number of days
  const setStreak = async (days: number, startDateTimestamp?: number) => {
    console.log(`Setting streak to ${days} days${startDateTimestamp ? ' with specific start date' : ''}`);
    
    try {
      const today = startOfToday();
      let startDate: Date;
      
      // Calculate start date based on days or use provided timestamp
      if (startDateTimestamp) {
        startDate = new Date(startDateTimestamp);
      } else {
        startDate = subDays(today, days - 1);
      }
      
      // Ensure start date is valid
      if (!isValid(startDate)) {
        console.error('Invalid start date');
        return;
      }
      
      // Ensure start date is not in the future
      if (isAfter(startDate, today)) {
        console.error('Cannot set streak start date in the future');
        return;
      }
      
      console.log(`Using start date: ${format(startDate, DATE_FORMAT)}`);
      
      // Create new calendar history with clean days for the entire streak period
      const newHistory: CalendarHistory = {};
      
      // Get all days from start date to today
      const interval = eachDayOfInterval({ start: startDate, end: today });
      
      console.log(`Marking ${interval.length} days as clean (from ${format(startDate, DATE_FORMAT)} to ${format(today, DATE_FORMAT)})`);
      
      // Mark all days in the interval as clean
      for (const day of interval) {
        const dayStr = format(day, DATE_FORMAT);
        newHistory[dayStr] = 'clean';
      }
      
      // Save data
      await storeData(STORAGE_KEYS.CALENDAR_HISTORY, newHistory);
      await storeData(STORAGE_KEYS.STREAK_START_DATE, startDate.toISOString());
      
      // Update streak service data
      await storeData('clearmind:streak_data', {
        streak: days,
        lastCheckIn: Date.now(),
        startDate: startDate.getTime(),
        hourCount: 0
      });
      
      // Update streak service
      await setStreakService(days, startDate.getTime());
      
      // Update state
      setCalendarHistory(newHistory);
      setStreakStartDateState(startDate);
      setStreakState(days);
      
      console.log(`Streak set to ${days} days with start date ${format(startDate, DATE_FORMAT)}`);
      console.log(`Calendar history updated with ${Object.keys(newHistory).length} clean days`);
      
      // Debug the final state
      setTimeout(() => {
        debugCalendarHistory();
      }, 500);
    } catch (error) {
      console.error('Failed to set streak:', error);
    }
  };

  // Set streak start date function
  const setStreakStartDate = async (date: Date) => {
    console.log(`Setting streak start date to: ${format(date, DATE_FORMAT)}`);
    
    try {
    const today = startOfToday();
      
      // Validate date
      if (!isValid(date)) {
        console.error('Invalid date');
      return;
    }

      // Ensure date is not in the future
      if (isAfter(date, today)) {
        console.error('Cannot set streak start date in the future');
        return;
    }

      // Get all days from start date to today
    const interval = eachDayOfInterval({ start: date, end: today });
      const days = interval.length;

    console.log(`Marking ${interval.length} days as clean (from ${format(date, DATE_FORMAT)} to ${format(today, DATE_FORMAT)})`);

      // Create new calendar history, preserving existing relapses
      const currentHistory = await getData<CalendarHistory>(STORAGE_KEYS.CALENDAR_HISTORY, {});
      const newHistory: CalendarHistory = { ...currentHistory };
      
      // Mark all days in the interval as clean, unless already marked as relapse
    for (const day of interval) {
      const dayStr = format(day, DATE_FORMAT);
      if (newHistory[dayStr] !== 'relapse') {
        newHistory[dayStr] = 'clean';
      }
    }

      // Save data
      await storeData(STORAGE_KEYS.CALENDAR_HISTORY, newHistory);
      await storeData(STORAGE_KEYS.STREAK_START_DATE, date.toISOString());
      
      // Update streak service data
      await storeData('clearmind:streak_data', {
        streak: days,
        lastCheckIn: Date.now(),
        startDate: date.getTime(),
        hourCount: 0
      });
      
      // Calculate streak accounting for any relapses
      let currentStreak = days;
      let latestRelapse: Date | null = null;
      
      // Find the most recent relapse
      for (const day of interval) {
        const dayStr = format(day, DATE_FORMAT);
        if (newHistory[dayStr] === 'relapse') {
          latestRelapse = day;
        }
      }
      
      // If there was a relapse, recalculate streak from the day after
      if (latestRelapse) {
        const dayAfterRelapse = addDays(latestRelapse, 1);
        if (!isAfter(dayAfterRelapse, today)) {
          currentStreak = differenceInDays(addDays(today, 1), dayAfterRelapse);
        } else {
          currentStreak = 0;
        }
    }

    // Update state
    setCalendarHistory(newHistory);
    setStreakStartDateState(date);
      setStreakState(currentStreak);
      
      console.log(`Streak start date set to ${format(date, DATE_FORMAT)}`);
      console.log(`Streak calculated as ${currentStreak} days`);
      console.log(`Calendar history updated with ${Object.keys(newHistory).length} entries`);
    
    // Debug the final state
    setTimeout(() => {
      debugCalendarHistory();
    }, 500);
    } catch (error) {
      console.error('Failed to set streak start date:', error);
    }
  };

  // Record relapse function
  const recordRelapse = async (date: Date) => {
    const relapseDateAtStartOfDay = startOfDay(date);
    console.log(`Recording relapse on: ${format(relapseDateAtStartOfDay, DATE_FORMAT)}`);
    
    try {
      const today = startOfToday();
    
      // Validate date
      if (!isValid(relapseDateAtStartOfDay)) {
        console.error('Invalid date');
        return;
      }
      
      // Ensure date is not in the future
      if (isAfter(relapseDateAtStartOfDay, today)) {
        console.error('Cannot record relapse in the future');
        return;
      }
    
      // Get current calendar history
      const currentHistory = await getData<CalendarHistory>(STORAGE_KEYS.CALENDAR_HISTORY, {});
      const newHistory: CalendarHistory = { ...currentHistory };
      
      // Mark the day as a relapse
      const dayStr = format(relapseDateAtStartOfDay, DATE_FORMAT);
      newHistory[dayStr] = 'relapse';
    
      // Save updated history
      await storeData(STORAGE_KEYS.CALENDAR_HISTORY, newHistory);
      
      // Reset the streak to 0
      const newStreak = 0;
      const newStartDate = null;
      
      // Clear streak start date from storage
      await removeData(STORAGE_KEYS.STREAK_START_DATE);
      
      // Update streak service data
      await storeData('clearmind:streak_data', {
        streak: newStreak,
        lastCheckIn: Date.now(),
        startDate: null,
        hourCount: 0
      });
    
      // Update state
      setCalendarHistory(newHistory);
      setStreakStartDateState(newStartDate);
      setStreakState(newStreak);
    
      console.log(`Relapse recorded for ${dayStr}`);
      console.log(`New streak: ${newStreak} days`);
      console.log(`New streak start date: Not set`);
    
      // Debug the final state
      setTimeout(() => {
        debugCalendarHistory();
      }, 500);
    } catch (error) {
      console.error('Failed to record relapse:', error);
    }
  };

  // Create context value
  const contextValue: StreakContextType = {
    calendarHistory,
    setStreakStartDate,
    recordRelapse,
    streak,
    streakStartDate,
    debugCalendarHistory,
    forceRefresh,
    setStreak,
    resetCalendar
  };

  return (
    <StreakContext.Provider value={contextValue}>
      {children}
    </StreakContext.Provider>
  );
};

export const useStreak = (): StreakContextType => {
  const context = useContext(StreakContext);
  if (context === undefined) {
    throw new Error('useStreak must be used within a StreakProvider');
  }
  return context;
}; 