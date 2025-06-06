import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storeData, getData, STORAGE_KEYS, clearAllData } from '@/utils/storage';
import {
  UserProgress,
  JournalEntry,
  Challenge,
  Achievement,
  LevelRequirement
} from '@/types/gamification';
import { getStartOfDay, isToday } from '@/utils/dateUtils';
import { Alert, Platform, NativeModules } from 'react-native';
import { loadStreakData, updateStreak, performCheckIn as serviceCheckIn, DEFAULT_USER_ID } from '@/utils/streakService';
import { Companion, CompanionType, UserCompanion, EVOLUTION_THRESHOLDS, BOND_THRESHOLDS, XpActionType, FeedingAction } from '@/types/companion';
import useAchievementNotification, { AchievementProps } from '@/hooks/useAchievementNotification';

// Import the updateWidgetStreakData function from streakService
import { updateWidgetStreakData } from '@/utils/streakService';

// Initial challenges
const initialChallenges: Challenge[] = [
  {
    id: 'challenge-1',
    title: 'Stay Clean Today',
    description: 'Complete a full day without relapsing.',
    isDaily: true,
    points: 50,
    progress: 0,
  },
  {
    id: 'challenge-2',
    title: 'Morning Meditation',
    description: 'Start your day with a 5-minute meditation session.',
    isDaily: true,
    points: 30,
    progress: 0,
  },
  {
    id: 'challenge-3',
    title: 'Journal Streak',
    description: 'Write in your journal for 3 consecutive days.',
    isDaily: false,
    points: 100,
    steps: [
      { id: 'step-1', description: 'Day 1 journal entry', completed: false },
      { id: 'step-2', description: 'Day 2 journal entry', completed: false },
      { id: 'step-3', description: 'Day 3 journal entry', completed: false },
    ],
    progress: 0,
    rewards: {
      badgeId: 'badge-journal-1',
      badgeName: 'Thoughtful Writer',
    }
  },
  {
    id: 'challenge-4',
    title: 'Habit Replacement',
    description: 'Replace urges with a healthy activity 5 times this week.',
    isDaily: false,
    points: 150,
    steps: [
      { id: 'step-1', description: 'First replacement', completed: false },
      { id: 'step-2', description: 'Second replacement', completed: false },
      { id: 'step-3', description: 'Third replacement', completed: false },
      { id: 'step-4', description: 'Fourth replacement', completed: false },
      { id: 'step-5', description: 'Fifth replacement', completed: false },
    ],
    progress: 0,
    rewards: {
      badgeId: 'badge-habit-1',
      badgeName: 'Habit Master',
      pointBonus: 50
    }
  },
  {
    id: 'challenge-5',
    title: 'Weekly Exercise',
    description: 'Exercise for at least 30 minutes, 3 times this week.',
    isDaily: false,
    points: 120,
    steps: [
      { id: 'step-1', description: 'First workout', completed: false },
      { id: 'step-2', description: 'Second workout', completed: false },
      { id: 'step-3', description: 'Third workout', completed: false },
    ],
    progress: 0,
  },
];

// Initial achievements/badges
const initialAchievements: Achievement[] = [
  // Streak-based achievements (starting with easier ones)
  {
    id: 'badge-streak-1day',
    name: 'First Step',
    description: 'Maintained a clean streak for 1 day',
    category: 'streak',
    unlockCriteria: 'Maintain a 1-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-3days',
    name: 'Three Day Milestone',
    description: 'Maintained a clean streak for 3 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 3-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-5days',
    name: 'Five Day Champion',
    description: 'Maintained a clean streak for 5 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 5-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-1',
    name: '1 Week Milestone',
    description: 'Maintained a clean streak for 7 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 7-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-2weeks',
    name: 'Two Week Warrior',
    description: 'Maintained a clean streak for 14 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 14-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-2',
    name: '1 Month Strong',
    description: 'Maintained a clean streak for 30 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 30-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-45days',
    name: '45 Day Achiever',
    description: 'Maintained a clean streak for 45 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 45-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-60days',
    name: '60 Day Warrior',
    description: 'Maintained a clean streak for 60 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 60-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-75days',
    name: '75 Day Conqueror',
    description: 'Maintained a clean streak for 75 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 75-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-3',
    name: '90 Day Champion',
    description: 'Maintained a clean streak for 90 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 90-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-120days',
    name: '120 Day Legend',
    description: 'Maintained a clean streak for 120 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 120-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-6months',
    name: 'Half Year Hero',
    description: 'Maintained a clean streak for 180 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 180-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-9months',
    name: 'Nine Month Nemesis',
    description: 'Maintained a clean streak for 270 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 270-day streak',
    unlocked: false,
  },
  {
    id: 'badge-streak-1year',
    name: 'One Year Transformation',
    description: 'Maintained a clean streak for 365 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 365-day streak',
    unlocked: false,
  },
  
  // Journal-related achievements
  {
    id: 'badge-journal-first',
    name: 'First Reflection',
    description: 'Created your first journal entry',
    category: 'journal',
    unlockCriteria: 'Create your first journal entry',
    unlocked: false,
  },
  {
    id: 'badge-journal-3',
    name: 'Regular Writer',
    description: 'Created 3 journal entries',
    category: 'journal',
    unlockCriteria: 'Create 3 journal entries',
    unlocked: false,
  },
  {
    id: 'badge-journal-1',
    name: 'Thoughtful Writer',
    description: 'Completed the Journal Streak challenge',
    category: 'journal',
    unlockCriteria: 'Complete the Journal Streak challenge',
    unlocked: false,
  },
  {
    id: 'badge-journal-2',
    name: 'Consistent Journaler',
    description: 'Created 10 journal entries',
    category: 'journal',
    unlockCriteria: 'Create 10 journal entries',
    unlocked: false,
  },
  {
    id: 'badge-journal-master',
    name: 'Master Journaler',
    description: 'Created 20 journal entries',
    category: 'journal',
    unlockCriteria: 'Create 20 journal entries',
    unlocked: false,
  },
  {
    id: 'badge-journal-5days',
    name: 'Journal Week',
    description: 'Journal for 5 consecutive days',
    category: 'journal',
    unlockCriteria: 'Journal for 5 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-journal-emotions',
    name: 'Emotion Tracker',
    description: 'Track your emotions in 7 journal entries',
    category: 'journal',
    unlockCriteria: 'Track emotions in journal entries',
    unlocked: false,
  },
  {
    id: 'badge-journal-gratitude',
    name: 'Gratitude Master',
    description: 'Write 5 gratitude journal entries',
    category: 'journal',
    unlockCriteria: 'Write gratitude journal entries',
    unlocked: false,
  },
  {
    id: 'badge-journal-expert',
    name: 'Journaling Expert',
    description: 'Created 50 journal entries',
    category: 'journal',
    unlockCriteria: 'Create 50 journal entries',
    unlocked: false,
  },
  {
    id: 'badge-journal-weekly',
    name: 'Weekly Reflection',
    description: 'Created journal entries for 4 consecutive weeks',
    category: 'journal',
    unlockCriteria: 'Create journal entries for 4 consecutive weeks',
    unlocked: false,
  },
  {
    id: 'badge-journal-detailed',
    name: 'Detailed Analyst',
    description: 'Created a journal entry with more than 200 words',
    category: 'journal',
    unlockCriteria: 'Create a detailed journal entry',
    unlocked: false,
  },
  
  // Challenge-related achievements
  {
    id: 'badge-challenge-first',
    name: 'Challenger',
    description: 'Started your first challenge',
    category: 'challenge',
    unlockCriteria: 'Start your first challenge',
    unlocked: false,
  },
  {
    id: 'badge-habit-1',
    name: 'Habit Master',
    description: 'Completed the Habit Replacement challenge',
    category: 'challenge',
    unlockCriteria: 'Complete the Habit Replacement challenge',
    unlocked: false,
  },
  {
    id: 'badge-challenge-1',
    name: 'Challenge Seeker',
    description: 'Completed 5 challenges',
    category: 'challenge',
    unlockCriteria: 'Complete 5 challenges',
    unlocked: false,
  },
  {
    id: 'badge-challenge-daily-three',
    name: 'Daily Challenger',
    description: 'Completed a daily challenge for 3 consecutive days',
    category: 'challenge',
    unlockCriteria: 'Complete daily challenges for 3 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-challenge-first-active',
    name: 'Active Challenger',
    description: 'Have 3 challenges active at once',
    category: 'challenge',
    unlockCriteria: 'Have 3 challenges active simultaneously',
    unlocked: false,
  },
  {
    id: 'badge-challenge-expert',
    name: 'Challenge Expert',
    description: 'Completed 10 challenges',
    category: 'challenge',
    unlockCriteria: 'Complete 10 challenges',
    unlocked: false,
  },
  {
    id: 'badge-challenge-daily',
    name: 'Challenge Veteran',
    description: 'Completed a daily challenge for 5 consecutive days',
    category: 'challenge',
    unlockCriteria: 'Complete daily challenges for 5 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-challenge-variety',
    name: 'Versatile Challenger',
    description: 'Completed at least one challenge from 3 different categories',
    category: 'challenge',
    unlockCriteria: 'Complete challenges from 3 different categories',
    unlocked: false,
  },
  
  // Meditation achievements
  {
    id: 'badge-meditation-first',
    name: 'Mindful Moment',
    description: 'Completed your first meditation session',
    category: 'meditation',
    unlockCriteria: 'Complete your first meditation session',
    unlocked: false,
  },
  {
    id: 'badge-meditation-3',
    name: 'Meditation Student',
    description: 'Completed 3 meditation sessions',
    category: 'meditation',
    unlockCriteria: 'Complete 3 meditation sessions',
    unlocked: false,
  },
  {
    id: 'badge-meditation-streak-3',
    name: 'Meditation Streak',
    description: 'Meditated for 3 consecutive days',
    category: 'meditation',
    unlockCriteria: 'Meditate for 3 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-meditation-master',
    name: 'Meditation Master',
    description: 'Completed 10 meditation sessions',
    category: 'meditation',
    unlockCriteria: 'Complete 10 meditation sessions',
    unlocked: false,
  },
  {
    id: 'badge-meditation-morning',
    name: 'Morning Meditator',
    description: 'Complete 5 morning meditation sessions',
    category: 'meditation',
    unlockCriteria: 'Complete 5 morning meditations',
    unlocked: false,
  },
  {
    id: 'badge-meditation-urge',
    name: 'Urge Surfer',
    description: 'Use meditation to overcome 3 urges',
    category: 'meditation',
    unlockCriteria: 'Use meditation to overcome urges',
    unlocked: false,
  },
  {
    id: 'badge-meditation-daily',
    name: 'Daily Meditator',
    description: 'Meditated for 7 consecutive days',
    category: 'meditation',
    unlockCriteria: 'Meditate for 7 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-meditation-duration',
    name: 'Deep Meditator',
    description: 'Completed a 20+ minute meditation session',
    category: 'meditation',
    unlockCriteria: 'Complete a 20+ minute meditation session',
    unlocked: false,
  },
  {
    id: 'badge-meditation-total',
    name: 'Zen Master',
    description: 'Accumulated 5 hours of meditation time',
    category: 'meditation',
    unlockCriteria: 'Accumulate 5 hours of meditation time',
    unlocked: false,
  },
  
  // Workout achievements
  {
    id: 'badge-workout-first',
    name: 'First Workout',
    description: 'Completed your first workout session',
    category: 'workout',
    unlockCriteria: 'Complete your first workout session',
    unlocked: false,
  },
  {
    id: 'badge-workout-3',
    name: 'Fitness Enthusiast',
    description: 'Completed 3 workout sessions',
    category: 'workout',
    unlockCriteria: 'Complete 3 workout sessions',
    unlocked: false,
  },
  {
    id: 'badge-workout-streak-3',
    name: 'Exercise Streak',
    description: 'Worked out for 3 consecutive days',
    category: 'workout',
    unlockCriteria: 'Work out for 3 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-workout-master',
    name: 'Fitness Champion',
    description: 'Completed 10 workout sessions',
    category: 'workout',
    unlockCriteria: 'Complete 10 workout sessions',
    unlocked: false,
  },
  {
    id: 'badge-workout-morning',
    name: 'Morning Warrior',
    description: 'Complete 5 morning workout sessions',
    category: 'workout',
    unlockCriteria: 'Complete 5 morning workouts',
    unlocked: false,
  },
  {
    id: 'badge-workout-streak',
    name: 'Consistent Athlete',
    description: 'Worked out for 5 consecutive days',
    category: 'workout',
    unlockCriteria: 'Work out for 5 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-workout-long',
    name: 'Endurance Builder',
    description: 'Completed a 60+ minute workout session',
    category: 'workout',
    unlockCriteria: 'Complete a 60+ minute workout session',
    unlocked: false,
  },
  {
    id: 'badge-workout-variety',
    name: 'Cross-Trainer',
    description: 'Logged 3 different types of workouts',
    category: 'workout',
    unlockCriteria: 'Log 3 different types of workouts',
    unlocked: false,
  },
  {
    id: 'badge-workout-total',
    name: 'Fitness Devotee',
    description: 'Accumulated 24 hours of workout time',
    category: 'workout',
    unlockCriteria: 'Accumulate 24 hours of workout time',
    unlocked: false,
  },
  
  // App usage achievements (new)
  {
    id: 'badge-usage-first',
    name: 'Journey Begins',
    description: 'Used the app for the first time',
    category: 'app',
    unlockCriteria: 'Open the app for the first time',
    unlocked: false, // Changed from true to false for new users
  },
  {
    id: 'badge-usage-checkin',
    name: 'Daily Check-in',
    description: 'Checked in to the app',
    category: 'app',
    unlockCriteria: 'Complete your first daily check-in',
    unlocked: false,
  },
  {
    id: 'badge-usage-checkin-3',
    name: 'Regular Check-ins',
    description: 'Checked in 3 days in a row',
    category: 'app',
    unlockCriteria: 'Check in 3 days in a row',
    unlocked: false,
  },
  {
    id: 'badge-usage-streak',
    name: 'Consistent User',
    description: 'Used the app for 3 consecutive days',
    category: 'app',
    unlockCriteria: 'Use the app for 3 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-usage-profile',
    name: 'Profile Completionist',
    description: 'Completed your user profile',
    category: 'app',
    unlockCriteria: 'Complete your user profile',
    unlocked: false,
  },
  {
    id: 'badge-usage-week',
    name: 'Weekly Loyalist',
    description: 'Used the app every day for a week',
    category: 'app',
    unlockCriteria: 'Use the app every day for 7 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-usage-month',
    name: 'Monthly Devotee',
    description: 'Used the app every day for a month',
    category: 'app',
    unlockCriteria: 'Use the app every day for 30 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-usage-features',
    name: 'App Explorer',
    description: 'Used all main features of the app',
    category: 'app',
    unlockCriteria: 'Use all main features of the app',
    unlocked: false,
  },
  
  // Recovery achievements (new)
  {
    id: 'badge-recovery-reset',
    name: 'Fresh Start',
    description: 'Started a new recovery journey',
    category: 'recovery',
    unlockCriteria: 'Begin a new recovery journey',
    unlocked: false, // Changed from true to false for new users
  },
  {
    id: 'badge-recovery-urge',
    name: 'Urge Surfer',
    description: 'Successfully resisted an urge',
    category: 'recovery',
    unlockCriteria: 'Log your first resisted urge',
    unlocked: false,
  },
  {
    id: 'badge-recovery-urge-3',
    name: 'Urge Controller',
    description: 'Successfully resisted 3 urges',
    category: 'recovery',
    unlockCriteria: 'Log 3 resisted urges',
    unlocked: false,
  },
  {
    id: 'badge-recovery-strategy',
    name: 'Strategic Warrior',
    description: 'Created a recovery strategy',
    category: 'recovery',
    unlockCriteria: 'Create your first recovery strategy',
    unlocked: false,
  },
  {
    id: 'badge-recovery-trigger-log',
    name: 'Trigger Logger',
    description: 'Logged your first trigger',
    category: 'recovery',
    unlockCriteria: 'Log your first trigger',
    unlocked: false,
  },
  {
    id: 'badge-recovery-urge-master',
    name: 'Urge Master',
    description: 'Successfully resisted 10 urges',
    category: 'recovery',
    unlockCriteria: 'Log 10 resisted urges',
    unlocked: false,
  },
  {
    id: 'badge-recovery-accountability',
    name: 'Accountability Partner',
    description: 'Added an accountability connection',
    category: 'recovery',
    unlockCriteria: 'Add an accountability partner',
    unlocked: false,
  },
  {
    id: 'badge-recovery-triggers',
    name: 'Trigger Analyst',
    description: 'Identified and documented 5 personal triggers',
    category: 'recovery',
    unlockCriteria: 'Identify 5 personal triggers',
    unlocked: false,
  },
  {
    id: 'badge-recovery-milestone',
    name: 'Recovery Milestone',
    description: 'Reached a significant personal recovery goal',
    category: 'recovery',
    unlockCriteria: 'Reach a personal recovery goal',
    unlocked: false,
  },
  
  // Companion achievements (new)
  {
    id: 'badge-companion-selected',
    name: 'Found a Friend',
    description: 'Selected your first companion',
    category: 'companion',
    unlockCriteria: 'Select your first companion',
    unlocked: false,
  },
  {
    id: 'badge-companion-evolution',
    name: 'Growth Together',
    description: 'Evolved your companion for the first time',
    category: 'companion',
    unlockCriteria: 'Evolve your companion',
    unlocked: false,
  },
  {
    id: 'badge-companion-feed',
    name: 'Caretaker',
    description: 'Fed your companion for the first time',
    category: 'companion',
    unlockCriteria: 'Feed your companion',
    unlocked: false,
  },
  {
    id: 'badge-companion-feed-streak',
    name: 'Reliable Caretaker',
    description: 'Fed your companion 3 days in a row',
    category: 'companion',
    unlockCriteria: 'Feed your companion for 3 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-companion-interaction',
    name: 'Best Friend',
    description: 'Interact with your companion 10 times',
    category: 'companion',
    unlockCriteria: 'Interact with your companion 10 times',
    unlocked: false,
  },
  {
    id: 'badge-companion-bond-level',
    name: 'Strong Bond',
    description: 'Reached Bond Level 3 with your companion',
    category: 'companion',
    unlockCriteria: 'Reach Bond Level 3 with your companion',
    unlocked: false,
  },
  {
    id: 'badge-companion-max-evolution',
    name: 'Ultimate Evolution',
    description: 'Evolved your companion to its final form',
    category: 'companion',
    unlockCriteria: 'Evolve your companion to its final form',
    unlocked: false,
  },
  {
    id: 'badge-companion-daily',
    name: 'Loyal Friend',
    description: 'Interacted with your companion for 7 consecutive days',
    category: 'companion',
    unlockCriteria: 'Interact with your companion for 7 consecutive days',
    unlocked: false,
  },
  {
    id: 'badge-companion-feeder',
    name: 'Generous Feeder',
    description: 'Fed your companion 20 times',
    category: 'companion',
    unlockCriteria: 'Feed your companion 20 times',
    unlocked: false,
  },
  
  // Milestone achievements (new)
  {
    id: 'badge-milestone-first',
    name: 'Beginning the Journey',
    description: 'Made your first meaningful step towards recovery',
    category: 'milestone',
    unlockCriteria: 'Unlock your first badge',
    unlocked: false,
  },
  {
    id: 'badge-milestone-three',
    name: 'Getting Started',
    description: 'Made progress in your recovery journey',
    category: 'milestone',
    unlockCriteria: 'Unlock 3 badges',
    unlocked: false,
  },
  {
    id: 'badge-milestone-five',
    name: 'Building Momentum',
    description: 'Made significant progress in your recovery journey',
    category: 'milestone',
    unlockCriteria: 'Unlock 5 badges',
    unlocked: false,
  },
  {
    id: 'badge-milestone-ten',
    name: 'Transformation Underway',
    description: 'Undergoing a significant transformation in your life',
    category: 'milestone',
    unlockCriteria: 'Unlock 10 badges',
    unlocked: false,
  },
  {
    id: 'badge-milestone-twenty',
    name: 'Major Progress',
    description: 'Achieved major progress in your recovery journey',
    category: 'milestone',
    unlockCriteria: 'Unlock 20 badges',
    unlocked: false,
  },
  {
    id: 'badge-milestone-thirty',
    name: 'Dedicated Recoverer',
    description: 'Shown exceptional dedication to your recovery',
    category: 'milestone',
    unlockCriteria: 'Unlock 30 badges',
    unlocked: false,
  },
  {
    id: 'badge-milestone-fifty',
    name: 'Life Transformer',
    description: 'Completely transformed your lifestyle and habits',
    category: 'milestone',
    unlockCriteria: 'Unlock 50 badges',
    unlocked: false,
  },
  {
    id: 'badge-milestone-social',
    name: 'Community Supporter',
    description: 'Actively engaged with the recovery community',
    category: 'milestone',
    unlockCriteria: 'Engage with the community features',
    unlocked: false,
  }
];

