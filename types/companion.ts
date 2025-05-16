export type CompanionType = 'fire' | 'water' | 'plant';

// XP thresholds for evolution
export const EVOLUTION_THRESHOLDS = {
  STAGE_2: 500,
  STAGE_3: 1500
};

// Bond level thresholds
export const BOND_THRESHOLDS = {
  LEVEL_2: 25,
  LEVEL_3: 75
};

export interface CompanionEvolution {
  level: number;
  name: string;
  xpRequired: number;
  bondRequired: number;
}

export interface Companion {
  id: string;
  type: CompanionType;
  name: string;
  description: string;
  currentLevel: number;
  experience: number;
  nextLevelExperience: number;
  evolutions: CompanionEvolution[];
}

export interface FeedingAction {
  timestamp: number;
  amount: number;
}

export interface UserCompanion extends Companion {
  lastInteraction: number; // timestamp
  lastCheckIn: number; // timestamp for daily check-in
  happinessLevel: number; // 0-100
  isEvolutionReady: boolean;
  bondLevel: number; // 0-100, increases with feeding
  feedingHistory: FeedingAction[];
  unlockedSnacks: number; // snacks available to feed
}

// Types of actions that can earn XP
export enum XpActionType {
  DAILY_CHECK_IN = 'DAILY_CHECK_IN',
  REFLECTION_ENTRY = 'REFLECTION_ENTRY',
  URGE_LOG = 'URGE_LOG',
  CHALLENGE_COMPLETION = 'CHALLENGE_COMPLETION',
  FEEDING = 'FEEDING',
  LATE_NIGHT_VICTORY = 'LATE_NIGHT_VICTORY',
} 