// User level and points
export interface UserProgress {
  streak: number;
  lastCheckIn: number;
  level: number;
  points: number;
  badgesEarned: string[];
  challengesCompleted: string[];
  challengesActive: string[];
  companionId?: string; // ID of the selected companion
}

// Journal entry
export interface JournalEntry {
  id: string;
  content: string;
  timestamp: number;
  mood?: string;
  tags?: string[];
}

// Challenge
export interface ChallengeStep {
  id: string;
  description: string;
  completed: boolean;
}

export interface ChallengeRewards {
  badgeId?: string;
  badgeName?: string;
  pointBonus?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  isDaily: boolean;
  points: number;
  steps?: ChallengeStep[];
  progress: number;
  rewards?: ChallengeRewards;
}

// Achievement/Badge
export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  unlockCriteria: string;
  unlocked: boolean;
  unlockedDate?: number;
  icon?: string;
}

// App settings
export interface AppSettings {
  darkMode: boolean;
  notificationsEnabled: boolean;
  privacyModeEnabled: boolean;
  encryptionEnabled: boolean;
}

// Level requirements
export interface LevelRequirement {
  level: number;
  pointsRequired: number;
}