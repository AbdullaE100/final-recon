import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storeData, getData, STORAGE_KEYS, clearAllData } from '@/utils/storage';
import {
  UserProgress,
  JournalEntry,
  Challenge,
  ChallengeStep,
  Achievement,
  LevelRequirement,
  ActivityLog,
  ActivityStats,
  ActivityType,
  ChallengeRewards
} from '@/types/gamification';
import { getStartOfDay, isToday } from '@/utils/dateUtils';
import { Alert, Platform, NativeModules } from 'react-native';
import { loadStreakData, updateStreak, performCheckIn as serviceCheckIn, DEFAULT_USER_ID, checkAndAdjustStreak } from '@/utils/streakService';
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
    type: 'habit'
  },
  {
    id: 'challenge-2',
    title: 'Morning Meditation',
    description: 'Start your day with a 5-minute meditation session.',
    isDaily: true,
    points: 30,
    progress: 0,
    type: 'meditation'
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
    },
    type: 'habit'
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
    },
    type: 'habit'
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
    type: 'workout'
  },
  // Additional challenges
  {
    id: 'challenge-6',
    title: 'Evening Reflection',
    description: 'End your day with a 10-minute reflection session.',
    isDaily: true,
    points: 40,
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-7',
    title: 'Reading Time',
    description: 'Read a recovery-focused book for 15 minutes each day.',
    isDaily: true,
    points: 35,
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-8',
    title: 'Mindful Walking',
    description: 'Take a 20-minute mindful walk outdoors.',
    isDaily: true,
    points: 30,
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-9',
    title: 'Gratitude Practice',
    description: 'Write down three things you\'re grateful for each day.',
    isDaily: true,
    points: 25,
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-10',
    title: 'Healthy Eating',
    description: 'Prepare nutritious meals for 5 days.',
    isDaily: false,
    points: 110,
    steps: [
      { id: 'step-1', description: 'Day 1 healthy meal', completed: false },
      { id: 'step-2', description: 'Day 2 healthy meal', completed: false },
      { id: 'step-3', description: 'Day 3 healthy meal', completed: false },
      { id: 'step-4', description: 'Day 4 healthy meal', completed: false },
      { id: 'step-5', description: 'Day 5 healthy meal', completed: false },
    ],
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-11',
    title: 'Social Connection',
    description: 'Reach out to a supportive friend or family member 3 times this week.',
    isDaily: false,
    points: 90,
    steps: [
      { id: 'step-1', description: 'First connection', completed: false },
      { id: 'step-2', description: 'Second connection', completed: false },
      { id: 'step-3', description: 'Third connection', completed: false },
    ],
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-12',
    title: 'Digital Detox',
    description: 'Limit social media use to 30 minutes per day for a week.',
    isDaily: false,
    points: 140,
    steps: [
      { id: 'step-1', description: 'Day 1 digital limit', completed: false },
      { id: 'step-2', description: 'Day 2 digital limit', completed: false },
      { id: 'step-3', description: 'Day 3 digital limit', completed: false },
      { id: 'step-4', description: 'Day 4 digital limit', completed: false },
      { id: 'step-5', description: 'Day 5 digital limit', completed: false },
      { id: 'step-6', description: 'Day 6 digital limit', completed: false },
      { id: 'step-7', description: 'Day 7 digital limit', completed: false },
    ],
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-13',
    title: 'Sleep Hygiene',
    description: 'Maintain a consistent sleep schedule for 7 nights.',
    isDaily: false,
    points: 130,
    steps: [
      { id: 'step-1', description: 'Night 1 good sleep', completed: false },
      { id: 'step-2', description: 'Night 2 good sleep', completed: false },
      { id: 'step-3', description: 'Night 3 good sleep', completed: false },
      { id: 'step-4', description: 'Night 4 good sleep', completed: false },
      { id: 'step-5', description: 'Night 5 good sleep', completed: false },
      { id: 'step-6', description: 'Night 6 good sleep', completed: false },
      { id: 'step-7', description: 'Night 7 good sleep', completed: false },
    ],
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-14',
    title: 'Hydration Habit',
    description: 'Drink at least 8 glasses of water daily for 5 days.',
    isDaily: false,
    points: 80,
    steps: [
      { id: 'step-1', description: 'Day 1 hydration', completed: false },
      { id: 'step-2', description: 'Day 2 hydration', completed: false },
      { id: 'step-3', description: 'Day 3 hydration', completed: false },
      { id: 'step-4', description: 'Day 4 hydration', completed: false },
      { id: 'step-5', description: 'Day 5 hydration', completed: false },
    ],
    progress: 0,
    type: 'habit'
  },
  {
    id: 'challenge-15',
    title: 'Stress Reduction',
    description: 'Practice a stress-reduction technique each day for a week.',
    isDaily: false,
    points: 120,
    steps: [
      { id: 'step-1', description: 'Day 1 stress reduction', completed: false },
      { id: 'step-2', description: 'Day 2 stress reduction', completed: false },
      { id: 'step-3', description: 'Day 3 stress reduction', completed: false },
      { id: 'step-4', description: 'Day 4 stress reduction', completed: false },
      { id: 'step-5', description: 'Day 5 stress reduction', completed: false },
      { id: 'step-6', description: 'Day 6 stress reduction', completed: false },
      { id: 'step-7', description: 'Day 7 stress reduction', completed: false },
    ],
    progress: 0,
    type: 'habit'
  }
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
  points: 0,
  level: 1,
  totalPoints: 0,
  journalEntries: [],
  activeChallenges: [],
  availableChallenges: initialChallenges,
  completedChallenges: [],
  achievements: initialAchievements,
  lastCheckIn: null,
  dailyCheckedIn: false,
  companion: null,
  activityStats: {
  totalMeditationMinutes: 0,
    totalWorkoutMinutes: 0,
    totalReadingMinutes: 0,
    meditationStreak: 0,
    lastMeditationDate: null,
    workoutStreak: 0,
    lastWorkoutDate: null,
    readingStreak: 0,
    lastReadingDate: null,
  }
};