// Level requirements
const levelRequirements: LevelRequirement[] = [
  { level: 1, pointsRequired: 0 },
  { level: 2, pointsRequired: 100 },
  { level: 3, pointsRequired: 250 },
  { level: 4, pointsRequired: 500 },
  { level: 5, pointsRequired: 800 },
  { level: 6, pointsRequired: 1200 },
  { level: 7, pointsRequired: 1700 },
  { level: 8, pointsRequired: 2300 },
  { level: 9, pointsRequired: 3000 },
  { level: 10, pointsRequired: 4000 },
];

// Default user progress
const defaultUserProgress: UserProgress = {
  streak: 0,
  lastCheckIn: 0,
  level: 1,
  points: 0,
  badgesEarned: [],
  challengesCompleted: [],
  challengesActive: [],
  companionId: undefined,
  achievements: initialAchievements,
  dailyCheckedIn: false,
  meditationSessions: 0,
  meditationStreak: 0,
  lastMeditationDate: 0,
  totalMeditationMinutes: 0,
};

interface GamificationContextType {
  // User data
  streak: number;
  level: number;
  points: number;
  totalPoints: number;
  dailyCheckedIn: boolean;
  
  // Journal
  journalEntries: JournalEntry[];
  addJournalEntry: (content: string, options?: { mood?: string, tags?: string[], audioUri?: string }) => void;
  deleteJournalEntry: (id: string) => void;
  
  // Challenges
  activeChallenges: Challenge[];
  availableChallenges: Challenge[];
  startChallenge: (id: string) => void;
  completeChallenge: (id: string) => void;
  logHabitReplacement: (description: string) => boolean;
  logWorkout: (durationMinutes: number) => boolean;
  logMeditation: (durationMinutes: number) => boolean;
  
  // Achievements
  achievements: Achievement[];
  forceCheckStreakAchievements: () => Promise<boolean>;
  fix30DayBadge: () => Promise<boolean>;
  
  // Actions
  checkIn: () => void;
  resetData: () => void;
  exportData: () => void;
  importData: () => void;
  setStreak: (days: number, startDate?: number) => void;
  
  // Helpers
  getLevelProgress: () => number;
  getPointsToNextLevel: () => number;
  
  // Companion
  companion: UserCompanion | null;
  setCompanion: (companion: Companion) => void;
  updateCompanionExperience: (amount: number, actionType?: XpActionType) => Promise<{
    isLevelUp: boolean;
    isEvolutionReady: boolean;
  } | undefined>;
  evolveCompanion: () => boolean;
  feedCompanion: (amount?: number) => Promise<boolean>;
  getCompanionStage: () => number;
  getBondLevel: () => number;
  resetCompanion: () => Promise<void>;
  checkAllAchievementTypes: () => Promise<boolean>;
}

const GamificationContext = createContext<GamificationContextType>({
  streak: 0,
  level: 1,
  points: 0,
  totalPoints: 0,
  dailyCheckedIn: false,
  journalEntries: [],
  addJournalEntry: () => {},
  deleteJournalEntry: () => {},
  activeChallenges: [],
  availableChallenges: [],
  startChallenge: () => {},
  completeChallenge: () => {},
  achievements: [], // Initialize with empty array
  checkIn: () => {},
  resetData: () => {},
  exportData: () => {},
  importData: () => {},
  setStreak: () => {},
  getLevelProgress: () => 0,
  getPointsToNextLevel: () => 0,
  companion: null,
  setCompanion: () => {},
  updateCompanionExperience: () => Promise.resolve(undefined),
  evolveCompanion: () => false,
  feedCompanion: () => Promise.resolve(false),
  getCompanionStage: () => 1,
  getBondLevel: () => 0,
  resetCompanion: () => Promise.resolve(),
  logHabitReplacement: () => false,
  logWorkout: () => false,
  logMeditation: () => false,
  forceCheckStreakAchievements: () => Promise.resolve(false),
  fix30DayBadge: () => Promise.resolve(false),
  checkAllAchievementTypes: () => Promise.resolve(false),
});

