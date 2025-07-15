import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
import { isToday } from '@/utils/dateUtils';
import { Alert, Platform, NativeModules, AppState, AppStateStatus } from 'react-native';
import { Companion, CompanionType, UserCompanion, EVOLUTION_THRESHOLDS, BOND_THRESHOLDS, XpActionType, FeedingAction } from '@/types/companion';
import useAchievementNotification, { AchievementProps } from '@/hooks/useAchievementNotification';
import { format, startOfDay, differenceInDays, isSameDay, addDays } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { resetStreakToOne } from '@/utils/resetStreakData';
import { useCurrentUserId } from '@/hooks/useCurrentUserId';
import { isProcessing } from '@/utils/processingLock';

// Initial challenges
const initialChallenges: Challenge[] = [
  {
    id: 'challenge-1',
    title: 'Stay Clean Today',
    description: 'Complete a full day without relapsing.',
    isDaily: true,
    points: 50,
    progress: 0,
    type: 'habit',
    rewards: {
      badgeId: 'badge-challenge-first',
      badgeName: 'Challenger'
    }
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
  badgesEarned: [],
  challengesCompleted: [],
  challengesActive: [],
  achievements: initialAchievements,
  lastCheckIn: null,
  dailyCheckedIn: false,
  companion: null,
  activityStats: {
    totalMeditationMinutes: 0,
    totalWorkoutMinutes: 0,
    totalReadingMinutes: 0,
    meditationStreak: 0,
    lastMeditation: 0,
    workoutStreak: 0,
    lastWorkout: 0,
    readingStreak: 0,
    lastReading: 0,
    totalHabitReplacements: 0,
    activityLogs: [],
  }
};

// Add default activity stats
const defaultActivityStats: ActivityStats = {
  totalMeditationMinutes: 0,
  totalWorkoutMinutes: 0,
  totalHabitReplacements: 0,
  meditationStreak: 0,
  workoutStreak: 0,
  lastMeditation: 0,
  lastWorkout: 0,
  activityLogs: [],
  totalReadingMinutes: 0,
  readingStreak: 0,
  lastReading: 0,
};

/**
 * Helper function to detect the infamous 730-day bug
 */
const isKnown730Bug = (streakValue: number): boolean => {
  return streakValue >= 730; // The bug typically manifests as exactly 730 days
};

/**
 * Helper function to detect the 30-day bug with future start date
 */
const isFutureStartDateBug = (streakValue: number, startDateValue?: number): boolean => {
  if (startDateValue && streakValue === 30) {
    return startDateValue > Date.now(); // The bug has a future start date
  }
  return false;
};

interface GamificationContextType {
  // User data
  streak: number;
  level: number;
  points: number;
  totalPoints: number;
  dailyCheckedIn: boolean;
  startDate?: number;
  lastCheckIn: number | null;
  
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
  const [isLoading, setIsLoading] = useState(true);
  const [manualStreakSet, setManualStreakSet] = useState(false);
  const { showAchievement } = useAchievementNotification();
  const userId = useCurrentUserId();
  // Track app state for background/foreground transitions
  const appState = useRef(AppState.currentState);

  // Force refresh all data from storage
  const forceRefresh = async () => {
    try {
      console.log('GamificationContext: Force refreshing data...');
      setIsLoading(true);
      
      // Load user data from storage
      const savedData = await getData(STORAGE_KEYS.USER_DATA, defaultUserProgress);
      
      // Load journal entries
      const savedJournalEntries = await getData(STORAGE_KEYS.JOURNAL_ENTRIES, []);
      
      // Load challenges
      const savedActiveChallenges = await getData(STORAGE_KEYS.ACTIVE_CHALLENGES, []);
      const savedCompletedChallenges = await getData(STORAGE_KEYS.CHALLENGES, []);
      
      // Load achievements
      const savedAchievements = await getData(STORAGE_KEYS.ACHIEVEMENTS, []);
      
      // Load companion data
      const savedCompanion = await getData(STORAGE_KEYS.COMPANION_DATA, null);
      
      // Load activity stats
      const savedActivityStats = await getData(STORAGE_KEYS.ACTIVITY_STATS, defaultActivityStats);
      
      // Update all data in one go
      updateProgress({
        ...savedData,
        journalEntries: savedJournalEntries,
        activeChallenges: savedActiveChallenges,
        completedChallenges: savedCompletedChallenges,
        achievements: savedAchievements,
        companion: savedCompanion,
        activityStats: savedActivityStats
      });
      
      // Make sure window instance is available for future use
      if (typeof window !== 'undefined') {
        // Use a type-safe approach to add the property to window
        (window as any).gamificationContextInstance = {
          setStreak: setStreak,
          forceRefresh: forceRefresh
        };
      }
      
      setDataLoaded(true);
      setIsLoading(false);
      console.log('GamificationContext: Force refresh complete');
      
      return true;
    } catch (error) {
      console.error('GamificationContext: Error during force refresh:', error);
      setIsLoading(false);
      return false;
    }
  };

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
  
  const updateProgress = (updates: Partial<UserProgress>, options?: { skipSave?: boolean }) => {
    setUserProgress(prev => {
      const newState = { ...prev, ...updates };
      if (!options?.skipSave) {
        storeData(STORAGE_KEYS.USER_DATA, newState);
      }
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
      if (isProcessing()) {
        console.log('[GamificationContext] Skipping loadData: Processing lock is active.');
        return;
      }
      console.log('[GamificationContext] Starting to load data...');
      try {
        console.log('GamificationContext: Loading data...');
        setIsLoading(true);
        
        // Load user data from storage
        const savedData = await getData(STORAGE_KEYS.USER_DATA, defaultUserProgress);
        
        // Apply any data migrations or fixes here
        const migratedData = { ...savedData };
        
        // Set the user progress state
        setUserProgress(migratedData);
        
        // Load journal entries
        const savedJournalEntries = await getData(STORAGE_KEYS.JOURNAL_ENTRIES, []);
        
        // Load challenges
        const savedActiveChallenges = await getData(STORAGE_KEYS.ACTIVE_CHALLENGES, []);
        const savedCompletedChallenges = await getData(STORAGE_KEYS.CHALLENGES, []);
        
        // Load achievements
        const savedAchievements = await getData(STORAGE_KEYS.ACHIEVEMENTS, []);
        
        // Load companion data
        const savedCompanion = await getData(STORAGE_KEYS.COMPANION_DATA, null);
        
        // Load activity stats
        const savedActivityStats = await getData(STORAGE_KEYS.ACTIVITY_STATS, defaultActivityStats);
        
        // Update all data in one go
        updateProgress({
          ...migratedData,
          journalEntries: savedJournalEntries,
          activeChallenges: savedActiveChallenges,
          completedChallenges: savedCompletedChallenges,
          achievements: savedAchievements,
          companion: savedCompanion,
          activityStats: savedActivityStats
        });
        
        // Check for new user
        const isOnboardingCompleted = await getData(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
        const isNewUser = isOnboardingCompleted === false;
        
        // For new users, ensure streak is set to 0
        if (isNewUser) {
          console.log('GamificationContext: New user detected - setting streak to 0');
          setStreak(0);
        }
        
        setDataLoaded(true);
        setIsLoading(false);
        console.log('GamificationContext: Data loaded successfully');
      } catch (error) {
        console.error('GamificationContext: Error loading data:', error);
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Add AppState listener to check for date changes when app resumes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (isProcessing()) {
        console.log('[GamificationContext] Skipping AppState change handler: Processing lock is active.');
        return;
      }
      // Only run this when the app comes to the foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!');
        
        // Check if we need to update the streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastCheck = userProgress.lastCheckIn ? new Date(userProgress.lastCheckIn) : null;
        
        if (!lastCheck || !isSameDay(lastCheck, today)) {
          console.log('GamificationContext: Day changed since last check, updating data...');
          
          // Load data again
          try {
            setIsLoading(true);
            const savedData = await getData(STORAGE_KEYS.USER_DATA, defaultUserProgress);
            setUserProgress(savedData);
            setIsLoading(false);
          } catch (error) {
            console.error('GamificationContext: Error refreshing data:', error);
            setIsLoading(false);
          }
        }
      }
      
      appState.current = nextAppState;
    };

    // Subscribe to app state changes
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    // Run an immediate check when this effect is first setup
    handleAppStateChange('active');

    // Cleanup subscription
    return () => {
      appStateSubscription.remove();
    };
  }, [userProgress.streak]); // Include streak in dependencies to avoid checking too frequently with same value
  
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
    updateCompanionExperience(10, XpActionType.JOURNAL_ENTRY);
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

    // Unlock 'Challenger' badge for starting first challenge
    const currentAchievements = [...userProgress.achievements];
    const challengerBadge = currentAchievements.find(a => a.id === 'badge-challenge-first');
    if (challengerBadge && !challengerBadge.unlocked) {
      challengerBadge.unlocked = true;
      updateProgress({ achievements: currentAchievements });
      showAchievement?.({
        title: challengerBadge.name || 'Challenger',
        description: challengerBadge.description || 'Started your first challenge',
        buttonText: 'Awesome!'
      });
    }
  };

  const completeChallenge = async (id: string) => {
    // Find the challenge
    const challenge = userProgress.activeChallenges.find(c => c.id === id) ||
      userProgress.availableChallenges.find(c => c.id === id) ||
      userProgress.completedChallenges.find(c => c.id === id);
    if (!challenge) return;

    // Mark challenge as completed (existing logic)
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

    // Unlock badge if this challenge has a badge reward
    if (challenge.rewards && challenge.rewards.badgeId) {
      const badgeId = challenge.rewards.badgeId;
      const currentAchievements = [...userProgress.achievements];
      const badge = currentAchievements.find(a => a.id === badgeId);
      if (badge && !badge.unlocked) {
        badge.unlocked = true;
        updateProgress({ achievements: currentAchievements });
        showAchievement?.({
          title: badge.name || 'Challenge Badge Unlocked',
          description: badge.description || 'Unlocked a badge by completing a challenge!',
          buttonText: 'Awesome!'
        });
      }
    }
  };

  const logChallengeProgress = async (challengeId: string, note: string): Promise<boolean> => {
    const challenge = activeChallenges.find(c => c.id === challengeId);
    if (!challenge) return false;

    const newActivity: ActivityLog = {
      id: `activity-${Date.now()}`,
      type: 'challenge_progress',
      timestamp: Date.now(), // Use number for timestamp
      note: note,
      challengeId: challengeId,
    };
    
    // Create a deep copy of the challenge and its activities array
    const updatedChallenge: Challenge = {
      ...challenge,
      activities: [...(challenge.activities || []), newActivity],
      progress: Math.min(100, (challenge.progress || 0) + 25), // Example progress increment
    };
    
    const newActiveChallenges = activeChallenges.map(c => c.id === challengeId ? updatedChallenge : c);
    updateProgress({ activeChallenges: newActiveChallenges });

      return true;
  };

  const checkIn = async () => {
    try {
      const now = Date.now();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const lastCheckIn = userProgress.lastCheckIn ? new Date(userProgress.lastCheckIn) : null;
      const isFirstCheckIn = !lastCheckIn;
      const isSameDayCheckIn = lastCheckIn && isSameDay(lastCheckIn, today);
      
      if (isFirstCheckIn || !isSameDayCheckIn) {
        // Calculate new streak
        let newStreak = userProgress.streak;
        
        if (isFirstCheckIn) {
          // First check-in ever
          newStreak = 1;
        } else {
          // Check if this is the next day (streak continues)
          const lastCheckDate = new Date(lastCheckIn!);
          const dayDifference = differenceInDays(today, lastCheckDate);
          
          if (dayDifference === 1) {
            // Next day, increment streak
            newStreak += 1;
          } else if (dayDifference > 1) {
            // More than one day passed, reset streak
            newStreak = 1;
          }
          // If same day, keep streak the same
        }
        
        // Update user progress
        const updatedProgress = {
          ...userProgress,
          streak: newStreak,
          lastCheckIn: now,
          dailyCheckedIn: true
        };
        
        setUserProgress(updatedProgress);
        await storeData(STORAGE_KEYS.USER_DATA, updatedProgress);
        
        // Update widget if available
        try {
          if (Platform.OS === 'ios' && NativeModules.WidgetUpdaterModule) {
            NativeModules.WidgetUpdaterModule.updateWidget(
              newStreak,
              updatedProgress.startDate || now,
              now
            );
          }
        } catch (widgetError) {
          console.log('Widget update failed:', widgetError);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in checkIn:', error);
      return false;
    }
  };
  
  const resetData = async () => {
    console.log('GamificationContext: resetData called. Clearing all data.');
    await clearAllData();
    setUserProgress(defaultUserProgress);
    console.log('GamificationContext: Data reset to default.');
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
    // 1. Update activity stats
    const currentStats = { ...userProgress.activityStats };
    // Use workoutStreak or add a workoutCount property if available
    // If not, use workoutStreak for session-based badges and totalWorkoutMinutes for duration-based badges
    const workoutSessions = (currentStats.workoutStreak || 0) + 1;
    const workoutMinutes = (currentStats.totalWorkoutMinutes || 0) + durationMinutes;
    currentStats.totalWorkoutMinutes = workoutMinutes;

    // 2. Unlock workout badges
    const currentAchievements = [...userProgress.achievements];
    let updated = false;

    // First workout session
    const firstBadge = currentAchievements.find(b => b.id === 'badge-workout-first');
    if (firstBadge && !firstBadge.unlocked) {
      firstBadge.unlocked = true;
      updated = true;
      showAchievement?.({
        title: firstBadge.name,
        description: firstBadge.description,
        buttonText: 'Great start!'
      });
    }

    // 3 sessions
    const threeBadge = currentAchievements.find(b => b.id === 'badge-workout-3');
    if (threeBadge && !threeBadge.unlocked && workoutSessions >= 3) {
      threeBadge.unlocked = true;
      updated = true;
      showAchievement?.({
        title: threeBadge.name,
        description: threeBadge.description,
        buttonText: 'Keep going!'
      });
    }

    // 10 sessions
    const masterBadge = currentAchievements.find(b => b.id === 'badge-workout-master');
    if (masterBadge && !masterBadge.unlocked && workoutSessions >= 10) {
      masterBadge.unlocked = true;
      updated = true;
      showAchievement?.({
        title: masterBadge.name,
        description: masterBadge.description,
        buttonText: 'Amazing!'
      });
    }

    // 60+ minute session
    const durationBadge = currentAchievements.find(b => b.id === 'badge-workout-long');
    if (durationBadge && !durationBadge.unlocked && durationMinutes >= 60) {
      durationBadge.unlocked = true;
      updated = true;
      showAchievement?.({
        title: durationBadge.name,
        description: durationBadge.description,
        buttonText: 'Endurance!'
      });
    }

    // 3. Update state if needed
    if (updated) {
      updateProgress({ achievements: currentAchievements, activityStats: currentStats });
    } else {
      updateProgress({ activityStats: currentStats });
    }
    return true;
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
    console.log('GamificationContext: forceCheckStreakAchievements called');
    try {
      // Get current achievements
      const currentAchievements = [...userProgress.achievements];
      let updated = false;

      // Check for streak badges - new improved approach
      console.log(`Current streak: ${streak} days`);
      
      // Unlock all streak badges based on streak value
      currentAchievements
        .filter(badge => badge.category === 'streak')
        .forEach(badge => {
          // Try to extract the required days from the badge name or unlockCriteria
          let requiredDays = 0;
          
          // Try to parse from unlockCriteria first
          const criteriaMatch = badge.unlockCriteria?.match(/(\d+)/);
          if (criteriaMatch) {
            requiredDays = parseInt(criteriaMatch[1], 10);
          } 
          
          // If not found, try to parse from name
          if (!requiredDays) {
            const nameMatch = badge.name?.match(/(\d+)/);
            if (nameMatch) {
              requiredDays = parseInt(nameMatch[1], 10);
            }
          }
          
          // Some badges may have specific IDs we can check as a fallback
          if (!requiredDays) {
            if (badge.id === 'badge-streak-1' || badge.id === 'badge-streak-7days') {
              requiredDays = 7;
            } else if (badge.id === 'badge-streak-2' || badge.id === 'badge-streak-30days') {
              requiredDays = 30;
            } else if (badge.id === 'badge-streak-3' || badge.id === 'badge-streak-90days') {
              requiredDays = 90;
            } else if (badge.id === 'badge-streak-4' || badge.id === 'badge-streak-365days') {
              requiredDays = 365;
            }
          }
          
          // If we found a required days value and the streak meets or exceeds it
          if (requiredDays > 0 && streak >= requiredDays && !badge.unlocked) {
            console.log(`Unlocking badge: ${badge.name} (${badge.id}) - Required: ${requiredDays} days, Current streak: ${streak} days`);
            badge.unlocked = true;
            updated = true;
            
            // Show achievement notification
            showAchievement?.({
              title: badge.name || `${requiredDays}-Day Streak`,
              description: badge.description || `Maintained a ${requiredDays}-day streak`,
              buttonText: 'Awesome!'
            });
          }
        });

      // Check for journal badges - keep the existing code
      const journalCount = journalEntries.length;
      
      if (journalCount >= 1) {
        const firstJournalBadge = currentAchievements.find(badge => 
          badge.id === 'badge-journal-first' || 
          badge.id === 'badge-journal-1'
        );
        if (firstJournalBadge && !firstJournalBadge.unlocked) {
          firstJournalBadge.unlocked = true;
          updated = true;
          console.log('GamificationContext: Unlocked first journal badge');
          showAchievement?.({
            title: firstJournalBadge.name || 'First Journal Entry',
            description: firstJournalBadge.description || 'Created your first journal entry',
            buttonText: 'Keep it up!'
          });
        }
      }
      
      if (journalCount >= 3) {
        const threeJournalBadge = currentAchievements.find(badge => 
          badge.id === 'badge-journal-3'
        );
        if (threeJournalBadge && !threeJournalBadge.unlocked) {
          threeJournalBadge.unlocked = true;
          updated = true;
          console.log('GamificationContext: Unlocked 3 journal entries badge');
          showAchievement?.({
            title: threeJournalBadge.name || '3 Journal Entries',
            description: threeJournalBadge.description || 'Created 3 journal entries',
            buttonText: 'Well done!'
          });
        }
      }
      
      if (journalCount >= 10) {
        const tenJournalBadge = currentAchievements.find(badge => 
          badge.id === 'badge-journal-2' ||
          badge.id === 'badge-journal-10'
        );
        if (tenJournalBadge && !tenJournalBadge.unlocked) {
          tenJournalBadge.unlocked = true;
          updated = true;
          console.log('GamificationContext: Unlocked 10 journal entries badge');
          showAchievement?.({
            title: tenJournalBadge.name || '10 Journal Entries',
            description: tenJournalBadge.description || 'Created 10 journal entries',
            buttonText: 'Keep journaling!'
          });
        }
      }
      
      if (journalCount >= 20) {
        const twentyJournalBadge = currentAchievements.find(badge => 
          badge.id === 'badge-journal-master' ||
          badge.id === 'badge-journal-20'
        );
        if (twentyJournalBadge && !twentyJournalBadge.unlocked) {
          twentyJournalBadge.unlocked = true;
          updated = true;
          console.log('GamificationContext: Unlocked 20 journal entries badge');
          showAchievement?.({
            title: twentyJournalBadge.name || '20 Journal Entries',
            description: twentyJournalBadge.description || 'Created 20 journal entries',
            buttonText: 'Keep writing!'
          });
        }
      }

      // If any badges were updated, update the state
      if (updated) {
        updateProgress({ achievements: currentAchievements });
      }

      return updated;
    } catch (error) {
      console.error('GamificationContext: Error in forceCheckStreakAchievements:', error);
      return false;
    }
  };

  const fix30DayBadge = async (): Promise<boolean> => {
    console.log('GamificationContext: fix30DayBadge called');
    try {
      // Get current achievements
      const currentAchievements = [...userProgress.achievements];
      
      // Find the 30-day badge with any possible ID
      const thirtyDayBadge = currentAchievements.find(badge => 
        badge.id === 'badge-streak-2' || 
        badge.id === 'badge-streak-30' || 
        badge.id === 'badge-streak-30days'
      );
      
      // If the badge exists and the streak is at least 30 days, unlock it
      if (thirtyDayBadge && streak >= 30) {
        thirtyDayBadge.unlocked = true;
        updateProgress({ achievements: currentAchievements });
        console.log('GamificationContext: Successfully fixed 30-day badge');
        showAchievement?.({
          title: thirtyDayBadge.name || '30-Day Streak',
          description: thirtyDayBadge.description || 'Maintained a 30-day streak',
          buttonText: 'Keep it up!'
        });
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('GamificationContext: Error fixing 30-day badge:', error);
      return false;
    }
  };

  // EMERGENCY FIX: Add a function to set streak for new users
  const setStreak = async (days: number, startDate?: number, options?: { skipPersistence?: boolean }) => {
    if (isProcessing()) {
      console.log('[GamificationContext] Skipping setStreak: Processing lock is active.');
      return;
    }
    try {
      console.log(`[GamificationContext] setStreak called with: days=${days}, startDate=${startDate || 'not provided'}`);
      
      // Validate input
      if (isNaN(days)) {
        console.error('[GamificationContext] Invalid streak value (NaN)');
        days = 0; // Default to 0 instead of returning
      }
      
      // Enforce that days cannot be negative
      const safeDays = Math.max(0, days);
      if (safeDays !== days) {
        console.log(`[GamificationContext] Corrected negative streak value to 0: ${days} -> ${safeDays}`);
        days = safeDays;
      }

      // EMERGENCY FIX: Check if this is a new user
      let isNewUser = false;
      try {
        const isOnboardingCompleted = await getData(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
        isNewUser = isOnboardingCompleted === false;
      } catch (error) {
        console.error('[GamificationContext] Error checking onboarding status:', error);
        // Continue with default isNewUser = false
      }
      
      // For new users, always force streak to 0
      if (isNewUser && days !== 0) {
        console.log('[GamificationContext] New user detected - forcing streak to 0 day');
        days = 0;
      }

      // Calculate start date if not provided
      const effectiveStartDate = startDate || (days > 0 ? Date.now() - ((days - 1) * 86400000) : Date.now());
      
      // Update local state
      console.log(`[GamificationContext] Updating userProgress with streak=${days}`);
      try {
        setUserProgress(prev => ({
          ...prev,
          streak: days,
          startDate: effectiveStartDate,
          lastCheckIn: days > 0 ? Date.now() : prev.lastCheckIn
        }));
      } catch (stateError) {
        console.error('[GamificationContext] Error updating local state:', stateError);
        // Continue even if state update fails
      }

      // Persist to storage if not skipped
      if (!options?.skipPersistence) {
        try {
          console.log(`[GamificationContext] Persisting streak=${days} to storage`);
          // Get fresh user progress to avoid stale state issues
          const currentProgress = await getData(STORAGE_KEYS.USER_DATA, userProgress);
          const updatedProgress = {
            ...currentProgress,
            streak: days,
            startDate: effectiveStartDate,
            lastCheckIn: days > 0 ? Date.now() : currentProgress.lastCheckIn
          };
          await storeData(STORAGE_KEYS.USER_DATA, updatedProgress);
          console.log('[GamificationContext] Successfully persisted streak to storage');
        } catch (storageError) {
          console.error('[GamificationContext] Error persisting streak to storage:', storageError);
          // Continue even if storage fails
          
          // Try a simplified approach as fallback
          try {
            await storeData('clearmind:manual-streak-value', days.toString());
            console.log('[GamificationContext] Saved streak to manual-streak-value as fallback');
          } catch (fallbackError) {
            console.error('[GamificationContext] Even fallback storage failed:', fallbackError);
          }
        }
      }

      // Update widget if available
      try {
        if (Platform.OS === 'ios' && NativeModules.WidgetUpdaterModule) {
          console.log(`[GamificationContext] Updating widget with streak=${days}`);
          NativeModules.WidgetUpdaterModule.updateWidget(
            days,
            effectiveStartDate,
            Date.now()
          );
          console.log('[GamificationContext] Widget updated successfully');
        }
      } catch (widgetError) {
        console.error('[GamificationContext] Widget update failed:', widgetError);
        // Continue even if widget update fails
      }
      
      // Check streak achievements
      try {
        await forceCheckStreakAchievements();
      } catch (achievementError) {
        console.error('[GamificationContext] Error checking streak achievements:', achievementError);
      }
      
      console.log(`[GamificationContext] setStreak completed successfully with value ${days}`);
    } catch (error) {
      console.error('[GamificationContext] Error setting streak:', error);
      // No need to re-throw, just log the error
      
      // Try a last-ditch effort to at least update the local state
      try {
        setUserProgress(prev => ({
          ...prev,
          streak: days || 0
        }));
      } catch (finalError) {
        console.error('[GamificationContext] Final attempt to update state failed:', finalError);
      }
    }
  };
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
    try {
      console.log('GamificationContext: testUnlock15Badges called - unlocking first 15 badges');
      // Get current achievements
      const currentAchievements = [...userProgress.achievements];
      let updated = false;
      
      // Unlock the first 15 badges
      const badgesToUnlock = currentAchievements.slice(0, 15);
      
      badgesToUnlock.forEach(badge => {
        if (!badge.unlocked) {
          badge.unlocked = true;
          updated = true;
          console.log(`GamificationContext: Unlocked badge: ${badge.name} (${badge.id})`);
        }
      });

      // If any badges were updated, update the state
      if (updated) {
        updateProgress({ achievements: currentAchievements });
        console.log('GamificationContext: Successfully unlocked 15 badges');
      }

      return updated;
    } catch (error) {
      console.error('GamificationContext: Error unlocking test badges:', error);
      return false;
    }
  };
  const checkChallengeAchievements = async (completed?: Challenge[]) => {
    // Unlock badges for all completed challenges with badge rewards
    const completedChallenges = completed || userProgress.completedChallenges;
    const currentAchievements = [...userProgress.achievements];
    let updated = false;
    completedChallenges.forEach(challenge => {
      if (challenge && challenge.rewards && challenge.rewards.badgeId) {
        const badge = currentAchievements.find(a => a.id === challenge.rewards!.badgeId);
        if (badge && !badge.unlocked) {
          badge.unlocked = true;
          updated = true;
          showAchievement?.({
            title: badge.name || 'Challenge Badge Unlocked',
            description: badge.description || 'Unlocked a badge by completing a challenge!',
            buttonText: 'Awesome!'
          });
        }
      }
    });
    if (updated) {
      updateProgress({ achievements: currentAchievements });
    }
    return updated;
  };
  const checkJournalAchievements = async (entries?: JournalEntry[]) => {};
  const checkAndEvolveCompanion = async () => {};

  // Helper to unlock a badge by ID
  const unlockBadgeById = (badgeId: string, customButtonText?: string) => {
    const currentAchievements = [...userProgress.achievements];
    const badge = currentAchievements.find(b => b.id === badgeId);
    if (badge && !badge.unlocked) {
      badge.unlocked = true;
      updateProgress({ achievements: currentAchievements });
      showAchievement?.({
        title: badge.name,
        description: badge.description,
        buttonText: customButtonText || 'Awesome!'
      });
      return true;
    }
    return false;
  };

  // Example: Unlock app badge after onboarding
  const unlockAppBadge = () => unlockBadgeById('badge-app-onboarding', 'Welcome!');

  // Example: Unlock recovery badge after logging a recovery event
  const unlockRecoveryBadge = () => unlockBadgeById('badge-recovery-1', 'Stay strong!');

  // Example: Unlock companion badge after evolution
  const unlockCompanionBadge = () => unlockBadgeById('badge-companion-evolve', 'Your companion evolved!');

  // Example: Unlock milestone badge after 100 days streak
  const unlockMilestoneBadge = () => unlockBadgeById('badge-milestone-100', '100 Days!');
  
  // Update the useEffect that checks for streak bugs
  useEffect(() => {
    // This effect runs when streak changes or startDate changes
    if (isKnown730Bug(streak)) {
      console.error(`[GamificationContext] CRITICAL: Detected 730-day bug (current streak: ${streak}). Applying emergency fix...`);
      
      // Show alert to user
      Alert.alert(
        '⚠️ Data Issue Detected',
        'We found an issue with your streak counter showing an incorrect value. The app will fix this automatically.',
        [
          {
            text: 'Reset Now',
            onPress: async () => {
              try {
                await resetStreakToOne();
                forceRefresh();
                setStreak(1, Date.now());
              } catch (e) {
                console.error('[GamificationContext] Error fixing 730-day bug:', e);
              }
            }
          }
        ]
      );
    } else if (isFutureStartDateBug(streak, userProgress.startDate)) {
      console.error(`[GamificationContext] CRITICAL: Detected 30-day bug with future start date (${new Date(userProgress.startDate || 0).toISOString()}). Applying emergency fix...`);
      
      // Fix immediately without alert since this is a critical issue
      (async () => {
        try {
          await resetStreakToOne();
          forceRefresh();
          setStreak(1, Date.now());
          console.log('[GamificationContext] 30-day bug with future date fixed. Streak reset to 1.');
        } catch (e) {
          console.error('[GamificationContext] Error fixing 30-day bug:', e);
        }
      })();
    }
  }, [streak, userProgress.startDate]);

  return (
    <GamificationContext.Provider
      value={{
        streak,
        level,
        points,
        totalPoints,
        journalEntries,
        activeChallenges,
        availableChallenges,
        completedChallenges,
        achievements,
        lastCheckIn,
        dailyCheckedIn,
        startDate: userProgress.startDate, // Make start date available in the context
        
        // Functions
        addJournalEntry,
        deleteJournalEntry,
        startChallenge,
        completeChallenge,
        checkIn,
        resetData,
        exportData,
        importData,
        setStreak,
        getLevelProgress,
        getPointsToNextLevel,
        getPersonalizedGreeting,
        setCompanion,
        updateCompanionExperience,
        evolveCompanion,
        feedCompanion,
        getCompanionStage,
        getBondLevel,
        resetCompanion,
        checkAllAchievementTypes,
        testUnlock15Badges,
        logHabitReplacement,
        logWorkout,
        logMeditation,
        logReading,
        reloadChallenges,
        fixStayCleanChallenge,
        forceResetAllChallenges,
        forceCheckStreakAchievements,
        fix30DayBadge,
        logChallengeProgress,
        companion: userProgress.companion || null,
        activityStats: userProgress.activityStats || defaultActivityStats,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => useContext(GamificationContext);