// Add default activity stats
const defaultActivityStats: ActivityStats = {
  totalMeditationMinutes: 0,
  totalWorkoutMinutes: 0,
  totalHabitReplacements: 0,
  meditationStreak: 0,
  workoutStreak: 0,
  activityLogs: [],
  totalReadingMinutes: 0,
  readingStreak: 0,
  lastReading: 0,
};

interface GamificationContextType {
  // User data
  streak: number;
  level: number;
  points: number;
  totalPoints: number;
  dailyCheckedIn: boolean;
  startDate?: number;
  
  // Journal
  journalEntries: JournalEntry[];
  addJournalEntry: (content: string, options?: { mood?: string, tags?: string[], audioUri?: string, prompt?: string }) => void;
  deleteJournalEntry: (id: string) => void;
  
  // Challenges
  activeChallenges: Challenge[];
  availableChallenges: Challenge[];
  completedChallenges: Challenge[];
  startChallenge: (id: string) => Promise<void>;
  completeChallenge: (id: string) => Promise<void>;
  logHabitReplacement: (description: string) => Promise<boolean>;
  logWorkout: (durationMinutes: number, type: string) => Promise<boolean>;
  logMeditation: (durationMinutes: number, type: string) => Promise<boolean>;
  logReading: (durationMinutes: number, book: string) => Promise<boolean>;
  reloadChallenges: () => void;
  fixStayCleanChallenge: () => Promise<boolean>;
  forceResetAllChallenges: () => Promise<boolean>;
  
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
  getPersonalizedGreeting: (username?: string) => string;
  
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
  testUnlock15Badges: () => Promise<boolean>;
  activityStats: ActivityStats;
  logChallengeProgress: (challengeId: string, note: string) => Promise<boolean>;
}

