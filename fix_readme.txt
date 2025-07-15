// Fixed versions of the streak-related code

1. First let's fix the record relapse function in StreakContext.tsx that's causing crashes:


// ===== QUICK FIX FOR RECORD RELAPSE CRASH =====
// Open context/StreakContext.tsx and locate the recordRelapse function (around line 500)
// Replace it with this implementation:

const recordRelapse = useCallback(
  async (date: Date) => {
    try {
      console.log("[StreakContext] RECORDING RELAPSE: Date=" + date.toISOString());
      const relapseDay = startOfDay(date);
      const key = format(relapseDay, DATE_FMT);
      const today = startOfToday();

      // Update the calendar history with the relapse
      const history = { ...calendarHistory };
      history[key] = "relapse";
      
      // Save the updated calendar history
      await storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, history);
      
      // Clear the streak start date
      await storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, null);

      // Update local state
      console.log("[StreakContext] Updating local state: streak=0, startDate=null");
      setCalendarHistory(history);
      setStreakStartDateState(null);
      setStreakState(0);
      
      // IMPORTANT: After a delay, set up the new streak start date for tomorrow
      setTimeout(async () => {
        try {
          // Set tomorrow as the new streak start date
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          // Get a fresh copy of history to avoid stale data
          const updatedHistory = await getData<CalendarHistory>(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, {});
          
          // Ensure today is marked as relapse
          updatedHistory[key] = "relapse";
          
          // Mark tomorrow as clean to start the new streak
          const tomorrowKey = format(tomorrow, DATE_FMT);
          updatedHistory[tomorrowKey] = "clean";
          
          console.log("[StreakContext] Setting up new streak starting tomorrow: " + tomorrowKey);
          
          // Save the updated history and start date
          await storeData(STREAK_STORAGE_KEYS.CALENDAR_HISTORY, updatedHistory);
          await storeData(STREAK_STORAGE_KEYS.STREAK_START_DATE, tomorrow.toISOString());
          
          // Update local state
          setCalendarHistory(updatedHistory);
          setStreakStartDateState(tomorrow);
        } catch (error) {
          console.error("[StreakContext] Error setting up new streak:", error);
        }
      }, 3000);
      
      console.log("[StreakContext] RELAPSE RECORDING COMPLETE");
    } catch (error) {
      console.error("[StreakContext] ERROR recording relapse:", error);
    }
  },
  [calendarHistory]
);


2. Fix GamificationContext to set streak to 0 for new users:


// Open context/GamificationContext.tsx, find around line 1235:
// Replace:
// For new users, ensure streak is set to 1
if (isNewUser && migratedData.streak !== 1) {
  console.log("GamificationContext: New user detected - setting streak to 1");
  setStreak(1);
}

// With:
// For new users, ensure streak is set to 0
if (isNewUser) {
  console.log("GamificationContext: New user detected - setting streak to 0");
  setStreak(0);
}


3. Fix the onboarding.tsx file to start with streak 0:


// Open app/onboarding.tsx, find around line 135:
// Replace:
const newStreakData = {
  streak: 1,
  lastCheckIn: Date.now(),
  startDate: today.getTime(),
  hourCount: 0
};

// With:
const newStreakData = {
  streak: 0, // Set initial streak to 0 for new users
  lastCheckIn: Date.now(),
  startDate: today.getTime(),
  hourCount: 0
};

// Also, further down in the same file:
// Replace:
// Set all failsafe values
await storeData("clearmind:manual-streak-value", "1");
await storeData("clearmind:backup-streak-value", "1");
await storeData("clearmind:failsafe-streak-value", "1");

// With:
// Set all failsafe values to 0 for new users
await storeData("clearmind:manual-streak-value", "0");
await storeData("clearmind:backup-streak-value", "0");
await storeData("clearmind:failsafe-streak-value", "0");

