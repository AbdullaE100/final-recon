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
import { resetAllStreakData } from '@/utils/resetStreakData';
import { storeData, getData, STORAGE_KEYS } from '@/utils/storage';
import { useGamification } from '@/context/GamificationContext';
import { AppState, AppStateStatus } from 'react-native';
import { isProcessing, acquireLock, releaseLock } from '@/utils/processingLock';

const STREAK_STORAGE_KEYS = {
  CALENDAR_HISTORY: STORAGE_KEYS.CALENDAR_HISTORY,
  STREAK_START_DATE: STORAGE_KEYS.STREAK_START_DATE,
  ONBOARDING_COMPLETED: STORAGE_KEYS.ONBOARDING_COMPLETED,
};
const DATE_FMT = 'yyyy-MM-dd';

export type DayStatus = 'clean' | 'relapse';
export type CalendarHistory = Record<string, DayStatus>;

interface StreakContextType {
  calendarHistory: CalendarHistory;
  streak: number;
  streakStartDate: Date | null;
  setStreakStartDate: (date: Date) => Promise<void>;
  performRelapse: () => Promise<void>;
  resetCalendar: () => Promise<void>;
  forceRefresh: () => Promise<boolean>;
}

const StreakContext = createContext<StreakContextType | undefined>(undefined);

const parseValidDate = (iso: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

export const StreakProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calendarHistory, setCalendarHistory] = useState<CalendarHistory>({});
  const [streakStartDate, setStreakStartDateState] = useState<Date | null>(null);
  const [streak, setStreakState] = useState(0);
  const appState = useRef(AppState.currentState);
  const gamification = useGamification();

  const recomputeStreak = useCallback((startDate: Date | null, history: CalendarHistory) => {
    if (!startDate) {
      setStreakState(0);
      return;
    }
    const today = startOfToday();
    let effectiveStartDate = startDate;

    const relapseDates = Object.keys(history)
      .filter(d => history[d] === 'relapse')
      .map(d => parseISO(d))
      .sort((a, b) => b.getTime() - a.getTime());

    if (relapseDates.length > 0 && isAfter(relapseDates[0], startDate)) {
      effectiveStartDate = addDays(relapseDates[0], 1);
    }
    
    if (isAfter(effectiveStartDate, today)) {
      setStreakState(0);
    } else {
      setStreakState(differenceInDays(today, effectiveStartDate) + 1);
    }
  }, []);

  const updateCalendarForNewDay = useCallback(async () => {
    if (isProcessing()) return;
    const history = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
    const startISO = await getData<string | null>(STREAK_STORAGE_KEYS.STREAK_START_DATE, null); // Allow null
    const startDate = parseValidDate(startISO);
    
    if (startDate) {
        recomputeStreak(startDate, history);
    }
  }, [recomputeStreak]);
  
  const forceRefresh = useCallback(async () => {
    if (isProcessing()) {
      console.log('[StreakContext] Skipping forceRefresh: Processing lock is active.');
      return true;
    }
    await updateCalendarForNewDay();
    return true;
  }, [updateCalendarForNewDay]);

  const performRelapse = async () => {
    if (!acquireLock()) {
      console.warn('[StreakContext] Relapse already in progress.');
      return;
    }
    console.log('[StreakContext] Starting relapse...');
    try {
      await resetAllStreakData();
      const today = startOfToday();
      const tomorrow = addDays(today, 1);
      const newHistory: CalendarHistory = {
        [format(today, DATE_FMT)]: 'relapse',
        [format(tomorrow, DATE_FMT)]: 'clean',
      };
      await storeData(STORAGE_KEYS.CALENDAR_HISTORY, newHistory);
      await storeData(STORAGE_KEYS.STREAK_START_DATE, tomorrow.toISOString());
      
      if (gamification?.setStreak) {
        await gamification.setStreak(0, tomorrow.getTime());
      }
      
      setCalendarHistory(newHistory);
      setStreakStartDateState(tomorrow);
      setStreakState(0);
      console.log('[StreakContext] Relapse complete.');
    } catch (error) {
      console.error('[StreakContext] Critical error during relapse:', error);
    } finally {
      releaseLock();
    }
  };

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (isProcessing()) return;
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        await updateCalendarForNewDay();
      }
      appState.current = nextAppState;
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    updateCalendarForNewDay(); // Initial load

    return () => {
      subscription.remove();
    };
  }, [updateCalendarForNewDay]);

  const resetCalendar = useCallback(async () => {
     await resetAllStreakData();
     setCalendarHistory({});
     setStreakStartDateState(null);
     setStreakState(0);
  }, []);

  const setStreakStartDate = async (date: Date) => {
    const today = startOfToday();
    const newHistory: CalendarHistory = {};
     eachDayOfInterval({ start: date, end: today }).forEach((d) => {
        const key = format(d, DATE_FMT);
        newHistory[key] = 'clean';
      });
    await storeData(STORAGE_KEYS.CALENDAR_HISTORY, newHistory);
    await storeData(STORAGE_KEYS.STREAK_START_DATE, date.toISOString());
    setCalendarHistory(newHistory);
    setStreakStartDateState(date);
    recomputeStreak(date, newHistory);
  };

  const value: StreakContextType = {
    calendarHistory,
    streak,
    streakStartDate,
    setStreakStartDate,
    performRelapse,
    resetCalendar,
    forceRefresh,
  };

  return <StreakContext.Provider value={value}>{children}</StreakContext.Provider>;
};

export const useStreak = (): StreakContextType => {
  const ctx = useContext(StreakContext);
  if (!ctx) throw new Error('useStreak must be used within a StreakProvider');
  return ctx;
}; 