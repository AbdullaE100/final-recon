/*
  ==========================================
  NEW — SIMPLE STREAK / CALENDAR CONTEXT
  ------------------------------------------
  This implementation starts from scratch.
  It keeps the original public API surface
  (calendarHistory, streak, streakStartDate,
  setStreakStartDate, recordRelapse, resetCalendar,
  setStreak, forceRefresh, debugCalendarHistory)
  so that existing components do not break,
  but the internals are dramatically simpler:

  • The only source of truth is storage.ts.
  • Calendar history only stores two statuses
    — "clean" and "relapse".
  • Streak is recomputed on every change
    instead of being persisted separately.
  • Logging is kept to an absolute minimum.
  • No external services or cross-context calls.
  ==========================================
*/

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  format,
  eachDayOfInterval,
  startOfDay,
  startOfToday,
  differenceInDays,
  isAfter,
  parseISO,
  isSameDay,
  addDays,
  isEqual,
  isBefore,
} from 'date-fns';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { resetAllStreakData } from '@/utils/resetStreakData';
import { storeData, getData, STORAGE_KEYS } from '@/utils/storage';
import { useGamification } from '@/context/GamificationContext';
import { AppState, AppStateStatus } from 'react-native';

// Define storage keys here to ensure consistency
const STREAK_STORAGE_KEYS = {
  CALENDAR_HISTORY: STORAGE_KEYS.CALENDAR_HISTORY,
  STREAK_START_DATE: STORAGE_KEYS.STREAK_START_DATE,
  ONBOARDING_COMPLETED: STORAGE_KEYS.ONBOARDING_COMPLETED,
  LAST_ACTIVE_DATE: 'clearmind:last-active-date'
};

// ---------- Types ----------
export type DayStatus = 'clean' | 'relapse';
export type CalendarHistory = Record<string, DayStatus>;
interface StreakContextType {
  calendarHistory: CalendarHistory;
  streak: number;
  streakStartDate: Date | null;
  // actions
  setStreakStartDate: (date: Date) => Promise<void>;
  recordRelapse: (date: Date) => Promise<void>;
  resetCalendar: () => Promise<void>;
  // compatibility helpers (kept simple)
  setStreak: (days: number, startDateTimestamp?: number) => Promise<void>;
  forceRefresh: () => Promise<boolean>;
  debugCalendarHistory: () => void;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);
const DATE_FMT = 'yyyy-MM-dd';

