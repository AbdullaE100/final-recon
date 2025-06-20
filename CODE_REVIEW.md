# Code Review & Improvement Plan

Below is a list of identified issues and actionable steps:

1. GamificationContext is too large
   - Single monolithic file with 4K lines and mixed responsibilities (streaks, challenges, achievements, companion, journaling, import/export, widget updates).
   - Action: Split into multiple contexts/hooks:
     - useStreakContext
     - useChallengeContext
     - useCompanionContext
     - useJournalContext

2. Over-eager & redundant state updates
   - Multiple `setUserProgress` calls in `setStreak`.
   - Action: Collapse into one UI update. Batch storage writes off the render path.

3. Excessive useEffects & timers
   - Multiple effects in `StreakCard`: prop/context, AppState listener, 30s interval.
   - Action: Consolidate into a single effect. Remove AppState and interval.

4. Move side-effects out of render logic
   - Inline storage & Supabase syncs.
   - Action: Extract service layer for side-effects (e.g., `streakService`).

5. Adopt a reducer for userProgress
   - Spread/merge state everywhere.
   - Action: Use `useReducer` with actions (CHECK_IN, SET_STREAK, LOAD_DATA).

6. Remove dead code & logs
   - Remove or wrap console.logs behind debug flags.
   - Remove commented-out validation code.

7. Improve type safety
   - Centralize Supabase types in `@/types/supabase.ts`.
   - Ensure `hourCount` is enforced on all code paths.

8. Add unit tests & CI
   - Jest tests for `updateStreak`, `performCheckIn`, `calculateHoursBetween`.
   - GitHub Action for running tests and lint on PR.

9. Load-only-once & memoize
   - Memoize results in `loadData`.
   - Prevent redundant loads on screen mount.

10. Document & validate assumptions
    - Replace magic numbers (e.g., 48-hour rule) with named constants.
    - Add JSDoc for all edge-case handling.

## Next Steps (Executable)
1. Create this `CODE_REVIEW.md` file at the repo root.
2. Introduce a `useReducer` for `userProgress`.
3. Split out `useStreakContext` from `GamificationContext.tsx`.
4. Remove all but one `setUserProgress` in `setStreak`, collapse storage writes.
5. Delete AppState/interval effects in `StreakCard` (already done).
6. Add Jest & tests for `simulateTimePassed` + `calculateHoursBetween`. 