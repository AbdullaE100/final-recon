import { UserCompanion } from './companion';

// User level and points
export interface UserProgress {
  streak: number;
  lastCheckIn: number | null;
  level: number;
  points: number;
  totalPoints: number;
  journalEntries: JournalEntry[];
  activeChallenges: Challenge[];
  availableChallenges: Challenge[];
  completedChallenges: Challenge[];
  badgesEarned: string[];
  challengesCompleted: string[];
  challengesActive: string[];
  companionId?: string; // ID of the selected companion
  achievements: Achievement[]; // Array of achievements/badges
  dailyCheckedIn: boolean;
  meditationSessions?: number; // Total number of meditation sessions completed
  meditationStreak?: number; // Current consecutive days of meditation
  lastMeditationDate?: number; // Timestamp of last meditation session
  totalMeditationMinutes?: number; // Total minutes of meditation
  startDate?: number;
  companion?: UserCompanion | null;
  activityStats?: ActivityStats;
}

// Journal entry
export interface JournalEntry {
  id: string;
  timestamp: number;
  content: string;
  mood?: string;
  tags?: string[];
  audioUri?: string;
  prompt?: string;
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
  type: 'meditation' | 'workout' | 'habit' | 'journal_streak' | 'habit_replacement';
  startDate?: number;
  endDate?: number;
  completed?: boolean;
  lastContributionDate?: number;
  lastUpdated?: string;
  activities?: { timestamp: string; note: string }[];
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

export type ActivityType = 'meditation' | 'workout' | 'habit_replacement' | 'reading' | 'challenge';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  timestamp: number;
  duration?: number; // for meditation and workout
  description?: string; // for habit replacement
}

export interface ActivityStats {
  totalMeditationMinutes: number;
  totalWorkoutMinutes: number;
  totalHabitReplacements: number;
  meditationStreak: number;
  workoutStreak: number;
  lastMeditation?: number;
  lastWorkout?: number;
  lastHabitReplacement?: number;
  activityLogs: ActivityLog[];
  totalReadingMinutes: number;
  readingStreak: number;
  lastReading?: number;
}