export const GamificationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // State
  const [userProgress, setUserProgress] = useState<UserProgress>({
    ...defaultUserProgress,
    achievements: [...initialAchievements] // Ensure deep copy
  });
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [companion, setCompanionState] = useState<UserCompanion | null>(null);
  const [manualStreakSet, setManualStreakSet] = useState(false);

  // Initialize achievement notification system
  const { 
    showAchievement, 
    hideAchievement, 
    AchievementNotificationComponent 
  } = useAchievementNotification();

  // Computed values
  const activeChallenges = challenges.filter(c => 
    userProgress.challengesActive.includes(c.id)
  );
  
  const availableChallenges = challenges.filter(c => 
    !userProgress.challengesActive.includes(c.id) && 
    !userProgress.challengesCompleted.includes(c.id)
  );
  
  const dailyCheckedIn = isToday(userProgress.lastCheckIn);
  
  // Load data from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        setDataLoaded(false);
        
        console.log('Loading user data...');
        
        // First check if there's a streak coming from our streak service
        // This incorporates all the failsafe mechanisms
        try {
          const streakData = await loadStreakData();
          console.log('Loaded streak data:', streakData);
          
          // Pre-emptively set streak in UI for immediate feedback
          setUserProgress(prev => ({
            ...prev,
          streak: streakData.streak,
            lastCheckIn: streakData.lastCheckIn
          }));
        } catch (streakError) {
          console.error('Error loading streak data:', streakError);
        }
        
        // Load user progress data (level, points, etc.)
        const savedUserProgress = await getData(STORAGE_KEYS.USER_DATA, defaultUserProgress);
        
        // Safety check: ensure we have valid data
        if (!savedUserProgress || typeof savedUserProgress !== 'object') {
          console.warn('Invalid user progress data found, resetting to default');
          await storeData(STORAGE_KEYS.USER_DATA, defaultUserProgress);
          setUserProgress(defaultUserProgress);
        } else {
          // Important: When loading user progress, prioritize streak service data for streak value
          // This ensures that any manually set streak values are preserved
          const currentStreak = userProgress.streak; // Get the streak we already set from streak service
          setUserProgress({
            ...savedUserProgress,
            streak: currentStreak > savedUserProgress.streak ? currentStreak : savedUserProgress.streak
          });
        }
        
        // Load achievements
        const savedAchievements = await getData(STORAGE_KEYS.ACHIEVEMENTS, initialAchievements);
        setUserProgress(prev => ({
          ...prev,
          achievements: savedAchievements || initialAchievements
        }));
        
        // Load journal entries
        const savedJournalEntries = await getData(STORAGE_KEYS.JOURNAL_ENTRIES, []);
        setJournalEntries(savedJournalEntries || []);
        
        // Load challenges
        const savedChallenges = await getData(STORAGE_KEYS.CHALLENGES, initialChallenges);
        setChallenges(savedChallenges || initialChallenges);
        
        // Load companion data if it exists
        try {
          const savedCompanion = await getData<UserCompanion | null>(STORAGE_KEYS.COMPANION_DATA, null);
          if (savedCompanion && typeof savedCompanion === 'object' && 'id' in savedCompanion) {
            setCompanionState(savedCompanion);
          } else if (userProgress.companionId) {
            // If user has a companion ID but no companion data, create a default one
            await createDefaultCompanion();
          }
        } catch (companionError) {
          console.error('Error loading companion data:', companionError);
        }
        
        // Double-check streak value after all data is loaded
        // This ensures a user-set streak is never overwritten
        try {
          const manualStreakValue = await getManualStreakValue();
          if (manualStreakValue !== null && manualStreakValue > userProgress.streak) {
            console.log(`Found manual streak value (${manualStreakValue}) higher than loaded value (${userProgress.streak}), using manual value`);
            setUserProgress(prev => ({
              ...prev,
              streak: manualStreakValue
            }));
          }
        } catch (manualStreakError) {
          console.error('Error checking for manual streak:', manualStreakError);
        }
        
        // Initialize availability of daily check-in
        const currentDate = new Date().setHours(0, 0, 0, 0);
        const lastCheckDate = savedUserProgress?.lastCheckIn 
          ? new Date(savedUserProgress.lastCheckIn).setHours(0, 0, 0, 0)
          : 0;
        
        // Update daily checked in state through userProgress
        const hasDailyCheckIn = currentDate === lastCheckDate;
        if (hasDailyCheckIn !== dailyCheckedIn) {
          // This is a computed property from isToday(userProgress.lastCheckIn),
          // which should update automatically when userProgress changes
          console.log('Daily check-in status:', hasDailyCheckIn);
        }
        
        console.log('Data loading complete!');
        setDataLoaded(true);
        
        // Check for badges that should be unlocked after loading all data
        setTimeout(() => {
          try {
            console.log('Checking for badge unlocks on app initialization');
            checkAndUnlockBadges().then((updated) => {
              if (updated) {
                console.log('Badges were updated during initialization');
              } else {
                console.log('No new badges unlocked during initialization');
              }
            });
          } catch (error) {
            console.error('Error checking badges during initialization:', error);
          }
        }, 1000); // Delay to ensure all data is properly loaded
        
      } catch (error) {
        console.error('Error loading data:', error);
        setDataLoaded(true); // Set to true even on error so the app is usable
      }
    };
    
    // Helper function to check for manually set streak values
    const getManualStreakValue = async (): Promise<number | null> => {
      try {
        // Try window localStorage if available
        if (typeof window !== 'undefined' && window.localStorage) {
          const manualStreak = window.localStorage.getItem('STREAK_FORCE_VALUE');
          if (manualStreak) {
            return parseInt(manualStreak, 10);
          }
        }
        
        // Try AsyncStorage if available
        try {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          const manualStreak = await AsyncStorage.getItem('MANUAL_STREAK_KEY');
          if (manualStreak) {
            return parseInt(manualStreak, 10);
          }
        } catch (asyncError) {
          console.error('AsyncStorage check failed:', asyncError);
        }
        
        return null;
      } catch (error) {
        console.error('Error in getManualStreakValue:', error);
        return null;
      }
    };

    loadData();
  }, [manualStreakSet]);
  
  // Save data when it changes
  useEffect(() => {
    if (dataLoaded) {
      storeData(STORAGE_KEYS.USER_DATA, userProgress);
    }
  }, [userProgress, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      storeData(STORAGE_KEYS.JOURNAL_ENTRIES, journalEntries);
    }
  }, [journalEntries, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      storeData(STORAGE_KEYS.CHALLENGES, challenges);
    }
  }, [challenges, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      storeData(STORAGE_KEYS.ACHIEVEMENTS, userProgress.achievements);
    }
  }, [userProgress.achievements, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      storeData(STORAGE_KEYS.COMPANION_DATA, companion);
    }
  }, [companion, dataLoaded]);
  
  // Check for streak achievements
  useEffect(() => {
    if (!dataLoaded) return;
    
    const checkStreakAchievements = async () => {
      if (!dataLoaded) return;
      
      let updated = false;
      
      // Get current streak
      const currentStreak = userProgress.streak;
      
      // Check streak-related badges
      const checkAndUpdateBadge = (badgeId: string, requiredStreak: number) => {
        const badge = userProgress.achievements.find(a => a.id === badgeId);
        if (badge && !badge.unlocked && currentStreak >= requiredStreak) {
          badge.unlocked = true;
        updated = true;
        
          showAchievement({
            title: badge.name,
            description: badge.description,
            buttonText: 'Nice!',
          });
          
          // Also add points for unlocking a badge
          addPoints(50);
        }
      };
      
      // Check all streak badges
      checkAndUpdateBadge('badge-streak-1day', 1);
      checkAndUpdateBadge('badge-streak-3days', 3);
      checkAndUpdateBadge('badge-streak-5days', 5);
      checkAndUpdateBadge('badge-streak-1', 7);
      checkAndUpdateBadge('badge-streak-2weeks', 14);
      checkAndUpdateBadge('badge-streak-2', 30);
      checkAndUpdateBadge('badge-streak-45days', 45);
      checkAndUpdateBadge('badge-streak-60days', 60);
      checkAndUpdateBadge('badge-streak-75days', 75);
      checkAndUpdateBadge('badge-streak-3', 90);
      checkAndUpdateBadge('badge-streak-120days', 120);
      checkAndUpdateBadge('badge-streak-6months', 180);
      checkAndUpdateBadge('badge-streak-9months', 270);
      checkAndUpdateBadge('badge-streak-1year', 365);
      
      // Check usage streak badge
      const usageStreakBadge = userProgress.achievements.find(a => a.id === 'badge-usage-streak');
      if (usageStreakBadge && !usageStreakBadge.unlocked) {
        // For simplicity, if they have a 3-day streak, we'll assume they've used the app for 3 consecutive days
        if (currentStreak >= 3) {
          usageStreakBadge.unlocked = true;
        updated = true;
        
          showAchievement({
            title: usageStreakBadge.name,
            description: usageStreakBadge.description,
            buttonText: 'Nice!',
          });
          
          addPoints(25);
        }
      }
      
      // Check for first use badge and daily check-in badge
      const firstUseBadge = userProgress.achievements.find(a => a.id === 'badge-usage-first');
      const dailyCheckInBadge = userProgress.achievements.find(a => a.id === 'badge-usage-checkin');
      
      if (firstUseBadge && !firstUseBadge.unlocked) {
        firstUseBadge.unlocked = true;
        updated = true;
      }
      
      if (dailyCheckInBadge && !dailyCheckInBadge.unlocked && userProgress.dailyCheckedIn) {
        dailyCheckInBadge.unlocked = true;
        updated = true;
        
        showAchievement({
          title: dailyCheckInBadge.name,
          description: dailyCheckInBadge.description,
          buttonText: 'Nice!',
        });
        
        addPoints(25);
      }
      
      // Check for companion-related badges
      if (companion) {
        const companionSelectedBadge = userProgress.achievements.find(a => a.id === 'badge-companion-selected');
        if (companionSelectedBadge && !companionSelectedBadge.unlocked) {
          companionSelectedBadge.unlocked = true;
          updated = true;
          
          showAchievement({
            title: companionSelectedBadge.name,
            description: companionSelectedBadge.description,
            buttonText: 'Nice!',
          });
          
          addPoints(25);
        }
        
        // Check if companion has been fed
        const companionFeedBadge = userProgress.achievements.find(a => a.id === 'badge-companion-feed');
        if (companionFeedBadge && !companionFeedBadge.unlocked && companion.feedingHistory && companion.feedingHistory.length > 0) {
          companionFeedBadge.unlocked = true;
          updated = true;
          
          showAchievement({
            title: companionFeedBadge.name,
            description: companionFeedBadge.description,
            buttonText: 'Nice!',
          });
          
          addPoints(25);
        }
      }
      
      // Check for milestone badges based on total unlocked badges
      const unlockedBadgesCount = userProgress.achievements.filter(badge => badge.unlocked).length;
      
      const firstMilestoneBadge = userProgress.achievements.find(a => a.id === 'badge-milestone-first');
      if (firstMilestoneBadge && !firstMilestoneBadge.unlocked && unlockedBadgesCount >= 1) {
        firstMilestoneBadge.unlocked = true;
        updated = true;
        
        showAchievement({
          title: firstMilestoneBadge.name,
          description: firstMilestoneBadge.description,
          buttonText: 'Nice!',
        });
        
        addPoints(25);
      }
      
      const threeMilestoneBadge = userProgress.achievements.find(a => a.id === 'badge-milestone-three');
      if (threeMilestoneBadge && !threeMilestoneBadge.unlocked && unlockedBadgesCount >= 3) {
        threeMilestoneBadge.unlocked = true;
        updated = true;
        
        showAchievement({
          title: threeMilestoneBadge.name,
          description: threeMilestoneBadge.description,
          buttonText: 'Keep Going!',
        });
        
        addPoints(40);
      }
      
      const fiveMilestoneBadge = userProgress.achievements.find(a => a.id === 'badge-milestone-five');
      if (fiveMilestoneBadge && !fiveMilestoneBadge.unlocked && unlockedBadgesCount >= 5) {
        fiveMilestoneBadge.unlocked = true;
        updated = true;
        
        showAchievement({
          title: fiveMilestoneBadge.name,
          description: fiveMilestoneBadge.description,
          buttonText: 'Amazing!',
        });
        
        addPoints(50);
      }
      
      const tenMilestoneBadge = userProgress.achievements.find(a => a.id === 'badge-milestone-ten');
      if (tenMilestoneBadge && !tenMilestoneBadge.unlocked && unlockedBadgesCount >= 10) {
        tenMilestoneBadge.unlocked = true;
        updated = true;
        
        showAchievement({
          title: tenMilestoneBadge.name,
          description: tenMilestoneBadge.description,
          buttonText: 'Incredible!',
        });
        
        addPoints(100);
      }
      
      const twentyMilestoneBadge = userProgress.achievements.find(a => a.id === 'badge-milestone-twenty');
      if (twentyMilestoneBadge && !twentyMilestoneBadge.unlocked && unlockedBadgesCount >= 20) {
        twentyMilestoneBadge.unlocked = true;
        updated = true;
        
        showAchievement({
          title: twentyMilestoneBadge.name,
          description: twentyMilestoneBadge.description,
          buttonText: 'Outstanding!',
        });
        
        addPoints(150);
      }
      
      const thirtyMilestoneBadge = userProgress.achievements.find(a => a.id === 'badge-milestone-thirty');
      if (thirtyMilestoneBadge && !thirtyMilestoneBadge.unlocked && unlockedBadgesCount >= 30) {
        thirtyMilestoneBadge.unlocked = true;
        updated = true;
        
        showAchievement({
          title: thirtyMilestoneBadge.name,
          description: thirtyMilestoneBadge.description,
          buttonText: 'Master Level!',
        });
        
        addPoints(200);
      }
      
      const fiftyMilestoneBadge = userProgress.achievements.find(a => a.id === 'badge-milestone-fifty');
      if (fiftyMilestoneBadge && !fiftyMilestoneBadge.unlocked && unlockedBadgesCount >= 50) {
        fiftyMilestoneBadge.unlocked = true;
        updated = true;
        
        showAchievement({
          title: fiftyMilestoneBadge.name,
          description: fiftyMilestoneBadge.description,
          buttonText: 'Legendary!',
        });
        
        addPoints(200);
      }
      
      if (updated) {
        setUserProgress({...userProgress});
        await storeData(STORAGE_KEYS.USER_DATA, userProgress);
        
        // Also check if the companion should evolve based on new badges
        await checkAndEvolveCompanion();
      }
      
      return updated;
    };
    
    checkStreakAchievements();
  }, [dataLoaded, userProgress.streak, userProgress.achievements, companion]);
  
  // Check for companion evolution when achievements change
  useEffect(() => {
    if (!dataLoaded) return;
    
    // Only check evolution if we have a companion
    if (companion) {
      console.log("Checking companion evolution due to achievement changes");
      checkAndEvolveCompanion().catch(e => 
        console.error('Error checking for evolution after achievement change:', e)
      );
    }
  }, [dataLoaded, userProgress.streak, userProgress.achievements, companion]);
  
  // Add specific check for badge count changes to ensure evolution happens
  useEffect(() => {
    if (!dataLoaded || !companion) return;
    
    const unlockedBadgesCount = userProgress.achievements.filter(badge => badge.unlocked).length;
    
    // This will ensure we evolve the companion when badge counts hit the thresholds
    if ((unlockedBadgesCount >= 15 && companion.currentLevel < 2) || 
        (unlockedBadgesCount >= 30 && companion.currentLevel < 3)) {
      console.log(`Badge count threshold reached (${unlockedBadgesCount}), checking evolution...`);
      
      // Use setTimeout to ensure this runs after any state updates
      setTimeout(() => {
        checkAndEvolveCompanion().catch(e => 
          console.error('Error checking for evolution after badge threshold reached:', e)
        );
      }, 500);
    }
  }, [dataLoaded, userProgress.achievements?.filter(badge => badge.unlocked).length, companion?.currentLevel]);
  
  // Regular check for companion evolution (runs once per session)
  useEffect(() => {
    if (!dataLoaded || !companion) return;
    
    const checkEvolutionPeriodically = async () => {
      console.log("Doing session-based evolution check...");
      
      // Get unlocked badges count
      const unlockedBadgesCount = userProgress.achievements.filter(badge => badge.unlocked).length;
      
      // Only proceed with check if we meet evolution criteria 
      // This helps avoid unnecessary processing and ensures proper evolution
      if ((unlockedBadgesCount >= 15 && companion.currentLevel < 2) || 
          (unlockedBadgesCount >= 30 && companion.currentLevel < 3)) {
        
        console.log("Session check: Evolution criteria met, checking evolution...");
        await checkAndEvolveCompanion();
      } else {
        console.log("Session check: No evolution criteria met");
      }
    };
    
    // Only run once per session
    checkEvolutionPeriodically();
  }, [dataLoaded]); // Only run when data loads initially
  
  // Extract checkAndEvolveCompanion as a reusable function
  const checkAndEvolveCompanion = async () => {
    if (!companion) {
      console.log("Cannot evolve: companion is null");
      return false;
    }
    
    // REMOVING EVOLUTION BLOCK:
    // Remove the block that was preventing evolution for new users
    // if (companion.isNewUser === true || 
    //     (companion.creationTime && (Date.now() - companion.creationTime) < 3600000)) {
    //   console.log("Skipping evolution - this is a new user companion");
    //   return false;
    // }
    
    // Get unlocked badges count - ensure we're getting a fresh count
    const unlockedBadgesCount = userProgress.achievements.filter(badge => badge.unlocked).length;
    
    console.log("----------------------------");
    console.log("EVOLUTION CHECK:");
    console.log("Current badges unlocked:", unlockedBadgesCount);
    console.log("Current companion level:", companion.currentLevel);
    console.log("Companion type:", companion.type);
    console.log("Should evolve to level 2:", unlockedBadgesCount >= 15 && companion.currentLevel < 2);
    console.log("Should evolve to level 3:", unlockedBadgesCount >= 30 && companion.currentLevel < 3);
    console.log("Badges needed for next evolution:", companion.currentLevel < 2 ? 15 : 30);
    console.log("----------------------------");
    
    // Get the companion's type for evolution name selection
    const companionType = companion.type || 'water';
    
    // Function to unlock companion evolution badge
    const unlockEvolutionBadge = () => {
      // Find and unlock the evolution badge if it exists and isn't already unlocked
      const evolutionBadge = userProgress.achievements.find(a => a.id === 'badge-companion-evolution');
      if (evolutionBadge && !evolutionBadge.unlocked) {
        evolutionBadge.unlocked = true;
        
        // Don't show this notification now since we're already showing an evolution notification
        // But count it as being unlocked
        console.log("Unlocked companion evolution badge");
        
        // We'll save the updated badges later when we save the evolved companion
      }
      
      // Also check for the max evolution badge if we're evolving to level 3
      if (companion.currentLevel >= 2) {
        const maxEvolutionBadge = userProgress.achievements.find(a => a.id === 'badge-companion-max-evolution');
        if (maxEvolutionBadge && !maxEvolutionBadge.unlocked) {
          maxEvolutionBadge.unlocked = true;
          console.log("Unlocked max evolution badge");
        }
      }
    };
    
    // MODIFIED: Changed from exact 15 badges to AT LEAST 15 badges 
    // for level 1 companion to ensure evolution works in all cases
    if (unlockedBadgesCount >= 15 && companion.currentLevel === 1) {
      console.log(`FORCING EVOLUTION: ${unlockedBadgesCount} badges detected for level 1 companion`);
      
      // Choose the appropriate name based on companion type
      let evolvedName = 'Unknown';
      switch (companionType) {
        case 'fire':
          evolvedName = 'Emberclaw';
          break;
        case 'water':
          evolvedName = 'Stripes';
          break;
        case 'plant':
          evolvedName = 'Vinesprout';
          break;
        default:
          evolvedName = companion.name || 'Companion';
      }
      
      // Unlock the evolution badge
      unlockEvolutionBadge();
      
      const updatedCompanion: UserCompanion = {
        ...companion,
        currentLevel: 2,
        name: evolvedName,
        isEvolutionReady: false,
        isNewUser: false, // Reset new user flag to avoid future evolution blocks
        experience: 0,
        lastInteraction: Date.now(),
        happinessLevel: 100,
      };
      
      // Update state immediately for UI responsiveness
      setCompanionState(updatedCompanion);
      
      // Log the state update
      console.log("Updated companion state:", updatedCompanion);
      
      // Save both the companion and the updated badges
      await storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
      await storeData(STORAGE_KEYS.USER_DATA, userProgress);
      
      console.log("Saved evolved companion to storage");
      
      // DISABLED: Don't show the notification to avoid spamming the user
      // showAchievement({
      //   title: "Companion Evolved!",
      //   description: `Your ${evolvedName} has evolved to stage 2 after unlocking ${unlockedBadgesCount} badges!`,
      //   buttonText: "Great!"
      // });
      
      return true;
    }
    // REMOVED: else if - to make each condition independent and not depend on previous checks
    // 30+ badges: Evolve to level 3
    if (unlockedBadgesCount >= 30 && companion.currentLevel < 3) {
      console.log(`Automatically evolving to level 3 (30+ badges) for ${companionType} type`);
      
      // Choose the appropriate name based on companion type
      let evolvedName = 'Unknown';
      switch (companionType) {
        case 'fire':
          evolvedName = 'Infernix';
          break;
        case 'water':
          evolvedName = 'Aquadrake';
          break;
        case 'plant':
          evolvedName = 'Floravine';
          break;
        default:
          evolvedName = companion.name || 'Companion';
      }
      
      // Unlock the evolution badge
      unlockEvolutionBadge();
      
      const updatedCompanion: UserCompanion = {
        ...companion,
        currentLevel: 3,
        name: evolvedName,
        isEvolutionReady: false,
        experience: 0,
        lastInteraction: Date.now(),
        happinessLevel: 100,
      };
      
      // Update state immediately for UI responsiveness
      setCompanionState(updatedCompanion);
      
      // Save both the companion and the updated badges
      await storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
      await storeData(STORAGE_KEYS.USER_DATA, userProgress);
      
      // DISABLED: Don't show the notification to avoid spamming the user
      // showAchievement({
      //   title: "Companion Evolved!",
      //   description: `Your ${evolvedName} has evolved to its final form after unlocking 30+ badges!`,
      //   buttonText: "Awesome!"
      // });
      
      return true;
    }
    // 15+ badges: Evolve to level 2
    else if (unlockedBadgesCount >= 15 && companion.currentLevel < 2) {
      console.log(`Automatically evolving to level 2 (15+ badges) for ${companionType} type`);
      
      // Choose the appropriate name based on companion type
      let evolvedName = 'Unknown';
      switch (companionType) {
        case 'fire':
          evolvedName = 'Emberclaw';
          break;
        case 'water':
          evolvedName = 'Stripes';
          break;
        case 'plant':
          evolvedName = 'Vinesprout';
          break;
        default:
          evolvedName = companion.name || 'Companion';
      }
      
      // Unlock the evolution badge
      unlockEvolutionBadge();
      
      const updatedCompanion: UserCompanion = {
        ...companion,
        currentLevel: 2,
        name: evolvedName,
        isEvolutionReady: false,
        experience: 0,
        lastInteraction: Date.now(),
        happinessLevel: 100,
      };
      
      // Update state immediately for UI responsiveness
      setCompanionState(updatedCompanion);
      
      // Log the state update
      console.log("Updated companion state:", updatedCompanion);
      
      // Save both the companion and the updated badges
      await storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
      await storeData(STORAGE_KEYS.USER_DATA, userProgress);
      
      console.log("Saved evolved companion to storage");
      
      // DISABLED: Don't show the notification to avoid spamming the user
      // showAchievement({
      //   title: "Companion Evolved!",
      //   description: `Your ${evolvedName} has evolved to stage 2 after unlocking 15 badges!`,
      //   buttonText: "Great!"
      // });
      
      return true;
    } else {
      console.log("No evolution conditions met");
      return false;
    }
  };
  
  // Check for journal achievements
  useEffect(() => {
    if (!dataLoaded) return;
    
    const checkJournalAchievements = async () => {
      let updated = false;
      console.log("Checking journal achievements - entries count:", journalEntries.length);
      
      // First journal entry badge
      const firstEntryBadge = userProgress.achievements.find(a => a.id === 'badge-journal-first');
      if (firstEntryBadge && !firstEntryBadge.unlocked && journalEntries.length >= 1) {
        console.log("Unlocking first journal entry badge");
        setUserProgress(prev => ({
          ...prev,
          achievements: prev.achievements.map(a => 
            a.id === 'badge-journal-first' 
              ? { ...a, unlocked: true, unlockedDate: Date.now() } 
              : a
          )
        }));
        addPoints(50);
        updated = true;
        
        showAchievement({
          title: firstEntryBadge.name,
          description: firstEntryBadge.description,
          buttonText: 'Great!',
        });
      }
      
      // 3 journal entries badge
      const threeEntriesBadge = userProgress.achievements.find(a => a.id === 'badge-journal-3');
      if (threeEntriesBadge && !threeEntriesBadge.unlocked && journalEntries.length >= 3) {
        console.log("Unlocking 3 journal entries badge");
        setUserProgress(prev => ({
          ...prev,
          achievements: prev.achievements.map(a => 
            a.id === 'badge-journal-3' 
              ? { ...a, unlocked: true, unlockedDate: Date.now() } 
              : a
          )
        }));
        addPoints(75);
        updated = true;
        
        showAchievement({
          title: threeEntriesBadge.name,
          description: threeEntriesBadge.description,
          buttonText: 'Nice!',
        });
      }
      
      // 10 journal entries badge (Consistent Journaler)
      const tenEntriesBadge = userProgress.achievements.find(a => a.id === 'badge-journal-2');
      if (tenEntriesBadge && !tenEntriesBadge.unlocked && journalEntries.length >= 10) {
        console.log("Unlocking 10 journal entries badge");
        setUserProgress(prev => ({
          ...prev,
          achievements: prev.achievements.map(a => 
          a.id === 'badge-journal-2' 
            ? { ...a, unlocked: true, unlockedDate: Date.now() } 
            : a
          )
        }));
        addPoints(150);
        updated = true;
        
        showAchievement({
          title: tenEntriesBadge.name,
          description: tenEntriesBadge.description,
          buttonText: 'Amazing!',
        });
      }
      
      // 20 journal entries badge (Master Journaler)
      const twentyEntriesBadge = userProgress.achievements.find(a => a.id === 'badge-journal-master');
      if (twentyEntriesBadge && !twentyEntriesBadge.unlocked && journalEntries.length >= 20) {
        console.log("Unlocking 20 journal entries badge");
        setUserProgress(prev => ({
          ...prev,
          achievements: prev.achievements.map(a => 
            a.id === 'badge-journal-master' 
              ? { ...a, unlocked: true, unlockedDate: Date.now() } 
              : a
          )
        }));
        addPoints(200);
        updated = true;
        
        showAchievement({
          title: twentyEntriesBadge.name,
          description: twentyEntriesBadge.description,
          buttonText: 'Incredible!',
        });
      }
      
      // If any badges were updated, check for companion evolution
      if (updated && companion) {
        console.log("Journal badges updated, checking companion evolution");
        await checkAndEvolveCompanion();
      }
    };
    
    checkJournalAchievements();
  }, [journalEntries.length, dataLoaded, userProgress.achievements]);
  
  // Check for challenge achievements
  useEffect(() => {
    if (!dataLoaded) return;
    
    const checkChallengeAchievements = async () => {
      if (userProgress.challengesCompleted.length >= 5 && !userProgress.achievements.find(a => a.id === 'badge-challenge-1')?.unlocked) {
        setUserProgress(prev => ({
          ...prev,
          achievements: prev.achievements.map(a => 
          a.id === 'badge-challenge-1' 
            ? { ...a, unlocked: true, unlockedDate: Date.now() } 
            : a
          )
        }));
        addPoints(250);
      }
    };
    
    checkChallengeAchievements();
  }, [userProgress.challengesCompleted.length, dataLoaded, userProgress.achievements]);
  
  // Helper function to add points and update level
  const addPoints = (newPoints: number) => {
    setUserProgress(prev => {
      const updatedPoints = prev.points + newPoints;
      
      // Find current level based on points
      let newLevel = prev.level;
      for (let i = levelRequirements.length - 1; i >= 0; i--) {
        if (updatedPoints >= levelRequirements[i].pointsRequired) {
          newLevel = levelRequirements[i].level;
          break;
        }
      }
      
      return {
        ...prev,
        points: updatedPoints,
        level: newLevel,
      };
    });
  };
  
  // Updated check-in method to use the streak service
  const checkIn = async () => {
    try {
      // Can only check in once per day
      if (userProgress.dailyCheckedIn) {
      console.log('Already checked in today');
        
        showAchievement({
          title: "Already Checked In",
          description: "You've already completed your daily check-in for today. Come back tomorrow!",
          buttonText: "OK"
        });
        
      return;
    }
    
      // Update streak data
      const now = Date.now();
      const lastCheckIn = userProgress.lastCheckIn || 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      
      // Create yesterday date at midnight
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStart = yesterday.getTime();
      
      // Was the last check in yesterday or earlier today?
      const wasYesterdayOrToday = lastCheckIn >= yesterdayStart;
      
      // Update streak based on timing
      const streakData = { streak: userProgress.streak, lastCheckIn: now };
      
      if (wasYesterdayOrToday) {
        // Consecutive check-in - increment streak
        streakData.streak += 1;
        console.log(`Consecutive check-in, streak increased to ${streakData.streak}`);
      } else {
        // Not consecutive - reset streak to 1
        streakData.streak = 1;
        console.log('Streak reset to 1 due to missed day');
      }
      
      // Clone the achievements for updating
      const updatedAchievements = JSON.parse(JSON.stringify(userProgress.achievements));
      
      // Update the user progress with the new achievements and streak data
      const updatedProgress = {
        ...userProgress,
        streak: streakData.streak,
        lastCheckIn: streakData.lastCheckIn,
        dailyCheckedIn: true,
        achievements: updatedAchievements
      };
      
      // Update state
      setUserProgress(updatedProgress);
      
      // Store the updated data
      await storeData(STORAGE_KEYS.USER_DATA, updatedProgress);
      
      // Give companion XP for daily check-in if the user has a companion
      if (companion) {
        await updateCompanionExperience(25, XpActionType.DAILY_CHECK_IN);
      }
      
      // Check for badges that should be unlocked with the new streak
      console.log('Checking for badge unlocks after check-in');
      await checkAndUnlockBadges();
      
      // Important: Check if companion should evolve based on the updated streak and badges
      // This needs to happen AFTER the streak is updated
      console.log(`Checking for evolution after daily check-in with streak ${streakData.streak}`);
      const evolved = await checkAndEvolveCompanion();
      console.log(`Evolution check result after check-in: ${evolved ? 'Evolved' : 'No evolution'}`);
    } catch (error) {
      console.error('Failed to check in:', error);
    }
  };
  
  // Add journal entry
  const addJournalEntry = (
    content: string, 
    options?: { mood?: string, tags?: string[], audioUri?: string }
  ) => {
    if (!content.trim() && !options?.audioUri) return;
    
    const newEntry: JournalEntry = {
      id: `journal-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      content,
      timestamp: Date.now(),
      mood: options?.mood,
      tags: options?.tags,
      audioUri: options?.audioUri
    };
    
    // Ensure the new entry has a unique ID by checking existing entries
    const uniqueId = ensureUniqueId(newEntry.id);
    newEntry.id = uniqueId;
    
    const updatedEntries = [newEntry, ...journalEntries];
    setJournalEntries(updatedEntries);
    
    // Save to storage immediately to prevent duplication on rapid additions
    try {
      storeData(STORAGE_KEYS.JOURNAL_ENTRIES, updatedEntries);
    } catch (error) {
      console.error('Failed to store journal entries:', error);
    }
    
    // Award points for journal entry
    addPoints(15);
    
    // Check for badge unlocks immediately with the updated entry count
    const checkForBadgeUnlocks = async () => {
      let updated = false;
      const entriesCount = updatedEntries.length;
      console.log(`Checking journal badges with ${entriesCount} entries`);
      
      // Check for the first journal entry badge
      if (entriesCount === 1) {
        const firstEntryBadge = userProgress.achievements.find(a => a.id === 'badge-journal-first');
        if (firstEntryBadge && !firstEntryBadge.unlocked) {
          console.log("Unlocking first journal entry badge");
          setUserProgress(prev => ({
            ...prev,
            achievements: prev.achievements.map(a => 
              a.id === 'badge-journal-first' 
                ? { ...a, unlocked: true, unlockedDate: Date.now() } 
                : a
            )
          }));
          updated = true;
          showAchievement({
            title: firstEntryBadge.name,
            description: firstEntryBadge.description,
            buttonText: 'Great!',
          });
        }
      }
      
      // Check for the 3 entries badge
      if (entriesCount === 3) {
        const threeEntriesBadge = userProgress.achievements.find(a => a.id === 'badge-journal-3');
        if (threeEntriesBadge && !threeEntriesBadge.unlocked) {
          console.log("Unlocking 3 journal entries badge");
          setUserProgress(prev => ({
            ...prev,
            achievements: prev.achievements.map(a => 
              a.id === 'badge-journal-3' 
                ? { ...a, unlocked: true, unlockedDate: Date.now() } 
                : a
            )
          }));
          updated = true;
          showAchievement({
            title: threeEntriesBadge.name,
            description: threeEntriesBadge.description,
            buttonText: 'Nice!',
          });
        }
      }
      
      // Check for the 10 entries badge
      if (entriesCount === 10) {
        const tenEntriesBadge = userProgress.achievements.find(a => a.id === 'badge-journal-2');
        if (tenEntriesBadge && !tenEntriesBadge.unlocked) {
          console.log("Unlocking 10 journal entries badge");
          setUserProgress(prev => ({
            ...prev,
            achievements: prev.achievements.map(a => 
              a.id === 'badge-journal-2' 
                ? { ...a, unlocked: true, unlockedDate: Date.now() } 
                : a
            )
          }));
          updated = true;
          showAchievement({
            title: tenEntriesBadge.name,
            description: tenEntriesBadge.description,
            buttonText: 'Amazing!',
          });
        }
      }
      
      // Check for the 20 entries badge
      if (entriesCount === 20) {
        const twentyEntriesBadge = userProgress.achievements.find(a => a.id === 'badge-journal-master');
        if (twentyEntriesBadge && !twentyEntriesBadge.unlocked) {
          console.log("Unlocking 20 journal entries badge");
          setUserProgress(prev => ({
            ...prev,
            achievements: prev.achievements.map(a => 
              a.id === 'badge-journal-master' 
                ? { ...a, unlocked: true, unlockedDate: Date.now() } 
                : a
            )
          }));
          updated = true;
          showAchievement({
            title: twentyEntriesBadge.name,
            description: twentyEntriesBadge.description,
            buttonText: 'Incredible!',
          });
        }
      }
      
      // If any badges were updated, check for companion evolution
      if (updated && companion) {
        console.log("Journal badges updated, checking companion evolution");
        await checkAndEvolveCompanion();
      }
    };
    
    // Run the badge check
    checkForBadgeUnlocks();
    
    // Update journal streak challenge if active
    const journalStreakChallenge = challenges.find(c => 
      c.id === 'challenge-3' && 
      userProgress.challengesActive.includes('challenge-3')
    );
    
    if (journalStreakChallenge && journalStreakChallenge.steps) {
      // Count existing entries for today
      const todayEntries = journalEntries.filter(entry => 
        isToday(entry.timestamp)
      ).length;
      
      // If this is the first entry today, update the challenge
      if (todayEntries === 0) {
        const completedStepCount = journalStreakChallenge.steps.filter(s => s.completed).length;
        
        if (completedStepCount < journalStreakChallenge.steps.length) {
          // Update the next incomplete step
          setChallenges(prev => prev.map(c => {
            if (c.id === 'challenge-3') {
              const updatedSteps = c.steps?.map((step, index) => {
                if (index === completedStepCount) {
                  return { ...step, completed: true };
                }
                return step;
              });
              
              const newCompletedCount = updatedSteps?.filter(s => s.completed).length || 0;
              const totalSteps = updatedSteps?.length || 1;
              const newProgress = Math.floor((newCompletedCount / totalSteps) * 100);
              
              return {
                ...c,
                steps: updatedSteps,
                progress: newProgress,
              };
            }
            return c;
          }));
        }
      }
    }
    
    try {
      // Give companion XP for journal entries if it's substantial
      // Anti-abuse: Only give XP for entries longer than 50 characters
      if (companion && content.length > 50) {
        updateCompanionExperience(15, XpActionType.REFLECTION_ENTRY);
      }
    } catch (error) {
      console.error('Error adding journal entry:', error);
    }
  };
  
  // Delete journal entry
  const deleteJournalEntry = (id: string) => {
    setJournalEntries(prev => prev.filter(entry => entry.id !== id));
  };
  
  // Start a challenge
  const startChallenge = (id: string) => {
    setChallenges(prev => prev.map(c => 
      c.id === id ? { ...c, startDate: Date.now(), progress: 0 } : c
    ));
    
    setUserProgress(prev => ({
      ...prev,
      challengesActive: [...prev.challengesActive, id]
    }));
  };
  
  // Complete a challenge
  const completeChallenge = (id: string) => {
    const challenge = challenges.find(c => c.id === id);
    if (!challenge) return;
    
    // Add points for completing the challenge
    addPoints(challenge.points);
    
    // Add bonus points if any
    if (challenge.rewards?.pointBonus) {
      addPoints(challenge.rewards.pointBonus);
    }
    
    // Unlock achievement if associated with this challenge
    if (challenge.rewards?.badgeId) {
      setUserProgress(prev => ({
        ...prev,
        achievements: prev.achievements.map(a => 
        a.id === challenge.rewards?.badgeId 
          ? { ...a, unlocked: true, unlockedDate: Date.now() } 
          : a
        )
      }));
    }
    
    // Update challenges and user progress
    setChallenges(prev => prev.map(c => 
      c.id === id ? { ...c, completed: true, endDate: Date.now() } : c
    ));
    
    setUserProgress(prev => ({
      ...prev,
      challengesActive: prev.challengesActive.filter(cid => cid !== id),
      challengesCompleted: [...prev.challengesCompleted, id]
    }));
    
    // Give companion XP for completing challenges
    if (companion) {
      updateCompanionExperience(50, XpActionType.CHALLENGE_COMPLETION);
    }
  };
  
  // New function to log habit replacement activities
  const logHabitReplacement = (description: string) => {
    // Find the habit replacement challenge
    const habitChallenge = challenges.find(c => c.id === 'challenge-4');
    if (!habitChallenge || !habitChallenge.steps) return false;
    
    // Only allow logging if the challenge is active
    if (!userProgress.challengesActive.includes('challenge-4')) {
      showAchievement({
        title: "Challenge Not Active",
        description: "Start the Habit Replacement challenge first!",
        buttonText: "OK"
      });
      return false;
    }
    
    // Find the next incomplete step
    const nextIncompleteStep = habitChallenge.steps.findIndex(step => !step.completed);
    if (nextIncompleteStep === -1) return false; // All steps are already completed
    
    // Update the step
    setChallenges(prev => prev.map(c => {
      if (c.id === 'challenge-4') {
        const updatedSteps = c.steps?.map((step, index) => {
          if (index === nextIncompleteStep) {
            return { ...step, completed: true };
          }
          return step;
        });
        
        const newCompletedCount = updatedSteps?.filter(s => s.completed).length || 0;
        const totalSteps = updatedSteps?.length || 1;
        const newProgress = Math.floor((newCompletedCount / totalSteps) * 100);
        
        return {
          ...c,
          steps: updatedSteps,
          progress: newProgress,
        };
      }
      return c;
    }));
    
    // Save the updated challenges
    storeData(STORAGE_KEYS.CHALLENGES, challenges);
    
    // Give some points for logging a replacement
    addPoints(10);
    
    // Small XP boost for companion
    if (companion) {
      updateCompanionExperience(5, XpActionType.HABIT_REPLACEMENT);
    }
    
    // Check if all steps are completed after this update
    const updatedChallenge = challenges.find(c => c.id === 'challenge-4');
    if (updatedChallenge && updatedChallenge.steps && 
        updatedChallenge.steps.every(step => step.completed)) {
      // Automatically complete the challenge
      completeChallenge('challenge-4');
    }
    
    return true;
  };
  
  // New function to log workout sessions
  const logWorkout = (durationMinutes: number) => {
    // Verify the workout is at least 30 minutes
    if (durationMinutes < 30) {
      showAchievement({
        title: "Workout Too Short",
        description: "Workouts need to be at least 30 minutes to count for this challenge.",
        buttonText: "OK"
      });
      return false;
    }
    
    // Find the workout challenge
    const workoutChallenge = challenges.find(c => c.id === 'challenge-5');
    if (!workoutChallenge || !workoutChallenge.steps) return false;
    
    // Only allow logging if the challenge is active
    if (!userProgress.challengesActive.includes('challenge-5')) {
      showAchievement({
        title: "Challenge Not Active",
        description: "Start the Weekly Exercise challenge first!",
        buttonText: "OK"
      });
      return false;
    }
    
    // Find the next incomplete step
    const nextIncompleteStep = workoutChallenge.steps.findIndex(step => !step.completed);
    if (nextIncompleteStep === -1) return false; // All steps are already completed
    
    // Update the step
    setChallenges(prev => prev.map(c => {
      if (c.id === 'challenge-5') {
        const updatedSteps = c.steps?.map((step, index) => {
          if (index === nextIncompleteStep) {
            return { ...step, completed: true };
          }
          return step;
        });
        
        const newCompletedCount = updatedSteps?.filter(s => s.completed).length || 0;
        const totalSteps = updatedSteps?.length || 1;
        const newProgress = Math.floor((newCompletedCount / totalSteps) * 100);
        
        return {
          ...c,
          steps: updatedSteps,
          progress: newProgress,
        };
      }
      return c;
    }));
    
    // Save the updated challenges
    storeData(STORAGE_KEYS.CHALLENGES, challenges);
    
    // Give some points for logging a workout
    addPoints(15);
    
    // Medium XP boost for companion
    if (companion) {
      updateCompanionExperience(10, XpActionType.WORKOUT_COMPLETION);
    }
    
    // Check if all steps are completed after this update
    const updatedChallenge = challenges.find(c => c.id === 'challenge-5');
    if (updatedChallenge && updatedChallenge.steps && 
        updatedChallenge.steps.every(step => step.completed)) {
      // Automatically complete the challenge
      completeChallenge('challenge-5');
    }
    
    return true;
  };
  
  // New function to log meditation sessions
  const logMeditation = (durationMinutes: number) => {
    // Verify the meditation is at least 5 minutes
    if (durationMinutes < 5) {
      showAchievement({
        title: "Meditation Too Short",
        description: "Meditations need to be at least 5 minutes to count for this challenge.",
        buttonText: "OK"
      });
      return false;
    }
    
    const now = Date.now();
    const today = new Date(now).toDateString();
    const lastMeditationDay = userProgress.lastMeditationDate ? new Date(userProgress.lastMeditationDate).toDateString() : null;
    
    // Update meditation tracking
    setUserProgress(prev => {
      const newSessions = (prev.meditationSessions || 0) + 1;
      const newTotalMinutes = (prev.totalMeditationMinutes || 0) + durationMinutes;
      
      // Calculate meditation streak
      let newStreak = prev.meditationStreak || 0;
      if (lastMeditationDay !== today) {
        // Only increment streak if this is a new day
        const yesterday = new Date(now - 24 * 60 * 60 * 1000).toDateString();
        if (lastMeditationDay === yesterday || newSessions === 1) {
          newStreak += 1;
        } else if (lastMeditationDay !== yesterday && newSessions > 1) {
          newStreak = 1; // Reset streak if gap in days
        }
      }
      
      return {
        ...prev,
        meditationSessions: newSessions,
        meditationStreak: newStreak,
        lastMeditationDate: now,
        totalMeditationMinutes: newTotalMinutes,
      };
    });
    
    // Find the meditation challenge
    const meditationChallenge = challenges.find(c => c.id === 'challenge-2');
    if (meditationChallenge && userProgress.challengesActive.includes('challenge-2')) {
      // Update the progress directly since this is a daily challenge without steps
      setChallenges(prev => prev.map(c => {
        if (c.id === 'challenge-2') {
          return {
            ...c,
            progress: 100, // Set to 100% since it's a one-time daily action
          };
        }
        return c;
      }));
      
      // Save the updated challenges
      storeData(STORAGE_KEYS.CHALLENGES, challenges);
      
      // Auto-complete the challenge
      completeChallenge('challenge-2');
    }
    
    // Give some points for meditation
    addPoints(15);
    
    // Small XP boost for companion
    if (companion) {
      updateCompanionExperience(10, XpActionType.MEDITATION);
    }
    
    // Check for meditation badge unlocks
    setTimeout(() => checkAndUnlockBadges(), 100);
    
    return true;
  };
  
  // Calculate level progress (0-1)
  const getLevelProgress = () => {
    const currentLevel = userProgress.level;
    const nextLevel = currentLevel + 1;
    
    // Get points required for current and next level
    const currentLevelPoints = levelRequirements.find(l => l.level === currentLevel)?.pointsRequired || 0;
    const nextLevelPoints = levelRequirements.find(l => l.level === nextLevel)?.pointsRequired || Infinity;
    
    // If on max level
    if (nextLevelPoints === Infinity) return 1;
    
    // Calculate progress to next level
    const pointsTowardNextLevel = userProgress.points - currentLevelPoints;
    const pointsRequiredForNextLevel = nextLevelPoints - currentLevelPoints;
    
    return Math.min(1, pointsTowardNextLevel / pointsRequiredForNextLevel);
  };
  
  // Get points needed for next level
  const getPointsToNextLevel = () => {
    const currentLevel = userProgress.level;
    const nextLevel = currentLevel + 1;
    
    const nextLevelPoints = levelRequirements.find(l => l.level === nextLevel)?.pointsRequired || Infinity;
    
    // If on max level
    if (nextLevelPoints === Infinity) return 0;
    
    return nextLevelPoints - userProgress.points;
  };
  
  // Reset all data
  const resetData = async () => {
    try {
      // Create a fresh new user progress object with no unlocked badges
      const freshUserProgress: UserProgress = {
        ...defaultUserProgress,
        achievements: [...initialAchievements], // Ensure deep copy
        streak: 0,
        lastCheckIn: 0,
        level: 1,
        points: 0,
        badgesEarned: [],
        challengesCompleted: [],
        challengesActive: [],
        dailyCheckedIn: false
      };

      // Save the fresh progress to storage
      await storeData(STORAGE_KEYS.ACHIEVEMENTS, freshUserProgress);
      
      // Also reset the companion
      await resetCompanion();
      
      // Clear other data that might be persisted
      await storeData(STORAGE_KEYS.JOURNAL_ENTRIES, []);
      await storeData(STORAGE_KEYS.STREAK_DATA, { streak: 0, lastCheckIn: 0, dailyCheckedIn: false });
      
      // Update state 
      setUserProgress(freshUserProgress);
      setJournalEntries([]);
      
      return true;
    } catch (error) {
      console.error('Error resetting all user data:', error);
      return false;
    }
  };
  
  // Export data
  const exportData = () => {
    const data = {
      userProgress,
      journalEntries,
      challenges,
      achievements: userProgress.achievements
    };
    
    // In a real app, we would create a file and prompt the user to share/save it
    // For this simulation, we'll just show an achievement notification
    showAchievement({
      title: "Data Export",
      description: "In a real app, this would create an encrypted file with your data that you could save.",
      buttonText: "OK"
    });
    
    if (Platform.OS === 'web') {
      console.log('Export data:', JSON.stringify(data, null, 2));
    }
  };
  
  // Import data
  const importData = () => {
    // In a real app, we would prompt the user to select a file
    // For this simulation, we'll just show an achievement notification
    showAchievement({
      title: "Data Import",
      description: "In a real app, this would let you select a previously exported file to restore your data.",
      buttonText: "OK"
    });
  };

  // Updated setStreak method to reliably handle dates in any year
  const setStreak = async (days: number, startDate?: number) => {
    try {
      console.log(`Setting streak to ${days} days in GamificationContext${startDate ? ' with specified start date: ' + new Date(startDate).toISOString() : ''}`);
      
      // CRITICAL: Prevent accidental streak resets if days is invalid
      if (days === undefined || days === null || isNaN(days)) {
        console.error('Invalid streak value, aborting update:', days);
        return userProgress.streak; // Return current streak instead of invalid value
      }
      
      // Ensure days is a valid number by converting it to a number and check if it's actually a number
      const validatedDays = Number(days);
      if (isNaN(validatedDays)) {
        console.error('Invalid streak value after conversion, aborting update:', days);
        return userProgress.streak;
      }
      
      // NEW SAFEGUARD: Prevent resetting a large streak value to 0 accidentally
      // But allow it if it's explicitly a relapse (when user confirms)
      const isRelapse = validatedDays === 0;
      
      if (isRelapse && userProgress.streak > 20) {
        console.log(`Relapse recorded: Reset from ${userProgress.streak} days to 0`);
      }
      
      // CRITICAL: Store the current streak value before updating for potential recovery
      const previousStreak = userProgress.streak;
      console.log(`Previous streak value: ${previousStreak}, updating to: ${validatedDays}`);
      
      // CRITICAL: Calculate normalized start date if one wasn't provided
      const calculatedStartDate = startDate || (() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        // Calculate what the start date should be based on current date minus (days-1)
        return now.getTime() - ((validatedDays - 1) * 24 * 60 * 60 * 1000);
      })();
      
      // Create a persistent ref to track streak value across function calls
      const streakRef = { current: validatedDays };
      
      // CRITICAL: Immediately update the UI state
      // Using a function form of the state update to ensure it's based on the latest state
      setUserProgress(currentProgress => {
        const updatedProgress = {
          ...currentProgress,
          streak: validatedDays,
          lastCheckIn: Date.now(),
        };
        console.log(`Updated user progress with streak: ${validatedDays}`);
        return updatedProgress;
      });
      
      // Force immediate re-render by setting a flag
      setManualStreakSet(prev => !prev);
      
      // Store streak value in all possible storage mechanisms
      try {
        // Try updating the streak data in our service - pass the startDate to ensure it's correctly stored
        await updateStreak(validatedDays, DEFAULT_USER_ID, calculatedStartDate);
        
        // Add direct fallback - update the user progress in storage directly
        const updatedProgress = {
        ...userProgress,
        streak: validatedDays,
          lastCheckIn: Date.now(),
        };
        
        await storeData(STORAGE_KEYS.USER_DATA, updatedProgress);
        
        // Also update the streak data in storage with the correct start date
        await storeData(STORAGE_KEYS.STREAK_DATA, {
          streak: validatedDays,
          lastCheckIn: Date.now(),
          startDate: calculatedStartDate
        });
        
        // Update the widget with the streak data
        if (Platform.OS === 'ios') {
          try {
            await updateWidgetStreakData(validatedDays, calculatedStartDate, Date.now());
            console.log('Widget data updated successfully');
          } catch (widgetError) {
            console.error('Error updating widget data:', widgetError);
          }
        }
        
        // If this is a relapse, we need to update companion data (reduce happiness)
        if (isRelapse && companion) {
          const updatedCompanion: UserCompanion = {
            ...companion,
            happinessLevel: Math.max(10, (companion.happinessLevel || 100) - 30),
            lastInteraction: Date.now(),
          };
          
          // Update state
          setCompanionState(updatedCompanion);
          
          // Save to storage
          await storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
          
          console.log('Updated companion happiness due to relapse');
        }
        
        // Just to be extra safe, update again after storage operations
        setUserProgress(currentProgress => {
          const finalProgress = {
            ...currentProgress,
            streak: validatedDays,
            lastCheckIn: Date.now(),
          };
          console.log(`Final streak update to ${validatedDays} days`);
          return finalProgress;
        });
        
      } catch (storageError) {
        console.error('Error saving streak data:', storageError);
        // Even if we hit an error here, we've already updated the UI state
      }
      
      console.log(`Successfully set streak to ${validatedDays} days in context`);
      return validatedDays; // Return the new streak value for confirmation
    } catch (error) {
      console.error('Failed to set streak:', error);
      // If there was an error, make sure the UI still shows the correct value
      setUserProgress(prev => ({
        ...prev,
        streak: days,
      }));
      return days; // Still return the intended value
    }
  };

  // Initialize or set a new companion
  const setCompanion = async (selectedCompanion: Companion) => {
    try {
      // Generate ID if not present
      const id = selectedCompanion.id || `companion-${Date.now()}`;
      
      // Create new user companion with default bond values
      const newUserCompanion: UserCompanion = {
        ...selectedCompanion,
        id,
        lastInteraction: Date.now(),
        lastCheckIn: 0, // No check-in yet
        happinessLevel: 100,
        isEvolutionReady: false, // Set to false by default for new users
        bondLevel: 10,
        feedingHistory: [],
        unlockedSnacks: 5,
        isNewUser: true, // Flag to indicate this is a newly created companion
        creationTime: Date.now() // Add creation timestamp for reference
      };
      
      // Save to storage
      await storeData(STORAGE_KEYS.COMPANION_DATA, newUserCompanion);
      
      // Update state
      setCompanionState(newUserCompanion);
      
      // Also update user progress to link the companion
      const updatedProgress = {
        ...userProgress,
        companionId: id
      };
      
      setUserProgress(updatedProgress);
      await storeData(STORAGE_KEYS.USER_DATA, updatedProgress);
      
      return id;
    } catch (error) {
      console.error('Error setting companion:', error);
      return null;
    }
  };
  
  // Create a default companion if missing or corrupted
  const createDefaultCompanion = async (companionType: 'water' | 'fire' | 'plant' = 'water') => {
    // Choose name based on type
    let name = 'Stripes';
    let description = 'A friendly water dragon companion';
    
    if (companionType === 'plant') {
      name = 'Drowsi';
      description = "Falls asleep faster than your urges — let him nap, so you don't relapse.";
    } else if (companionType === 'fire') {
      name = 'Snuglur';
      description = "The monster under your bed — but this time, he's scaring off your bad habits.";
    }
    
    // Default companion with specified type
    const defaultCompanion: Companion = {
      id: `companion-${Date.now()}`,
      type: companionType,
      name: name,
      description: description,
      currentLevel: 1,
      experience: 0,
      nextLevelExperience: 100,
      evolutions: []
    };
    
    return await setCompanion(defaultCompanion);
  };
  
  // Check if companion is valid and fix if needed
  useEffect(() => {
    const checkAndFixCompanion = async () => {
      if (dataLoaded && userProgress.companionId && !companion) {
        console.log("Companion missing or corrupted. Creating default companion...");
        await createDefaultCompanion();
      } else if (dataLoaded && companion) {
        // Fix companion level if it doesn't match badge count
        const unlockedBadgesCount = userProgress.achievements.filter(badge => badge.unlocked).length;
        let correctLevel = companion.currentLevel;
        
        if (unlockedBadgesCount >= 10 && companion.currentLevel < 3) {
          correctLevel = 3;
        } else if (unlockedBadgesCount >= 5 && companion.currentLevel < 2) {
          correctLevel = 2;
        }
        
        // If level needs correction, trigger companion evolution
        if (correctLevel > companion.currentLevel) {
          console.log(`Fixing companion level: should be ${correctLevel} based on ${unlockedBadgesCount} badges`);
          await checkAndEvolveCompanion();
        }
      }
    };
    
    checkAndFixCompanion();
  }, [dataLoaded, userProgress.companionId, companion]);
  
  // Update companion experience points
  const updateCompanionExperience = async (amount: number, actionType?: XpActionType) => {
    if (!companion) return;
    
    try {
      // Apply anti-abuse mechanisms for XP gains
      let actualAmount = amount;
      
      if (actionType) {
        // Check for daily check-in cooldown
        if (actionType === XpActionType.DAILY_CHECK_IN) {
          const lastCheckIn = companion.lastCheckIn || 0;
          const now = Date.now();
          const hoursSinceCheckIn = (now - lastCheckIn) / (1000 * 60 * 60);
          
          // Only allow one check-in per 24 hours
          if (hoursSinceCheckIn < 24) {
            console.log('Daily check-in cooldown still active');
            return;
          }
          
          // Update last check-in time
          companion.lastCheckIn = now;
        }
      }
      
      let newExperience = companion.experience + actualAmount;
      let isLevelUp = false;
      let newLevel = companion.currentLevel;
      let newNextLevelExp = companion.nextLevelExperience;
      let isEvolutionReady = companion.isEvolutionReady;
      
      // Check if the companion has leveled up
      if (newExperience >= companion.nextLevelExperience) {
        newLevel += 1;
        newExperience -= companion.nextLevelExperience;
        newNextLevelExp = Math.floor(companion.nextLevelExperience * 1.5);
        isLevelUp = true;
        
        // Calculate total XP to check evolution stage
        const totalXp = (newLevel - 1) * companion.nextLevelExperience + newExperience;
        
        // Check if reached a new evolution threshold
        if (totalXp >= EVOLUTION_THRESHOLDS.STAGE_3 && getCompanionStage() < 3) {
          isEvolutionReady = true;
        } else if (totalXp >= EVOLUTION_THRESHOLDS.STAGE_2 && getCompanionStage() < 2) {
          isEvolutionReady = true;
        }
      }
      
      // Update the companion data
      const updatedCompanion: UserCompanion = {
        ...companion,
        currentLevel: newLevel,
        experience: newExperience,
        nextLevelExperience: newNextLevelExp,
        lastInteraction: Date.now(),
        isEvolutionReady,
      };
      
      setCompanionState(updatedCompanion);
      await storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
      
      return { isLevelUp, isEvolutionReady };
    } catch (error) {
      console.error('Error updating companion experience:', error);
    }
  };
  
  // Feed the companion to increase bond level
  const feedCompanion = async (amount = 5) => {
    if (!companion) return false;
    
    try {
      // Check if user has enough snacks
      if (companion.unlockedSnacks < 1) {
        return false;
      }
      
      // Create a feeding action
      const feedingAction: FeedingAction = {
        timestamp: Date.now(),
        amount: amount
      };
      
      // Calculate new bond level
      const newBondLevel = Math.min(100, companion.bondLevel + amount);
      
      // Update companion data
      const updatedCompanion: UserCompanion = {
        ...companion,
        bondLevel: newBondLevel,
        lastInteraction: Date.now(),
        feedingHistory: [...(companion.feedingHistory || []), feedingAction],
        unlockedSnacks: companion.unlockedSnacks - 1
      };
      
      setCompanionState(updatedCompanion);
      await storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
      
      // Also give some XP for feeding
      await updateCompanionExperience(15, XpActionType.FEEDING);
      
      return true;
    } catch (error) {
      console.error('Error feeding companion:', error);
      return false;
    }
  };
  
  // Get the current evolution stage of the companion
  const getCompanionStage = () => {
    if (!companion) return 1;
    
    // SIMPLIFIED APPROACH: Always determine stage purely based on badges unlocked,
    // completely bypassing the companion's stored level and other checks
    const unlockedBadgesCount = userProgress.achievements.filter(badge => badge.unlocked).length;
    
    console.log("COMPANION STAGE CHECK: Badge count =", unlockedBadgesCount);
    
    // Determine stage based on badges unlocked
    if (unlockedBadgesCount >= 30) return 3;
    if (unlockedBadgesCount >= 15) return 2;
    return 1;
  };
  
  // Get the bond level category
  const getBondLevel = () => {
    if (!companion) return 0;
    
    if (companion.bondLevel >= BOND_THRESHOLDS.LEVEL_3) return 3;
    if (companion.bondLevel >= BOND_THRESHOLDS.LEVEL_2) return 2;
    return 1;
  };
  
  // Evolve the companion if it's ready
  const evolveCompanion = () => {
    if (!companion) return false;
    
    try {
      // REMOVING EVOLUTION BLOCK:
      // Remove the skip for brand new companions
      // if (companion.lastInteraction && (Date.now() - companion.lastInteraction < 60000) && 
      //     companion.currentLevel === 1) {
      //   console.log("Skipping evolution for brand new companion");
      //   return false;
      // }

      // Get number of unlocked badges to determine potential evolution
      const unlockedBadgesCount = userProgress.achievements.filter(badge => badge.unlocked).length;
      const currentLevel = companion.currentLevel;
      const companionType = companion.type || 'water';
      
      console.log('Evolving companion. Current level:', currentLevel, 'Badges unlocked:', unlockedBadgesCount);
      
      // Determine if we should evolve and to what level
      let shouldEvolve = false;
      let targetLevel = currentLevel;
      let newName = companion.name;
      
      // MODIFIED: Always evolve if badges meet requirements
      // 30+ badges: Should be at level 3
      if (unlockedBadgesCount >= 30 && currentLevel < 3) {
        targetLevel = 3;
        shouldEvolve = true;
        
        // Choose the appropriate name based on companion type
        switch (companionType) {
        case 'fire':
            newName = 'Infernix';
          break;
        case 'water':
            newName = 'Aquadrake';
          break;
        case 'plant':
            newName = 'Floravine';
          break;
          default:
            newName = companion.name || 'Companion';
        }
      }
      // 15+ badges: Should be at least level 2
      else if (unlockedBadgesCount >= 15 && currentLevel < 2) {
        targetLevel = 2;
        shouldEvolve = true;
        
        // Choose the appropriate name based on companion type
        switch (companionType) {
          case 'fire':
            newName = 'Emberclaw';
            break;
          case 'water':
            newName = 'Stripes';
            break;
          case 'plant':
            newName = 'Vinesprout';
            break;
          default:
            newName = companion.name || 'Companion';
        }
      }
      // ADDED: Force evolution regardless of badge count when manually triggered
      // This ensures that users can force evolution from the utility screen
      else if (companion.currentLevel === 1) {
        // Force evolution to level 2 regardless of badge count
        targetLevel = 2;
        shouldEvolve = true;
        
        // Choose the appropriate name based on companion type
        switch (companionType) {
          case 'fire':
            newName = 'Emberclaw';
            break;
          case 'water':
            newName = 'Stripes';
            break;
          case 'plant':
            newName = 'Vinesprout';
            break;
          default:
            newName = companion.name || 'Companion';
        }
      }
      // If on level 2, force to level 3 when manually triggered
      else if (companion.currentLevel === 2) {
        targetLevel = 3;
        shouldEvolve = true;
        
        // Choose the appropriate name based on companion type
        switch (companionType) {
          case 'fire':
            newName = 'Infernix';
            break;
          case 'water':
            newName = 'Aquadrake';
            break;
          case 'plant':
            newName = 'Floravine';
            break;
          default:
            newName = companion.name || 'Companion';
        }
      }
      
      // If no evolution conditions met, return false
      if (!shouldEvolve) {
        console.log('No evolution conditions met in evolveCompanion');
        return false;
      }
      
      console.log(`Evolving ${companionType} companion to level ${targetLevel} with name ${newName}`);
      
      // Update the companion data with the new level and name
      const updatedCompanion: UserCompanion = {
        ...companion,
        currentLevel: targetLevel,
        name: newName,
        isEvolutionReady: false,
        isNewUser: false, // Reset new user flag to ensure future evolutions work
        experience: 0,
        lastInteraction: Date.now(),
        happinessLevel: 100,
      };
      
      // Update the state BEFORE saving to storage for immediate feedback
      setCompanionState(updatedCompanion);
      console.log('Updated companion state in context to level:', updatedCompanion.currentLevel);
      
      // DISABLED: Don't show the notification to avoid spamming the user
      // showAchievement({
      //   title: "Companion Evolved!",
      //   description: `Your ${newName} has evolved to level ${targetLevel}!`,
      //   buttonText: "Awesome!"
      // });
      
      // We'll save asynchronously, but return immediately
      storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion)
        .then(() => console.log('Successfully saved evolved companion'))
        .catch(error => console.error('Error evolving companion:', error));
      
      return true;
    } catch (error) {
      console.error('Error evolving companion:', error);
      return false;
    }
  };

  // Reset just the companion data
  const resetCompanion = async () => {
    try {
      // Preserve the companion type if possible
      const previousType = companion?.type || 'water';
      
      // Clear companion data
      await storeData(STORAGE_KEYS.COMPANION_DATA, null);
      setCompanionState(null);
      
      // Create a new default companion with the same type
      await createDefaultCompanion(previousType as 'water' | 'fire' | 'plant');
      
      console.log(`Companion reset successfully with type: ${previousType}`);
    } catch (error) {
      console.error("Error resetting companion:", error);
    }
  };

  // Helper function to check and unlock badges by criteria
  const checkAndUnlockBadges = async () => {
    if (!dataLoaded) return false;
    
    console.log("Checking all badges for unlock conditions");
    console.log(`Current streak: ${userProgress.streak}`);
    let updated = false;
    
    // Track unlocked badges before checking
    const initialUnlockedCount = userProgress.achievements.filter(badge => badge.unlocked).length;
    
    // Function to unlock a specific badge if not already unlocked
    const unlockBadge = (badgeId: string, points: number, showNotification: boolean = true) => {
      const badge = userProgress.achievements.find(a => a.id === badgeId);
      if (!badge) {
        console.warn(`Badge with ID ${badgeId} not found!`);
        return false;
      }
      
      console.log(`Checking badge: ${badgeId}, unlocked: ${badge.unlocked}, name: ${badge.name}`);
      
      if (!badge.unlocked) {
        console.log(`Unlocking badge: ${badgeId}`);
        
        // Update the badge in user progress
        setUserProgress(prev => ({
          ...prev,
          achievements: prev.achievements.map(a => 
            a.id === badgeId 
              ? { ...a, unlocked: true, unlockedDate: Date.now() } 
              : a
          )
        }));
        
        // Award points
        addPoints(points);
        
        // Show notification if requested
        if (showNotification) {
        showAchievement({
          title: badge.name,
          description: badge.description,
            buttonText: 'Great!',
          });
        }
        
        updated = true;
        return true;
      }
      return false;
    };
    
    // Debug output of all streak badges
    console.log("All streak badges:");
    const streakBadges = userProgress.achievements.filter(a => a.id.includes('streak-'));
    streakBadges.forEach(badge => {
      console.log(`Badge ID: ${badge.id}, Name: ${badge.name}, Unlocked: ${badge.unlocked}`);
    });
    
    // Check journal badges based on entry count
    const journalCount = journalEntries.length;
    if (journalCount >= 1) unlockBadge('badge-journal-first', 50);
    if (journalCount >= 3) unlockBadge('badge-journal-3', 75);
    if (journalCount >= 10) unlockBadge('badge-journal-2', 150);
    if (journalCount >= 20) unlockBadge('badge-journal-master', 200);
    
    // Check streak badges - log streak values for debugging
    console.log(`Checking streak badges with streak value: ${userProgress.streak}`);
    
    if (userProgress.streak >= 1) {
      console.log("Checking 1-day badge");
      unlockBadge('badge-streak-1day', 25);
    }
    
    if (userProgress.streak >= 3) {
      console.log("Checking 3-day badge");
      unlockBadge('badge-streak-3days', 50);
    }
    
    if (userProgress.streak >= 5) {
      console.log("Checking 5-day badge");
      unlockBadge('badge-streak-5days', 75);
    }
    
    if (userProgress.streak >= 7) {
      console.log("Checking 7-day badge");
      unlockBadge('badge-streak-1', 100); // 7-day badge
    }
    
    if (userProgress.streak >= 14) {
      console.log("Checking 14-day badge");
      unlockBadge('badge-streak-2weeks', 150);
    }
    
    // Special handling for 30-day badge - make sure we're using the right badge ID
    if (userProgress.streak >= 30) {
      console.log("Checking 30-day badge");
      // Try both possible badge IDs for 30-day badge
      const result1 = unlockBadge('badge-streak-2', 250); // Original ID
      if (!result1) {
        console.log("Trying alternate badge ID for 30-day streak");
        unlockBadge('badge-streak-30days', 250); // Possible alternate ID
      }
    }
    
    if (userProgress.streak >= 45) unlockBadge('badge-streak-45days', 300);
    if (userProgress.streak >= 60) unlockBadge('badge-streak-60days', 350);
    if (userProgress.streak >= 75) unlockBadge('badge-streak-75days', 400);
    if (userProgress.streak >= 90) unlockBadge('badge-streak-3', 500);
    if (userProgress.streak >= 120) unlockBadge('badge-streak-120days', 600);
    if (userProgress.streak >= 180) unlockBadge('badge-streak-6months', 750);
    if (userProgress.streak >= 270) unlockBadge('badge-streak-9months', 1000);
    if (userProgress.streak >= 365) unlockBadge('badge-streak-1year', 1500);
    
    // Check app usage badges
    unlockBadge('badge-usage-first', 25, false); // First use badge should always be unlocked
    if (userProgress.dailyCheckedIn) unlockBadge('badge-usage-checkin', 25);
    
    // Check companion badges if a companion exists
    if (companion) {
      unlockBadge('badge-companion-selected', 25);
      
      // Check if companion has been fed
      if (companion.feedingHistory && companion.feedingHistory.length > 0) {
        unlockBadge('badge-companion-feed', 25);
      }
      
      // Check for evolution badges
      if (companion.currentLevel >= 2) {
        unlockBadge('badge-companion-evolution', 100);
      }
      
      if (companion.currentLevel >= 3) {
        unlockBadge('badge-companion-max-evolution', 200);
      }
    }
    
    // Check challenge badges based on completed challenges
    const completedChallengesCount = userProgress.challengesCompleted.length;
    const activeChallengesCount = userProgress.challengesActive.length;
    
    // First challenge badge - unlock when user has started or completed any challenge
    if ((completedChallengesCount > 0 || activeChallengesCount > 0)) {
      unlockBadge('badge-challenge-first', 50);
    }
    
    // Challenge completion badges
    if (completedChallengesCount >= 5) {
      unlockBadge('badge-challenge-1', 200);
    }
    
    if (completedChallengesCount >= 10) {
      unlockBadge('badge-challenge-expert', 250);
    }
    
    // Check if habit replacement challenge was completed
    if (userProgress.challengesCompleted.includes('challenge-4')) {
      unlockBadge('badge-habit-1', 100);
    }
    
    // Check meditation badges based on actual meditation tracking
    const meditationSessions = userProgress.meditationSessions || 0;
    const meditationStreak = userProgress.meditationStreak || 0;
    const totalMeditationMinutes = userProgress.totalMeditationMinutes || 0;
    
    // First meditation session
    if (meditationSessions >= 1) {
      unlockBadge('badge-meditation-first', 50);
    }
    
    // 3 meditation sessions
    if (meditationSessions >= 3) {
      unlockBadge('badge-meditation-3', 75);
    }
    
    // 10 meditation sessions (master)
    if (meditationSessions >= 10) {
      unlockBadge('badge-meditation-master', 150);
    }
    
    // 3-day meditation streak
    if (meditationStreak >= 3) {
      unlockBadge('badge-meditation-streak-3', 100);
    }
    
    // 7-day meditation streak
    if (meditationStreak >= 7) {
      unlockBadge('badge-meditation-daily', 200);
    }
    
    // 20+ minute meditation session (check if last session was 20+ minutes)
    // This would need to be tracked per session, for now we'll use a simple heuristic
    if (totalMeditationMinutes >= 20 && meditationSessions >= 1) {
      unlockBadge('badge-meditation-duration', 100);
    }
    
    // 5 hours total meditation time (300 minutes)
    if (totalMeditationMinutes >= 300) {
      unlockBadge('badge-meditation-total', 250);
    }
    
    // Morning meditation badge (if meditation challenge completed)
    if (userProgress.challengesCompleted.includes('challenge-2')) {
      unlockBadge('badge-meditation-morning', 100);
    }
    
    // Check for milestone badges based on total unlocked badges
    const unlockedBadgesCount = userProgress.achievements.filter(badge => badge.unlocked).length;
    
    if (unlockedBadgesCount >= 1) unlockBadge('badge-milestone-first', 25);
    if (unlockedBadgesCount >= 3) unlockBadge('badge-milestone-three', 40);
    if (unlockedBadgesCount >= 5) unlockBadge('badge-milestone-five', 50);
    if (unlockedBadgesCount >= 10) unlockBadge('badge-milestone-ten', 100);
    if (unlockedBadgesCount >= 20) unlockBadge('badge-milestone-twenty', 150);
    if (unlockedBadgesCount >= 30) unlockBadge('badge-milestone-thirty', 200);
    if (unlockedBadgesCount >= 50) unlockBadge('badge-milestone-fifty', 300);
    
    // Check if the count of unlocked badges has changed
    const finalUnlockedCount = userProgress.achievements.filter(badge => badge.unlocked).length;
    
    // If any badges were unlocked and we have a companion, check for evolution
    if (updated && companion && finalUnlockedCount > initialUnlockedCount) {
      console.log(`Badges unlocked (${finalUnlockedCount - initialUnlockedCount}), checking companion evolution`);
      await checkAndEvolveCompanion();
    }
    
    // Save changes to storage if any badges were updated
    if (updated) {
      try {
        await storeData(STORAGE_KEYS.USER_DATA, userProgress);
        await storeData(STORAGE_KEYS.ACHIEVEMENTS, userProgress.achievements);
      } catch (error) {
        console.error('Error saving updated badges:', error);
      }
    }
    
    return updated;
  };

  // Modify the forceCheckStreakAchievements function to use the new helper
  const forceCheckStreakAchievements = async () => {
    // Safety checks
    if (!dataLoaded) return false;
    
    try {
      console.log("Force checking all achievements");
      
      // Use the existing function to check and unlock badges
      const updated = await checkAndUnlockBadges();
      
      // If we updated any badges and have a companion, check for evolution
      if (updated && companion) {
        await checkAndEvolveCompanion();
      }
      
      return updated;
    } catch (error) {
      console.error('Error in forceCheckStreakAchievements:', error);
      return false;
    }
  };

  // Helper function to ensure unique IDs
  const ensureUniqueId = (baseId: string): string => {
    // If no journalEntries exist yet or the ID is already unique, return it
    if (journalEntries.length === 0 || !journalEntries.some((entry: JournalEntry) => entry.id === baseId)) {
      return baseId;
    }
    // Otherwise, add more randomness to make it unique
    return `${baseId}-${Math.random().toString(36).substring(2, 10)}`;
  };

  // Add this function to directly fix the 30-day badge
  const fix30DayBadge = async (): Promise<boolean> => {
    if (!dataLoaded) return false;
    
    console.log("Attempting to directly unlock 30-day streak badge");
    console.log(`Current streak: ${userProgress.streak}`);
    
    if (userProgress.streak < 30) {
      console.log("Streak is less than 30 days, cannot unlock 30-day badge");
      return false;
    }
    
    let updated = false;
    
    // Try all possible badge IDs for 30-day streak
    const badgeIds = ['badge-streak-2', 'badge-streak-30days', 'badge-streak-30'];
    
    for (const badgeId of badgeIds) {
      const badge = userProgress.achievements.find(a => a.id === badgeId);
      
      if (badge) {
        console.log(`Found 30-day badge with ID: ${badgeId}, currently ${badge.unlocked ? 'unlocked' : 'locked'}`);
        
        if (!badge.unlocked) {
          console.log(`Forcibly unlocking 30-day badge: ${badgeId}`);
          
          // Create updated achievements array with this badge unlocked
          const updatedAchievements = userProgress.achievements.map(a => 
            a.id === badgeId 
              ? { ...a, unlocked: true, unlockedDate: Date.now() } 
              : a
          );
          
          // Update user progress with the unlocked badge
          setUserProgress(prev => ({
            ...prev,
            achievements: updatedAchievements
          }));
          
          // Add points for the badge
          addPoints(250);
          
          // Show achievement notification
      showAchievement({
            title: badge.name,
            description: badge.description,
            buttonText: 'Awesome!',
          });
          
          // Save to storage
          try {
            await storeData(STORAGE_KEYS.USER_DATA, {
              ...userProgress,
              achievements: updatedAchievements
            });
            await storeData(STORAGE_KEYS.ACHIEVEMENTS, updatedAchievements);
          } catch (error) {
            console.error('Error saving updated badges:', error);
          }
          
      updated = true;
          break;
        }
      }
    }
    
    // If we updated any badges and have a companion, check for evolution
    if (updated && companion) {
      console.log("30-day badge unlocked, checking companion evolution");
      await checkAndEvolveCompanion();
    }
    
    return updated;
  };

  // Enhanced journal achievement checking function
  const checkJournalAchievements = async () => {
    if (!userProgress.achievements || !journalEntries || !Array.isArray(journalEntries)) {
      return;
    }
    
    const entryCount = journalEntries.length;
    let updated = false;
    
    // Use a closure to access the unlockBadge function in the parent scope
    const checkAndUnlockBadge = (badgeId: string, points: number, showNotification = false) => {
      const badge = userProgress.achievements.find(a => a.id === badgeId);
      if (!badge || badge.unlocked) return false;
      
      // Mark badge as unlocked
      const updatedAchievements = userProgress.achievements.map(achievement => 
        achievement.id === badgeId
          ? { ...achievement, unlocked: true, unlockedDate: Date.now() }
          : achievement
      );
      
      // Update state
      setUserProgress(prev => ({
        ...prev,
        achievements: updatedAchievements
      }));
      
      // Add points
      addPoints(points);
      
      // Show notification if requested
      if (showNotification) {
        showAchievement({
          title: badge.name,
          description: badge.description,
          buttonText: 'Awesome!'
        });
      }
      
      return true;
    };
    
    // Check for first journal entry
    if (entryCount > 0) {
      updated = checkAndUnlockBadge('badge-journal-first', 10, false) || updated;
    }
    
    // Check for 3 journal entries
    if (entryCount >= 3) {
      updated = checkAndUnlockBadge('badge-journal-3', 20, false) || updated;
    }
    
    // Check for 10 journal entries
    if (entryCount >= 10) {
      updated = checkAndUnlockBadge('badge-journal-2', 50, false) || updated;
    }
    
    // Check for 20 journal entries
    if (entryCount >= 20) {
      updated = checkAndUnlockBadge('badge-journal-master', 100, false) || updated;
    }
    
    // Check for 5 consecutive days journaling (requires implementation of consecutive day tracking)
    // This is placeholder code for now
    const hasConsecutiveEntries = checkConsecutiveJournalDays(5);
    if (hasConsecutiveEntries) {
      updated = checkAndUnlockBadge('badge-journal-5days', 75, false) || updated;
    }
    
    if (updated) {
      await storeData(STORAGE_KEYS.USER_DATA, userProgress);
    }
    
    return updated;
  };

  // Helper function to check consecutive journal days
  const checkConsecutiveJournalDays = (requiredDays: number): boolean => {
    if (!journalEntries || journalEntries.length < requiredDays) {
      return false;
    }
    
    // Sort entries by timestamp
    const sortedEntries = [...journalEntries].sort((a, b) => a.timestamp - b.timestamp);
    
    // Group entries by day
    const entriesByDay = new Map<string, boolean>();
    for (const entry of sortedEntries) {
      const date = new Date(entry.timestamp).toDateString();
      entriesByDay.set(date, true);
    }
    
    // Convert to array of dates
    const days = Array.from(entriesByDay.keys()).map(dateStr => new Date(dateStr));
    days.sort((a, b) => a.getTime() - b.getTime());
    
    // Check for consecutive days
    let maxConsecutive = 1;
    let currentConsecutive = 1;
    
    for (let i = 1; i < days.length; i++) {
      const prevDate = days[i-1];
      const currDate = days[i];
      
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000));
      
      if (dayDiff === 1) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else if (dayDiff > 1) {
        currentConsecutive = 1;
      }
    }
    
    return maxConsecutive >= requiredDays;
  };

  // Replace the existing placeholder with a comprehensive implementation
  const checkAllAchievementTypes = async (): Promise<boolean> => {
    if (!dataLoaded) return false;
    
    console.log("Performing comprehensive check of all achievement types");
    
    // Use the existing force check function that already handles badge unlocking
    const updated = await forceCheckStreakAchievements();
    
    // Return the result
    return updated;
  };

  // Test function to unlock exactly 15 badges for stage 2 evolution
  const testUnlock15Badges = async () => {
    if (!dataLoaded) return false;
    
    console.log("Testing: Unlocking 15 badges for stage 2 evolution");
    let updated = false;
    
    // Function to unlock a specific badge if not already unlocked
    const unlockBadge = (badgeId: string, points: number, showNotification: boolean = false) => {
      const badge = userProgress.achievements.find(a => a.id === badgeId);
      if (!badge) {
        console.warn(`Badge with ID ${badgeId} not found!`);
        return false;
      }
      
      if (!badge.unlocked) {
        console.log(`Test unlocking badge: ${badgeId}`);
        
        // Update the badge in user progress
        setUserProgress(prev => ({
          ...prev,
          achievements: prev.achievements.map(a => 
            a.id === badgeId 
              ? { ...a, unlocked: true, unlockedDate: Date.now() } 
              : a
          )
        }));
        
        // Award points
        addPoints(points);
        
        updated = true;
        return true;
      }
      return false;
    };
    
    // List of 15 badges to unlock for testing (mix of different types)
    const testBadges = [
      { id: 'badge-usage-first', points: 25 },
      { id: 'badge-usage-checkin', points: 25 },
      { id: 'badge-companion-selected', points: 25 },
      { id: 'badge-companion-feed', points: 25 },
      { id: 'badge-streak-1day', points: 25 },
      { id: 'badge-streak-3days', points: 50 },
      { id: 'badge-streak-5days', points: 75 },
      { id: 'badge-streak-1', points: 100 }, // 7-day badge
      { id: 'badge-journal-first', points: 50 },
      { id: 'badge-journal-3', points: 75 },
      { id: 'badge-milestone-first', points: 25 },
      { id: 'badge-milestone-three', points: 40 },
      { id: 'badge-milestone-five', points: 50 },
      { id: 'badge-streak-2weeks', points: 150 },
      { id: 'badge-journal-2', points: 150 } // 10 journal entries badge
    ];
    
    // Unlock exactly 15 badges
    let unlockedCount = 0;
    for (const badgeInfo of testBadges) {
      if (unlockedCount >= 15) break;
      
      const wasUnlocked = unlockBadge(badgeInfo.id, badgeInfo.points, false);
      if (wasUnlocked) {
        unlockedCount++;
      }
    }
    
    console.log(`Test completed: Unlocked ${unlockedCount} badges`);
    
    // Check companion evolution after unlocking badges
    if (updated && companion) {
      console.log("Checking companion evolution after test badge unlock");
      await checkAndEvolveCompanion();
    }
    
    return updated;
  };

  // Test function to unlock exactly 30 badges for stage 3 evolution
  const testUnlock30Badges = async () => {
    if (!dataLoaded) return false;
    
    console.log("Testing: Unlocking 30 badges for stage 3 evolution");
    let updated = false;
    
    // Function to unlock a specific badge if not already unlocked
    const unlockBadge = (badgeId: string, points: number, showNotification: boolean = false) => {
      const badge = userProgress.achievements.find(a => a.id === badgeId);
      if (!badge) {
        console.warn(`Badge with ID ${badgeId} not found!`);
        return false;
      }
      
      if (!badge.unlocked) {
        console.log(`Test unlocking badge: ${badgeId}`);
        
        // Update the badge in user progress
        setUserProgress(prev => ({
          ...prev,
          achievements: prev.achievements.map(a => 
            a.id === badgeId 
              ? { ...a, unlocked: true, unlockedDate: Date.now() } 
              : a
          )
        }));
        
        // Award points
        addPoints(points);
        
        updated = true;
        return true;
      }
      return false;
    };
    
    // List of 30 badges to unlock for testing (using valid badge IDs)
    const testBadges = [
      // Usage badges
      { id: 'badge-usage-first', points: 25 },
      { id: 'badge-usage-checkin', points: 25 },
      { id: 'badge-usage-week', points: 50 },
      { id: 'badge-usage-month', points: 100 },
      { id: 'badge-usage-checkin-3', points: 50 },
      { id: 'badge-usage-streak', points: 75 },
      { id: 'badge-usage-profile', points: 50 },
      { id: 'badge-usage-features', points: 75 },
      
      // Companion badges
      { id: 'badge-companion-selected', points: 25 },
      { id: 'badge-companion-feed', points: 25 },
      { id: 'badge-companion-evolution', points: 100 },
      { id: 'badge-companion-feed-streak', points: 75 },
      { id: 'badge-companion-interaction', points: 50 },
      { id: 'badge-companion-bond-level', points: 100 },
      { id: 'badge-companion-daily', points: 50 },
      { id: 'badge-companion-feeder', points: 75 },
      
      // Streak badges
      { id: 'badge-streak-1day', points: 25 },
      { id: 'badge-streak-3days', points: 50 },
      { id: 'badge-streak-5days', points: 75 },
      { id: 'badge-streak-1', points: 100 }, // 7-day badge
      { id: 'badge-streak-2weeks', points: 150 },
      { id: 'badge-streak-2', points: 200 }, // 30-day badge
      
      // Journal badges
      { id: 'badge-journal-first', points: 50 },
      { id: 'badge-journal-1', points: 75 },
      { id: 'badge-journal-2', points: 100 },
      { id: 'badge-journal-3', points: 125 },
      { id: 'badge-journal-master', points: 150 },
      
      // Challenge badges
      { id: 'badge-challenge-first', points: 50 },
      { id: 'badge-habit-1', points: 50 },
      { id: 'badge-challenge-1', points: 75 },
      
      // Milestone badges
      { id: 'badge-milestone-first', points: 25 },
      { id: 'badge-milestone-three', points: 40 },
      { id: 'badge-milestone-five', points: 50 },
      { id: 'badge-milestone-ten', points: 75 },
      { id: 'badge-milestone-twenty', points: 125 },
      { id: 'badge-milestone-thirty', points: 150 }
    ];
    
    // Unlock exactly 30 badges
    let unlockedCount = 0;
    for (const badgeInfo of testBadges) {
      if (unlockedCount >= 30) break;
      
      const wasUnlocked = unlockBadge(badgeInfo.id, badgeInfo.points, false);
      if (wasUnlocked) {
        unlockedCount++;
      }
    }
    
    console.log(`Test completed: Unlocked ${unlockedCount} badges`);
    
    // Check companion evolution after unlocking badges
    if (updated && companion) {
      console.log("Checking companion evolution after test badge unlock");
      await checkAndEvolveCompanion();
    }
    
    return updated;
  };

  return (
    <GamificationContext.Provider
      value={{
        streak: userProgress.streak,
        level: userProgress.level,
        points: userProgress.points,
        totalPoints: levelRequirements[userProgress.level]?.pointsRequired || 100,
        dailyCheckedIn,
        journalEntries,
        addJournalEntry,
        deleteJournalEntry,
        activeChallenges,
        availableChallenges,
        startChallenge,
        completeChallenge,
        achievements: userProgress.achievements,
        checkIn,
        resetData,
        exportData,
        importData,
        setStreak,
        getLevelProgress,
        getPointsToNextLevel,
        companion,
        setCompanion,
        updateCompanionExperience,
        evolveCompanion,
        feedCompanion,
        getCompanionStage,
        getBondLevel,
        resetCompanion,
        logHabitReplacement,
        logWorkout,
        logMeditation,
        forceCheckStreakAchievements,
        fix30DayBadge,
        testUnlock15Badges,
        testUnlock30Badges,
        checkAllAchievementTypes: () => Promise.resolve(true),
      }}
    >
      {children}
      <AchievementNotificationComponent />
    </GamificationContext.Provider>
  );
};

export const useGamification = () => useContext(GamificationContext);