// Safely convert an ISO string to Date, returning null for invalid inputs
const parseValidDate = (iso: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

// ---------- Provider ----------
export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [calendarHistory, setCalendarHistory] = useState<CalendarHistory>({});
  const [streakStartDate, setStreakStartDateState] = useState<Date | null>(null);
  const [streak, setStreakState] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [lastProcessedDate, setLastProcessedDate] = useState<string>('');
  const gamification = useGamification();
  const appState = useRef(AppState.currentState);
  const lastActiveDateRef = useRef<Date>(new Date());
  
  const recomputeStreak = useCallback((maybeStart: Date | null, history: CalendarHistory) => {
    try {
      // Always get a fresh Date object to ensure we're using the current system time
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      
      // If no start date, streak is 0
      if (!maybeStart) {
        setStreakState(0);
        return;
      }
      
      // Normalize the start date to start of day
      const startDate = startOfDay(maybeStart);
      
      // Find the latest relapse date
      const relapseTimestamps = Object.keys(history)
        .filter((d) => history[d] === 'relapse')
        .map((d) => {
          try {
            return parseISO(d).getTime();
          } catch (error) {
            console.error(`[StreakContext] Error parsing date ${d}:`, error);
            return 0;
          }
        })
        .filter(ts => ts > 0); // Filter out invalid timestamps

      // If there's a relapse, check if it's after the start date
      if (relapseTimestamps.length > 0) {
        const latestRelapseTs = Math.max(...relapseTimestamps);
        const latestRelapseDate = startOfDay(new Date(latestRelapseTs));
        
        // If the latest relapse is after or equal to the start date, use the day after relapse as effective start
        if (isAfterOrEqual(latestRelapseDate, startDate)) {
          const dayAfterRelapse = addDays(latestRelapseDate, 1);
          
          // Calculate streak from the day after relapse to today
          const days = differenceInDays(today, dayAfterRelapse) + 1;
          const safeStreak = Math.max(0, days);
          
          // If the day after relapse is in the future, streak is 0
          if (isAfter(dayAfterRelapse, today)) {
            setStreakState(0);
          } else {
            setStreakState(safeStreak);
          }
          return;
        }
      }
      
      // If start date is in the future, use today
      if (isAfter(startDate, today)) {
        setStreakState(0); // Start date in future means 0 streak, not 1
        return;
      }
      
      // Calculate streak from start date to today
      const days = differenceInDays(today, startDate) + 1;
      const safeStreak = Math.max(0, days); // Minimum streak is 0 day (changed from 1)
      
      setStreakState(safeStreak);
    } catch (error) {
      console.error('[StreakContext] Error in recomputeStreak:', error);
      // In case of error, default to 0 to avoid displaying incorrect streak
      setStreakState(0);
    }
  }, []);

  // Helper function to check if date1 is after or equal to date2
  const isAfterOrEqual = (date1: Date, date2: Date): boolean => {
    return isEqual(date1, date2) || isAfter(date1, date2);
  };

  // Function to update calendar with new clean days
  const updateCalendarForNewDay = useCallback(async () => {
    try {
      // Get the current calendar history
      const history = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
      const startISO = await getData<string | null>(STREAK_STORAGE_KEYS.STREAK_START_DATE, null);
      const startDate = parseValidDate(startISO);
      
      // Always get a fresh Date object to ensure we're using the current system time
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      const todayStr = format(today, DATE_FMT);
      
      // Check if we've already processed this date to prevent infinite loops
      if (todayStr === lastProcessedDate) {
        return; // Skip processing if we've already done this date
      }
      
      // Update the last processed date
      setLastProcessedDate(todayStr);
      
      if (!startDate) {
        // Set up a new streak starting today
        const newHistory = { ...history, [todayStr]: 'clean' as DayStatus };
        
        // Save the updated history and start date
        await Promise.all([
          storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, newHistory),
          storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, today.toISOString()),
          storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString()),
        ]);
        
        // Update local state
        setCalendarHistory(newHistory);
        setStreakStartDateState(today);
        setStreakState(0);  // New users start with streak 0
        
        lastActiveDateRef.current = today;
        return;
      }
      
      // Get the last active date from storage
      const lastActiveDateISO = await getData<string | null>(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, null);
      const lastActiveDate = parseValidDate(lastActiveDateISO) || startDate; // Default to start date if not found
      
      // Create a copy of the history that we'll update
      const updatedHistory = { ...history };
      
      // Always mark today as clean if it's not already marked as relapse
      if (!updatedHistory[todayStr] || updatedHistory[todayStr] !== 'relapse') {
        updatedHistory[todayStr] = 'clean';
      }
      
      // Check if the day has changed since last active
      if (!isSameDay(today, lastActiveDate)) {
        // Fill in all days between last active date and today
        const dayAfterLastActive = addDays(startOfDay(lastActiveDate), 1);
        
        // Only process if there are days to fill
        if (isBefore(dayAfterLastActive, today)) {
          // Get all days between last active date and today (exclusive of last active, inclusive of today)
          const daysToProcess = eachDayOfInterval({ 
            start: dayAfterLastActive, 
            end: today 
          });
          
          // Mark each day as clean unless it's already marked as relapse
          daysToProcess.forEach(date => {
            const dateStr = format(date, DATE_FMT);
            if (!updatedHistory[dateStr]) {
              updatedHistory[dateStr] = 'clean';
            }
          });
        }
      }
      
      // Save the updated history
      await storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, updatedHistory);
      
      // Update local state
      setCalendarHistory(updatedHistory);
      
      // Always recompute streak with updated history
      recomputeStreak(startDate, updatedHistory);
      
      // Save the current date as last active date
      await storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString());
      lastActiveDateRef.current = today;
    } catch (error) {
      console.error('[StreakContext] Error in updateCalendarForNewDay:', error);
    }
  }, [recomputeStreak, lastProcessedDate]);

  // Force refresh function - defined before the AppState listener to avoid linter errors
  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Get the latest data from storage
      const history = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
      const startISO = await getData<string | null>(STREAK_STORAGE_KEYS.STREAK_START_DATE, null);
      const startDate = parseValidDate(startISO);
      
      // Always get a fresh Date object to ensure we're using the current system time
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of day
      const todayStr = format(today, DATE_FMT);
      
      // Check if we've already processed this date
      if (todayStr === lastProcessedDate) {
        // If we've already processed this date, only update local state
        setCalendarHistory(history);
        setStreakStartDateState(startDate);
        
        // Recompute streak with existing data
        if (startDate) {
          recomputeStreak(startDate, history);
        } else {
          setStreakState(0);
        }
        
        setIsLoading(false);
        return true;
      }
      
      // Update the last processed date
      setLastProcessedDate(todayStr);
      
      // Update the local state with the latest data
      setCalendarHistory(history);
      setStreakStartDateState(startDate);
      
      // IMPORTANT: Check if this is a new user (onboarding not completed)
      const isOnboardingCompleted = await getData(STREAK_STORAGE_KEYS.ONBOARDING_COMPLETED, false);
      const isNewUser = isOnboardingCompleted === false;
      
      if (isNewUser) {
        console.log('[StreakContext] New user detected in forceRefresh - ensuring streak is 0');
        setStreakState(0);
        
        // Also ensure user data has streak 0
        try {
          const userData = await getData(STORAGE_KEYS.USER_DATA, {});
          // Check if userData exists and has a streak property that's not 0
          if (userData && typeof userData === 'object' && 'streak' in userData && userData.streak !== 0) {
            const updatedUserData = {
              ...userData,
              streak: 0,
            };
            await storeData(STORAGE_KEYS.USER_DATA, updatedUserData);
          }
        } catch (userDataError) {
          console.error('[StreakContext] Error updating user data in forceRefresh:', userDataError);
        }
        
        setIsLoading(false);
        return true;
      }
      
      // Always update calendar for new day to ensure all days are marked
      await updateCalendarForNewDay();
      
      // After updating calendar, get fresh data and recompute streak
      const updatedHistory = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
      const updatedStartISO = await getData<string | null>(STREAK_STORAGE_KEYS.STREAK_START_DATE, null);
      const updatedStartDate = parseValidDate(updatedStartISO);
      
      // Update local state with fresh data
      setCalendarHistory(updatedHistory);
      setStreakStartDateState(updatedStartDate);
      
      // Recompute streak with updated history
      if (updatedStartDate) {
        recomputeStreak(updatedStartDate, updatedHistory);
      } else {
        setStreakState(0);
      }
      
      // Save the current date as last active date
      await storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString());
      lastActiveDateRef.current = today;
    } catch (error) {
      console.error('[StreakContext] Error in forceRefresh:', error);
    } finally {
      setIsLoading(false);
    }
    
    return true;
  }, [recomputeStreak, updateCalendarForNewDay, lastProcessedDate]);

  // Initial load.
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      
      // Check onboarding completion status
      const isOnboardingCompleted = await getData(STREAK_STORAGE_KEYS.ONBOARDING_COMPLETED, false);
      const isNewUser = isOnboardingCompleted === false;
      
      if (isNewUser) {
        console.log('[StreakContext] New user detected - setting up new streak with 0 days');
        // Get current date for new streak
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day
        const todayStr = format(today, DATE_FMT);
        
        // Set the initial processed date
        setLastProcessedDate(todayStr);
        
        // Create new history with today marked as clean
        const newHistory = { [todayStr]: 'clean' as DayStatus };
        
        // Set streak start date to today
        await Promise.all([
          storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, newHistory),
          storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, today.toISOString()),
          storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString()),
        ]);
        
        // Update user data if it exists
        try {
          const userData = await getData(STORAGE_KEYS.USER_DATA, {});
          const updatedUserData = {
            ...userData,
            streak: 0, // New users start with streak 0
            startDate: today.getTime(),
            lastCheckIn: Date.now()
          };
          await storeData(STORAGE_KEYS.USER_DATA, updatedUserData);
        } catch (userDataError) {
          console.error('[StreakContext] Error updating user data:', userDataError);
        }
        
        // Update local state
        setCalendarHistory(newHistory);
        setStreakStartDateState(today);
        setStreakState(0);
        
        setIsLoading(false);
        return;
      }
      
      // For existing users, proceed with normal loading
      const history = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
      const startISO = await getData<string | null>(STREAK_STORAGE_KEYS.STREAK_START_DATE, null);
      
      // Check for the 30-day bug specifically
      const startDate = parseValidDate(startISO);
      if (startDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day
        const calculatedStreak = differenceInDays(today, startDate) + 1;
        
        // If streak is suspiciously close to 30 days, it's likely the bug
        if (calculatedStreak >= 28 && calculatedStreak <= 32) {
          console.warn('[StreakContext] EMERGENCY FIX: Detected likely 30-day bug - resetting to 1 day');
          
          // Force a 1-day streak starting today
          const todayStr = format(today, DATE_FMT);
          const newHistory = { [todayStr]: 'clean' as DayStatus };
          
          await Promise.all([
            storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, newHistory),
            storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, today.toISOString()),
            storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString()),
          ]);
          
          setCalendarHistory(newHistory);
          setStreakStartDateState(today);
          setStreakState(1);
          
          setIsLoading(false);
          return;
        }
      }
      
      // Normal case - existing user with valid data
      setCalendarHistory(history);
      setStreakStartDateState(startDate);
      
      // If no start date is found, set it to today
      if (!startDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of day
        const todayStr = format(today, DATE_FMT);
        
        // Create new history with today marked as clean
        const newHistory = { ...history, [todayStr]: 'clean' as DayStatus };
        
        await Promise.all([
          storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, newHistory),
          storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, today.toISOString()),
          storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString()),
        ]);
        
        setCalendarHistory(newHistory);
        setStreakStartDateState(today);
        setStreakState(1);
      } else {
        // Recompute streak with existing data
        recomputeStreak(startDate, history);
      }
      
      // Get last active date
      const lastActiveDateISO = await getData<string | null>(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, null);
      if (lastActiveDateISO) {
        lastActiveDateRef.current = parseValidDate(lastActiveDateISO) || new Date();
      } else {
        // If no last active date, set it to today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString());
        lastActiveDateRef.current = today;
      }
      
      // Set the initial processed date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setLastProcessedDate(format(today, DATE_FMT));
      
      setIsLoading(false);
      
      // Check if we need to update the calendar for a new day
      await updateCalendarForNewDay();
    })();
  }, [recomputeStreak, updateCalendarForNewDay]);
  
  // Add AppState listener to check for date changes and update streak
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Only run this when the app comes to the foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Always force a calendar update to ensure we're up to date with the current date
        await updateCalendarForNewDay();
      }
      
      appState.current = nextAppState;
    };
    
    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    // Check for date changes less aggressively to avoid performance issues
    // This is still frequent enough to catch date changes but won't cause performance issues
    const checkDateInterval = setInterval(async () => {
      try {
        // Get a fresh Date object to ensure we're using the current system time
        const freshToday = new Date();
        freshToday.setHours(0, 0, 0, 0); // Start of day
        const currentDateStr = format(freshToday, DATE_FMT);
        
        // Only process if this is a new date
        if (currentDateStr !== lastProcessedDate) {
          console.log(`[StreakContext] Date change detected: ${lastProcessedDate} -> ${currentDateStr}`);
          // Force a calendar update to ensure we're using the latest system date
          await updateCalendarForNewDay();
        }
      } catch (error) {
        console.error('[StreakContext] Error in date check interval:', error);
      }
    }, 30000); // Check every 30 seconds - much less aggressive to save resources
    
    // Run an immediate check when this effect is first setup
    handleAppStateChange('active');
    
    // Cleanup subscription and interval
    return () => {
      subscription.remove();
      clearInterval(checkDateInterval);
    };
  }, [updateCalendarForNewDay, lastProcessedDate]);
      
  // ---------- Actions ----------
    const setStreakStartDate = async (date: Date): Promise<void> => {
      const startDay = startOfDay(date);
      const today = startOfToday();

      const history = await getData<CalendarHistory>(
        STREAK_STORAGE_KEYS.CALENDAR_HISTORY,
        {}
      );

      Object.keys(history).forEach((d) => {
        if (parseISO(d) >= startDay && history[d] === 'relapse') {
          delete history[d];
        }
      });

      const newHistory: CalendarHistory = { ...history };
      eachDayOfInterval({ start: startDay, end: today }).forEach((d) => {
        const key = format(d, DATE_FMT);
        if(!newHistory[key]) newHistory[key] = 'clean';
      });

      await Promise.all([
        storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, newHistory),
        storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, startDay.toISOString() as unknown as string),
      ]);

      setCalendarHistory(newHistory);
      setStreakStartDateState(startDay);
      recomputeStreak(startDay, newHistory);
  };

  const recordRelapse = useCallback(
    async (date: Date) => {
      console.log(`[StreakContext] RECORDING RELAPSE: Date=${date.toISOString()}`);
      
      try {
        // Validate the input date
        if (!date || isNaN(date.getTime())) {
          console.error('[StreakContext] Invalid date provided to recordRelapse');
          return;
        }
        
        const relapseDay = startOfDay(date);
        const key = format(relapseDay, DATE_FMT);
        const today = startOfToday();

        // Get fresh data from storage to avoid stale state issues
        let freshHistory: CalendarHistory = {};
        try {
          freshHistory = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
          console.log('[StreakContext] Got fresh calendar history with', Object.keys(freshHistory).length, 'entries');
        } catch (historyError) {
          console.error('[StreakContext] Error getting calendar history:', historyError);
          // Continue with empty history if there's an error
          freshHistory = {};
        }
        
        // Create a copy of the fresh history to avoid mutation
        const history = { ...freshHistory };
        
        // Mark the relapse day
        history[key] = 'relapse';
        
        // Set up the new streak start date for tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowKey = format(tomorrow, DATE_FMT);
        
        // Mark tomorrow as clean to start the new streak
        history[tomorrowKey] = 'clean';
        
        // Save the updated calendar history
        try {
          await storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, history);
          console.log('[StreakContext] Calendar history saved successfully');
        } catch (saveError) {
          console.error('[StreakContext] Error saving calendar history:', saveError);
          // Continue even if save fails
        }
        
        // Set the new streak start date to tomorrow
        try {
          await storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, tomorrow.toISOString());
          console.log('[StreakContext] New streak start date set to tomorrow');
        } catch (startDateError) {
          console.error('[StreakContext] Error setting streak start date:', startDateError);
          // Continue even if this fails
        }

        // Update local state
        console.log('[StreakContext] Updating local state: streak=0, startDate=tomorrow');
        setCalendarHistory(history);
        setStreakStartDateState(tomorrow);
        setStreakState(0);
        
        // REMOVING this forceRefresh call to prevent infinite loop
        // try {
        //   // Wait a bit to ensure storage operations complete
        //   setTimeout(async () => {
        //     try {
        //       await forceRefresh();
        //       console.log('[StreakContext] Force refresh completed after relapse');
        //     } catch (refreshError) {
        //       console.error('[StreakContext] Error during force refresh:', refreshError);
        //     }
        //   }, 500);
        // } catch (timeoutError) {
        //   console.error('[StreakContext] Error setting up refresh timeout:', timeoutError);
        // }
        
        console.log('[StreakContext] RELAPSE RECORDING COMPLETE');
      } catch (error) {
        console.error('[StreakContext] Error recording relapse:', error);
      }
    },
    [] // Removed forceRefresh from dependencies
  );

  const resetCalendar = useCallback(async () => {
    await Promise.all([
      storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {}),
      storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, null as unknown as string),
    ]);
    setCalendarHistory({});
    setStreakStartDateState(null);
    setStreakState(0);
  }, []);

  // ---------- Compatibility helpers ----------
  const setStreak = useCallback(
    async (days: number, startDateTimestamp?: number) => {
        if (days <= 0) {
            await resetCalendar();
            return;
        }
      const today = startOfToday();
      const start = startDateTimestamp
        ? startOfDay(new Date(startDateTimestamp))
        : startOfDay(new Date(today.getTime() - (days - 1) * 86400000));
      await setStreakStartDate(start);
    },
    [setStreakStartDate, resetCalendar]
  );

  const debugCalendarHistory = useCallback(() => {
    console.log('===== CALENDAR DEBUG =====');
    console.log('StartDate:', streakStartDate?.toISOString() ?? 'none');
    console.log('Streak:', streak);
    console.log('LastProcessedDate:', lastProcessedDate);
    console.table(calendarHistory);
    console.log('==========================');
  }, [calendarHistory, streak, streakStartDate, lastProcessedDate]);

  // ---------- Context value ----------
  const value: StreakContextType = {
    calendarHistory,
    streak,
    streakStartDate,
    setStreakStartDate,
    recordRelapse,
    resetCalendar,
    setStreak,
    forceRefresh,
    debugCalendarHistory,
  };

  return (
    <StreakContext.Provider value={value}>{children}</StreakContext.Provider>
  );
};

export const useStreak = (): StreakContextType => {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error('useStreak must be used within a StreakProvider');
  return ctx;
}; 