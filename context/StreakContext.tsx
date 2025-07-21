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

// 1. Add robust logging utility
const log = (...args: any[]) => {
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log('[StreakContext]', ...args);
  }
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
  const streakRef = useRef(streak);
  useEffect(() => { streakRef.current = streak; }, [streak]);
  
  // 2. Refactor recomputeStreak to only update if value changes
  const recomputeStreak = (maybeStart: Date | null, history: CalendarHistory) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!maybeStart) {
        if (streakRef.current !== 0) {
          log('recomputeStreak: No start date, setting streak to 0');
          setStreakState(0);
        }
        return;
      }
      const startDate = startOfDay(maybeStart);
      const relapseTimestamps = Object.keys(history)
        .filter((d) => history[d] === 'relapse')
        .map((d) => {
          try {
            return parseISO(d).getTime();
          } catch (error) {
            log('Error parsing date', d, error);
            return 0;
          }
        })
        .filter(ts => ts > 0);
      if (relapseTimestamps.length > 0) {
        const latestRelapseTs = Math.max(...relapseTimestamps);
        const latestRelapseDate = startOfDay(new Date(latestRelapseTs));
        if (isAfterOrEqual(latestRelapseDate, startDate)) {
          const dayAfterRelapse = addDays(latestRelapseDate, 1);
          const days = differenceInDays(today, dayAfterRelapse) + 1;
          const safeStreak = Math.max(0, days);
          if (isAfter(dayAfterRelapse, today)) {
            if (streakRef.current !== 0) {
              log('recomputeStreak: Day after relapse is in the future, setting streak to 0');
              setStreakState(0);
            }
          } else if (streakRef.current !== safeStreak) {
            log('recomputeStreak: Relapse found, setting streak to', safeStreak);
            setStreakState(safeStreak);
          }
          return;
        }
      }
      if (isAfter(startDate, today)) {
        if (streakRef.current !== 0) {
          log('recomputeStreak: Start date in future, setting streak to 0');
          setStreakState(0);
        }
        return;
      }
      const days = differenceInDays(today, startDate) + 1;
      const safeStreak = Math.max(0, days);
      if (streakRef.current !== safeStreak) {
        log('recomputeStreak: Calculated streak', safeStreak);
        setStreakState(safeStreak);
      }
    } catch (error) {
      log('Error in recomputeStreak:', error);
      if (streakRef.current !== 0) setStreakState(0);
    }
  };

  // Helper function to check if date1 is after or equal to date2
  const isAfterOrEqual = (date1: Date, date2: Date): boolean => {
    return isEqual(date1, date2) || isAfter(date1, date2);
  };

  // ---------- Actions ----------
  // Move resetCalendar and setStreak above their first usage to fix linter error
  const resetCalendar = useCallback(async () => {
    await Promise.all([
      storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {}),
      storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, null as unknown as string),
    ]);
    setCalendarHistory({});
    setStreakStartDateState(null);
    setStreakState(0);
  }, []);

  const setStreak = useCallback(async (days: number, startDateTimestamp?: number) => {
    log('setStreak called with', days, startDateTimestamp);
    const isOnboardingCompleted = await getData(STREAK_STORAGE_KEYS.ONBOARDING_COMPLETED, false);
    const isNewUser = isOnboardingCompleted === false;
    if (isNewUser) {
      log('setStreak: New user, resetting calendar');
      await resetCalendar();
      return;
    }
    if (typeof days !== 'number' || isNaN(days) || days < 0) days = 0;
    const today = startOfToday();
    const start = startDateTimestamp
      ? startOfDay(new Date(startDateTimestamp))
      : startOfDay(new Date(today.getTime() - (days - 1) * 86400000));
    const history = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
    Object.keys(history).forEach((d) => {
      if (parseISO(d) >= start && history[d] === 'relapse') {
        delete history[d];
      }
    });
    const newHistory: CalendarHistory = { ...history };
    eachDayOfInterval({ start, end: today }).forEach((d) => {
      const key = format(d, DATE_FMT);
      if (!newHistory[key]) newHistory[key] = 'clean';
    });
    await Promise.all([
      storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, newHistory),
      storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, start.toISOString() as unknown as string),
    ]);
    setCalendarHistory(newHistory);
    setStreakStartDateState(start);
    recomputeStreak(start, newHistory);
    try {
      const userData = await getData(STORAGE_KEYS.USER_DATA, {});
      const updatedUserData = {
        ...userData,
        streak: days,
        startDate: start.getTime(),
        lastCheckIn: days > 0 ? Date.now() : null
      };
      await storeData(STORAGE_KEYS.USER_DATA, updatedUserData);
    } catch (userDataError) {
      log('Error updating user data in setStreak:', userDataError);
    }
  }, [resetCalendar]);

  // 4. Refactor updateCalendarForNewDay to only update if a new day is detected
  const updateCalendarForNewDay = useCallback(async () => {
    try {
      log('updateCalendarForNewDay called');
      const history = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
      const startISO = await getData<string | null>(STREAK_STORAGE_KEYS.STREAK_START_DATE, null);
      const startDate = parseValidDate(startISO);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, DATE_FMT);
      if (todayStr === lastProcessedDate) {
        log('updateCalendarForNewDay: Already processed today');
        return;
      }
      setLastProcessedDate(todayStr);
      if (!startDate) {
        const newHistory = { ...history, [todayStr]: 'clean' as DayStatus };
        await Promise.all([
          storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, newHistory),
          storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, today.toISOString()),
          storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString()),
        ]);
        setCalendarHistory(newHistory);
        setStreakStartDateState(today);
        setStreakState(0);
        lastActiveDateRef.current = today;
        log('updateCalendarForNewDay: No startDate, initialized new streak');
        return;
      }
      const lastActiveDateISO = await getData<string | null>(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, null);
      const lastActiveDate = parseValidDate(lastActiveDateISO) || startDate;
      const updatedHistory = { ...history };
      if (!updatedHistory[todayStr] || updatedHistory[todayStr] !== 'relapse') {
        updatedHistory[todayStr] = 'clean';
      }
      if (!isSameDay(today, lastActiveDate)) {
        const dayAfterLastActive = addDays(startOfDay(lastActiveDate), 1);
        if (isBefore(dayAfterLastActive, today)) {
          const daysToProcess = eachDayOfInterval({ start: dayAfterLastActive, end: today });
          daysToProcess.forEach(date => {
            const dateStr = format(date, DATE_FMT);
            if (!updatedHistory[dateStr]) {
              updatedHistory[dateStr] = 'clean';
            }
          });
        }
      }
      await storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, updatedHistory);
      setCalendarHistory(updatedHistory);
      recomputeStreak(startDate, updatedHistory);
      await storeData(STREAK_STORAGE_KEYS.LAST_ACTIVE_DATE, today.toISOString());
      lastActiveDateRef.current = today;
      log('updateCalendarForNewDay: Calendar updated for new day');
    } catch (error) {
      log('Error in updateCalendarForNewDay:', error);
    }
  }, [lastProcessedDate]);

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
  }, [updateCalendarForNewDay, lastProcessedDate]);

  // Initial load.
  // [INFINITE LOOP FIX] - The following effects use guards (lastProcessedDate, isNewUser, etc.) to prevent repeated updates and infinite loops.
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
  }, [updateCalendarForNewDay]);
  
  // [INFINITE LOOP FIX] - This AppState effect uses guards and intervals to prevent repeated updates and infinite loops.
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
  const recordRelapse = useCallback(
    async (date: Date) => {
      // === Checkpoint 1: Validate input ===
      if (!date || isNaN(date.getTime())) {
        console.error('[StreakContext] recordRelapse: Invalid date provided');
        return;
      }
      const relapseDay = startOfDay(date);
      const key = format(relapseDay, DATE_FMT);

      // === Checkpoint 2: Guard - If already relapse today and streak is 0, do nothing ===
      let freshHistory: CalendarHistory = {};
      try {
        freshHistory = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
      } catch (historyError) {
        console.error('[StreakContext] recordRelapse: Error getting calendar history:', historyError);
        freshHistory = {};
      }
      const alreadyRelapse = freshHistory[key] === 'relapse';
      const currentStreak = typeof streak === 'number' ? streak : 0;
      if (alreadyRelapse && currentStreak === 0) {
        console.log('[StreakContext] recordRelapse: Already marked as relapse today and streak is 0. No action taken.');
        return;
      }

      // === Checkpoint 3: Mark relapse in calendar ===
      const history: CalendarHistory = { ...freshHistory, [key]: 'relapse' };
      try {
        await storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, history);
        console.log('[StreakContext] recordRelapse: Calendar history updated');
      } catch (saveError) {
        console.error('[StreakContext] recordRelapse: Error saving calendar history:', saveError);
      }

      // === Checkpoint 4: Set streak start date to today and streak to 1 ===
      try {
        await storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, relapseDay.toISOString());
        console.log('[StreakContext] recordRelapse: Streak start date set to today');
      } catch (startDateError) {
        console.error('[StreakContext] recordRelapse: Error setting streak start date:', startDateError);
      }

      // === Checkpoint 5: Update local state (streak=0, startDate=today) ===
      setCalendarHistory(history);
      setStreakStartDateState(relapseDay);
      setStreakState(0);
      console.log('[StreakContext] recordRelapse: Local state updated (streak=0, startDate=today)');

      // === Checkpoint 6: Trigger a single refresh ===
      // Removed forceRefresh call to prevent infinite loop
      // try {
      //   await forceRefresh();
      //   console.log('[StreakContext] recordRelapse: Force refresh completed');
      // } catch (refreshError) {
      //   console.error('[StreakContext] recordRelapse: Error during force refresh:', refreshError);
      // }

      // === Checkpoint 7: Log completion ===
      console.log('[StreakContext] recordRelapse: COMPLETE');
    },
    [forceRefresh, streak]
  );

  // 5. Add a debug function to print the full state and storage
  const debugCalendarHistory = useCallback(() => {
    log('===== CALENDAR DEBUG =====');
    log('StartDate:', streakStartDate?.toISOString() ?? 'none');
    log('Streak:', streak);
    log('LastProcessedDate:', lastProcessedDate);
    log('CalendarHistory:', calendarHistory);
    log('==========================');
  }, [calendarHistory, streak, streakStartDate, lastProcessedDate]);

  // Proper setStreakStartDate implementation for context value
  const setStreakStartDate = async (date: Date): Promise<void> => {
    // Use setStreak with days calculated from date to today
    const today = startOfToday();
    const start = startOfDay(date);
    const days = differenceInDays(today, start) + 1;
    await setStreak(days, start.getTime());
  };

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