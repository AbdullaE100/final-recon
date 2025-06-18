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
} from '../utils/storage';
import {
  format,
  eachDayOfInterval,
  isBefore,
  startOfToday,
  addDays,
  isAfter,
  isSameDay,
} from 'date-fns';

// Manually define STORAGE_KEYS as it's not available in the current context
export const STORAGE_KEYS = {
  CALENDAR_HISTORY: 'clearmind:calendar_history',
  STREAK_START_DATE: 'clearmind:streak_start_date',
  USER_PREFERENCES: 'clearmind:user-preferences',
  // Add other keys if they become necessary
};


type DayStatus = 'clean' | 'relapse';
type CalendarHistory = Record<string, DayStatus>;

interface StreakContextType {
  calendarHistory: CalendarHistory;
  setStreakStartDate: (date: Date) => Promise<void>;
  recordRelapse: (date: Date) => Promise<void>;
  streak: number;
  streakStartDate: Date | null;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

const DATE_FORMAT = 'yyyy-MM-dd';

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [calendarHistory, setCalendarHistory] = useState<CalendarHistory>({});
  const [streak, setStreak] = useState(0);
  const [streakStartDate, setStreakStartDateState] = useState<Date | null>(
    null
  );

  const loadHistory = useCallback(async () => {
    try {
      const history = await getData<CalendarHistory>(
        STORAGE_KEYS.CALENDAR_HISTORY,
        {}
      );
      const startDate = await getData<string | null>(
        STORAGE_KEYS.STREAK_START_DATE,
        null
      );
      
      setCalendarHistory(history);
      if (startDate) {
        setStreakStartDateState(new Date(startDate));
      }
      recalculateStreak(history, startDate ? new Date(startDate) : null);
    } catch (error) {
      console.error('Failed to load streak history:', error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const recalculateStreak = (
    history: CalendarHistory,
    startDate: Date | null
  ) => {
    if (!startDate) {
      setStreak(0);
      return;
    }

    const today = startOfToday();
    
    // If start date is in the future, set streak to 0
    if (isAfter(startDate, today)) {
      setStreak(0);
      return;
    }
    
    // Get all days from start date to today
    const days = eachDayOfInterval({ start: startDate, end: today });
    
    // Start with the full potential streak
    let currentStreak = days.length;
    
    // Check each day for relapses
    for (const day of days) {
      const dayStr = format(day, DATE_FORMAT);
      if (history[dayStr] === 'relapse') {
        // If we find a relapse, the streak starts after this day
        // Calculate days from this relapse to today
        const daysAfterRelapse = eachDayOfInterval({ 
          start: addDays(day, 1), 
          end: today 
        });
        currentStreak = daysAfterRelapse.length;
      }
    }
    
    setStreak(currentStreak);
  };

  const persistHistory = async (history: CalendarHistory) => {
    try {
      await storeData(STORAGE_KEYS.CALENDAR_HISTORY, history);
    } catch (error) {
      console.error('Failed to persist calendar history:', error);
    }
  };

  const setStreakStartDate = async (date: Date) => {
    const today = startOfToday();
    if (isAfter(date, today)) {
      // Cannot set a start date in the future
      return;
    }

    // First, load the current history to make sure we're working with the latest data
    let currentHistory: CalendarHistory = {};
    try {
      currentHistory = await getData<CalendarHistory>(STORAGE_KEYS.CALENDAR_HISTORY, {});
    } catch (error) {
      console.error("Error loading current history:", error);
      // Continue with empty history if we can't load current
    }

    // Create a new history object that preserves any existing relapse days
    const newHistory: CalendarHistory = { ...currentHistory };
    const interval = eachDayOfInterval({ start: date, end: today });

    // Mark all days in the interval as clean, unless they're already marked as relapse
    for (const day of interval) {
      const dayStr = format(day, DATE_FORMAT);
      // Only set to clean if not already marked as relapse
      if (newHistory[dayStr] !== 'relapse') {
        newHistory[dayStr] = 'clean';
      }
    }

    // Update state
    setCalendarHistory(newHistory);
    setStreakStartDateState(date);
    
    // Save data
    await persistHistory(newHistory);
    await storeData(STORAGE_KEYS.STREAK_START_DATE, date.toISOString());
    
    // Recalculate streak with the new history
    recalculateStreak(newHistory, date);
  };

  const recordRelapse = async (date: Date) => {
    const today = startOfToday();
    
    // Don't allow recording relapses in the future
    if (isAfter(date, today)) {
      return;
    }
    
    const dayStr = format(date, DATE_FORMAT);
    
    // Create a new history object based on the current one
    const newHistory = { ...calendarHistory };
    
    // Mark the specified day as a relapse
    newHistory[dayStr] = 'relapse';
    
    // If we don't have a streak start date yet, set it to the day after the relapse
    if (!streakStartDate) {
      const newStartDate = addDays(date, 1);
      // Only set if it's not in the future
      if (!isAfter(newStartDate, today)) {
        setStreakStartDateState(newStartDate);
        await storeData(STORAGE_KEYS.STREAK_START_DATE, newStartDate.toISOString());
      }
    }
    // If the relapse is on or after the current streak start date, 
    // update the streak start date to the day after the relapse
    else if (!isBefore(date, streakStartDate)) {
      const newStartDate = addDays(date, 1);
      // Only set if it's not in the future
      if (!isAfter(newStartDate, today)) {
        setStreakStartDateState(newStartDate);
        await storeData(STORAGE_KEYS.STREAK_START_DATE, newStartDate.toISOString());
      } else {
        // If the new start date would be in the future, reset the streak start date
        setStreakStartDateState(null);
        await storeData(STORAGE_KEYS.STREAK_START_DATE, null);
      }
    }
    
    // Update the calendar history state
    setCalendarHistory(newHistory);
    
    // Persist the updated history
    await persistHistory(newHistory);
    
    // Recalculate streak with the new history
    recalculateStreak(newHistory, streakStartDate);
  };

  const contextValue: StreakContextType = {
    calendarHistory,
    setStreakStartDate,
    recordRelapse,
    streak,
    streakStartDate,
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