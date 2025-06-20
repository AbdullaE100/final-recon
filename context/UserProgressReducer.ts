import { UserProgress, Achievement } from '@/types/gamification';
import { storeData, STORAGE_KEYS } from '@/utils/storage';
import { updateWidgetStreakData } from '@/utils/streakService';
import { Platform } from 'react-native';

// Action Types
export enum UserProgressActionType {
  SET_STREAK = 'SET_STREAK',
  CHECK_IN = 'CHECK_IN',
  ADD_POINTS = 'ADD_POINTS',
  UNLOCK_ACHIEVEMENT = 'UNLOCK_ACHIEVEMENT',
  SET_COMPANION = 'SET_COMPANION',
  LOAD_DATA = 'LOAD_DATA',
  RESET_DATA = 'RESET_DATA',
}

// Action Interfaces
interface SetStreakAction {
  type: UserProgressActionType.SET_STREAK;
  payload: {
    streak: number;
    startDate?: number;
  };
}

interface CheckInAction {
  type: UserProgressActionType.CHECK_IN;
}

interface AddPointsAction {
  type: UserProgressActionType.ADD_POINTS;
  payload: {
    points: number;
  };
}

interface UnlockAchievementAction {
  type: UserProgressActionType.UNLOCK_ACHIEVEMENT;
  payload: {
    achievement: Achievement;
  };
}

interface SetCompanionAction {
  type: UserProgressActionType.SET_COMPANION;
  payload: {
    companionId: string;
  };
}

interface LoadDataAction {
  type: UserProgressActionType.LOAD_DATA;
  payload: UserProgress;
}

interface ResetDataAction {
  type: UserProgressActionType.RESET_DATA;
}

// Union type of all actions
export type UserProgressAction = 
  | SetStreakAction
  | CheckInAction
  | AddPointsAction
  | UnlockAchievementAction
  | SetCompanionAction
  | LoadDataAction
  | ResetDataAction;

// Helper function to batch storage updates
export const batchedStorageUpdate = async (data: UserProgress): Promise<void> => {
  try {
    await storeData(STORAGE_KEYS.USER_DATA, data);
    
    // Also update widget if on iOS
    if (Platform.OS === 'ios') {
      await updateWidgetStreakData(
        data.streak, 
        data.lastCheckIn || Date.now(), 
        data.lastCheckIn || Date.now()
      );
    }
  } catch (error) {
    console.error('Failed to update storage:', error);
  }
};

// The reducer function
export const userProgressReducer = (
  state: UserProgress, 
  action: UserProgressAction
): UserProgress => {
  switch (action.type) {
    case UserProgressActionType.SET_STREAK: {
      const { streak, startDate } = action.payload;
      const validatedStreak = Number(streak);
      
      if (isNaN(validatedStreak)) {
        return state;
      }
      
      const newState = {
        ...state,
        streak: validatedStreak,
        lastCheckIn: Date.now(),
      };
      
      // Schedule storage update
      batchedStorageUpdate(newState);
      
      return newState;
    }
    
    case UserProgressActionType.CHECK_IN: {
      const newState = {
        ...state,
        streak: state.streak + 1,
        lastCheckIn: Date.now(),
        dailyCheckedIn: true,
      };
      
      // Schedule storage update
      batchedStorageUpdate(newState);
      
      return newState;
    }
    
    case UserProgressActionType.ADD_POINTS: {
      const { points } = action.payload;
      const newPoints = state.points + points;
      
      // Calculate new level based on total points
      const newLevel = Math.floor(Math.sqrt(newPoints / 100)) + 1;
      
      const newState = {
        ...state,
        points: newPoints,
        level: newLevel,
      };
      
      // Schedule storage update
      batchedStorageUpdate(newState);
      
      return newState;
    }
    
    case UserProgressActionType.UNLOCK_ACHIEVEMENT: {
      const { achievement } = action.payload;
      
      // Check if achievement is already unlocked
      const existingIndex = state.achievements.findIndex(a => a.id === achievement.id);
      if (existingIndex >= 0 && state.achievements[existingIndex].unlocked) {
        return state; // Already unlocked
      }
      
      // Update or add the achievement
      const updatedAchievements = [...state.achievements];
      if (existingIndex >= 0) {
        updatedAchievements[existingIndex] = {
          ...updatedAchievements[existingIndex],
          unlocked: true,
          unlockedDate: Date.now(),
        };
      } else {
        updatedAchievements.push({
          ...achievement,
          unlocked: true,
          unlockedDate: Date.now(),
        });
      }
      
      // Update badgesEarned array
      const updatedBadgesEarned = [...state.badgesEarned, achievement.id];
      
      const newState = {
        ...state,
        achievements: updatedAchievements,
        badgesEarned: updatedBadgesEarned,
      };
      
      // Schedule storage update
      batchedStorageUpdate(newState);
      
      return newState;
    }
    
    case UserProgressActionType.SET_COMPANION: {
      const { companionId } = action.payload;
      
      const newState = {
        ...state,
        companionId,
      };
      
      // Schedule storage update
      batchedStorageUpdate(newState);
      
      return newState;
    }
    
    case UserProgressActionType.LOAD_DATA: {
      return action.payload;
    }
    
    case UserProgressActionType.RESET_DATA: {
      // Default state would be defined in the context
      const defaultState: UserProgress = {
        streak: 0,
        level: 1,
        points: 0,
        lastCheckIn: 0,
        dailyCheckedIn: false,
        badgesEarned: [],
        challengesCompleted: [],
        challengesActive: [],
        achievements: [],
      };
      
      // Schedule storage update
      batchedStorageUpdate(defaultState);
      
      return defaultState;
    }
    
    default:
      return state;
  }
}; 