export const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [userProgress, setUserProgress] = useState<UserProgress>(defaultUserProgress);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [manualStreakSet, setManualStreakSet] = useState(false);
  const { showAchievement } = useAchievementNotification();

  const { 
    streak,
    points,
    level,
    totalPoints,
    journalEntries,
    activeChallenges,
    availableChallenges,
    completedChallenges,
    achievements,
    lastCheckIn,
    dailyCheckedIn,
    companion,
    activityStats,
  } = userProgress;
  
  const updateProgress = (updates: Partial<UserProgress>) => {
    setUserProgress(prev => {
      const newState = { ...prev, ...updates };
      storeData(STORAGE_KEYS.USER_DATA, newState);
      return newState;
    });
  };

  const getPersonalizedGreeting = (username?: string): string => {
    const hours = new Date().getHours();
    let timeOfDayGreeting = 'Hello';
    if (hours < 12) {
      timeOfDayGreeting = 'Good morning';
    } else if (hours < 17) {
      timeOfDayGreeting = 'Good afternoon';
    } else {
      timeOfDayGreeting = 'Good evening';
    }
    return username ? `${timeOfDayGreeting}, ${username}` : timeOfDayGreeting;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedData = await getData<UserProgress>(STORAGE_KEYS.USER_DATA, defaultUserProgress);
        if (storedData) {
          const mergedAchievements = [...initialAchievements];
          if (storedData.achievements) {
            storedData.achievements.forEach(storedAch => {
              const index = mergedAchievements.findIndex(initAch => initAch.id === storedAch.id);
              if (index !== -1) {
                mergedAchievements[index] = { ...mergedAchievements[index], ...storedAch };
              } else {
                mergedAchievements.push(storedAch);
              }
            });
          }
          
          const mergedChallenges = [...initialChallenges];
          if(storedData.availableChallenges){
             storedData.availableChallenges.forEach(storedCh => {
              const index = mergedChallenges.findIndex(initCh => initCh.id === storedCh.id);
              if (index !== -1) {
                mergedChallenges[index] = { ...mergedChallenges[index], ...storedCh };
              } else {
                mergedChallenges.push(storedCh);
              }
            });
          }

          setUserProgress({ 
            ...defaultUserProgress, 
            ...storedData, 
            achievements: mergedAchievements,
            availableChallenges: storedData.availableChallenges || mergedChallenges,
            completedChallenges: storedData.completedChallenges || [],
          });
        } else {
          // No stored data, use defaults
          setUserProgress(defaultUserProgress);
        }
        } catch (error) {
        console.error("Failed to load user progress", error);
        setUserProgress(defaultUserProgress);
      } finally {
        setDataLoaded(true);
      }
    };

    loadData();
  }, []);
  
  const addJournalEntry = (
    content: string, 
    options?: { mood?: string, tags?: string[], audioUri?: string, prompt?: string }
  ) => {
    const newEntry: JournalEntry = {
      id: `journal-${Date.now()}`,
      timestamp: Date.now(),
      content,
      mood: options?.mood,
      tags: options?.tags,
      audioUri: options?.audioUri,
      prompt: options?.prompt,
    };
    
    updateProgress({ journalEntries: [...userProgress.journalEntries, newEntry] });
    
    checkJournalAchievements([...userProgress.journalEntries, newEntry]);
    updateCompanionExperience(10, 'journal');
  };

  const deleteJournalEntry = (id: string) => {
    const newJournalEntries = journalEntries.filter(entry => entry.id !== id);
    updateProgress({ journalEntries: newJournalEntries });
  };
  
  const startChallenge = async (id: string) => {
      const challengeToStart = availableChallenges.find(c => c.id === id);
    if (!challengeToStart) return;

    const newAvailable = availableChallenges.filter(c => c.id !== id);
    const newActive = [...activeChallenges, { ...challengeToStart, startedAt: new Date().toISOString() }];
    
    updateProgress({
      activeChallenges: newActive,
      availableChallenges: newAvailable,
    });
    
    checkChallengeAchievements();
  };

  const completeChallenge = async (id: string) => {
    const challenge = activeChallenges.find(c => c.id === id);
    if (!challenge) {
        return;
      }

    const newPoints = points + challenge.points;
    const newTotalPoints = totalPoints + challenge.points;

    const newActiveChallenges = activeChallenges.filter(c => c.id !== id);
    const newCompletedChallenges = [...(completedChallenges || []), { ...challenge, completedAt: new Date().toISOString(), status: 'completed' }];

    updateProgress({
      points: newPoints,
      totalPoints: newTotalPoints,
      activeChallenges: newActiveChallenges,
      completedChallenges: newCompletedChallenges,
    });
    
    await checkChallengeAchievements(newCompletedChallenges);
    await checkAndEvolveCompanion();
  };

  const logChallengeProgress = async (challengeId: string, note: string): Promise<boolean> => {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (!challenge) return false;

    const newActivity: ActivityLog = {
      id: `activity-${Date.now()}`,
      type: 'challenge_progress',
      timestamp: new Date().toISOString(),
      note: note,
      challengeId: challengeId,
    };
    
    const updatedChallenge = {
      ...challenge,
      activities: [...(challenge.activities || []), newActivity],
      progress: Math.min(100, (challenge.progress || 0) + 25), // Example progress increment
    };
    
    const newActiveChallenges = activeChallenges.map(c => c.id === challengeId ? updatedChallenge : c);
    updateProgress({ activeChallenges: newActiveChallenges });

      return true;
  };

  const checkIn = async () => {
    // ... (checkIn implementation)
  };
  
  const resetData = async () => {
    // ... (resetData implementation)
  };
  
  const exportData = () => {
    // ... (exportData implementation)
  };
  
  const importData = () => {
    // ... (importData implementation)
  };

  const logHabitReplacement = async (description: string): Promise<boolean> => {
    return false;
  };
  const logWorkout = async (durationMinutes: number, type: string): Promise<boolean> => {
        return false;
  };
  const logMeditation = async (durationMinutes: number, type: string): Promise<boolean> => {
      return false;
  };
  const logReading = async (durationMinutes: number, book: string): Promise<boolean> => {
        return false;
  };
  const reloadChallenges = () => {};
  const fixStayCleanChallenge = async (): Promise<boolean> => {
      return false;
  };
  const forceResetAllChallenges = async (): Promise<boolean> => {
      return false;
    };
  const forceCheckStreakAchievements = async (): Promise<boolean> => {
      return false;
  };
  const fix30DayBadge = async (): Promise<boolean> => {
      return false;
  };
  const setStreak = (days: number, startDate?: number) => {};
  const getLevelProgress = (): number => {
    return 0;
  };
  const getPointsToNextLevel = (): number => {
    return 0;
  };
  const setCompanion = (companion: Companion) => {};
  const updateCompanionExperience = async (amount: number, actionType?: XpActionType): Promise<{ isLevelUp: boolean; isEvolutionReady: boolean; } | undefined> => {
    return undefined;
  };
  const evolveCompanion = (): boolean => {
      return false;
    };
  const feedCompanion = async (amount?: number): Promise<boolean> => {
      return false;
  };
  const getCompanionStage = (): number => {
    return 1;
  };
  const getBondLevel = (): number => {
    return 1;
  };
  const resetCompanion = async () => {};
  const checkAllAchievementTypes = async (): Promise<boolean> => {
      return false;
  };
  const testUnlock15Badges = async (): Promise<boolean> => {
    return false;
  };
  const checkChallengeAchievements = async (completed?: Challenge[]) => {};
  const checkJournalAchievements = async (entries?: JournalEntry[]) => {};
  const checkAndEvolveCompanion = async () => {};

  return (
    <GamificationContext.Provider
      value={{
        ...userProgress,
        addJournalEntry,
        deleteJournalEntry,
        checkIn,
        resetData,
        exportData,
        importData,
        startChallenge,
        completeChallenge,
        logHabitReplacement,
        logWorkout,
        logMeditation,
        logReading,
        reloadChallenges,
        fixStayCleanChallenge,
        forceResetAllChallenges,
        forceCheckStreakAchievements,
        fix30DayBadge,
        setStreak,
        getLevelProgress,
        getPointsToNextLevel,
        setCompanion,
        updateCompanionExperience,
        evolveCompanion,
        feedCompanion,
        getCompanionStage,
        getBondLevel,
        resetCompanion,
        checkAllAchievementTypes,
        testUnlock15Badges,
        logChallengeProgress,
        getPersonalizedGreeting,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => useContext(GamificationContext);