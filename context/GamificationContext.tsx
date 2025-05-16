import React, { createContext, useContext, useState, useEffect } from 'react';
import { storeData, getData, STORAGE_KEYS, clearAllData } from '@/utils/storage';
import {
  UserProgress,
  JournalEntry,
  Challenge,
  Achievement,
  LevelRequirement
} from '@/types/gamification';
import { getStartOfDay, isToday } from '@/utils/dateUtils';
import { Alert, Platform } from 'react-native';
import { loadStreakData, updateStreak, performCheckIn as serviceCheckIn } from '@/utils/streakService';
import { Companion, CompanionType, UserCompanion, EVOLUTION_THRESHOLDS, BOND_THRESHOLDS, XpActionType, FeedingAction } from '@/types/companion';

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
  {
    id: 'badge-streak-1',
    name: '1 Week Milestone',
    description: 'Maintained a clean streak for 7 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 7-day streak',
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
    id: 'badge-streak-3',
    name: '90 Day Champion',
    description: 'Maintained a clean streak for 90 days',
    category: 'streak',
    unlockCriteria: 'Maintain a 90-day streak',
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
  addJournalEntry: (content: string) => void;
  deleteJournalEntry: (id: string) => void;
  
  // Challenges
  activeChallenges: Challenge[];
  availableChallenges: Challenge[];
  startChallenge: (id: string) => void;
  completeChallenge: (id: string) => void;
  
  // Achievements
  achievements: Achievement[];
  
  // Actions
  checkIn: () => void;
  resetData: () => void;
  exportData: () => void;
  importData: () => void;
  setStreak: (days: number) => void;
  
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
  achievements: [],
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
});

export const GamificationProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // State
  const [userProgress, setUserProgress] = useState<UserProgress>(defaultUserProgress);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>(initialChallenges);
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [companion, setCompanionState] = useState<UserCompanion | null>(null);

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
        // Load streak data from the streak service (Supabase with local fallback)
        const streakData = await loadStreakData();
        
        // Load other user progress data
        const storedUserProgress = await getData<UserProgress>(
          STORAGE_KEYS.USER_DATA, 
          defaultUserProgress
        );
        
        // Merge streak data with other user progress
        const mergedUserProgress = {
          ...storedUserProgress,
          streak: streakData.streak,
          lastCheckIn: streakData.lastCheckIn,
        };
        
        setUserProgress(mergedUserProgress);
        
        // Load journal entries
        const storedJournalEntries = await getData<JournalEntry[]>(
          STORAGE_KEYS.JOURNAL_ENTRIES, 
          []
        );
        setJournalEntries(storedJournalEntries);
        
        // Load challenges and achievements if available
        const storedChallenges = await getData<Challenge[]>(
          STORAGE_KEYS.CHALLENGES, 
          initialChallenges
        );
        setChallenges(storedChallenges);
        
        const storedAchievements = await getData<Achievement[]>(
          STORAGE_KEYS.ACHIEVEMENTS, 
          initialAchievements
        );
        setAchievements(storedAchievements);
        
        // Load companion data if it exists
        if (userProgress.companionId) {
          const companionData = await getData(STORAGE_KEYS.COMPANION_DATA, null);
          if (companionData) {
            setCompanionState(companionData);
          }
        }
        
        setDataLoaded(true);
      } catch (error) {
        console.error('Error loading gamification data:', error);
        // Use defaults if data can't be loaded
        setDataLoaded(true);
      }
    };

    loadData();
  }, []);
  
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
      storeData(STORAGE_KEYS.ACHIEVEMENTS, achievements);
    }
  }, [achievements, dataLoaded]);
  
  useEffect(() => {
    if (dataLoaded) {
      storeData(STORAGE_KEYS.COMPANION_DATA, companion);
    }
  }, [companion, dataLoaded]);
  
  // Check for streak achievements
  useEffect(() => {
    if (!dataLoaded) return;
    
    const checkStreakAchievements = async () => {
      // Skip achievement checks for brand new users (first session)
      const isFirstSession = userProgress.lastCheckIn === 0;
      if (isFirstSession) {
        console.log('First session detected, skipping achievement checks');
        return;
      }
      
      // Skip achievement checks if streak is unreasonably high for a new installation
      // Catches edge cases where testing values might be accidentally left in
      const isFirstDay = (Date.now() - userProgress.lastCheckIn) < 24 * 60 * 60 * 1000;
      const isPossiblyTestingData = userProgress.streak > 10 && isFirstDay;
      
      if (isPossiblyTestingData) {
        console.warn('Detected possibly invalid streak data, skipping achievement check', {
          streak: userProgress.streak,
          lastCheckIn: new Date(userProgress.lastCheckIn).toISOString()
        });
        
        // Fix potentially incorrect streak data
        if (userProgress.streak >= 90) {
          console.warn('Resetting abnormally high streak for new user');
          await updateStreak(0);
          
          // Update local state
          setUserProgress(prev => ({
            ...prev,
            streak: 0,
            lastCheckIn: Date.now()
          }));
          
          return;
        }
      }
      
      const updatedAchievements = [...achievements];
      let updated = false;
      
      // 7-day streak achievement
      const streakAchievement7 = updatedAchievements.find(a => a.id === 'badge-streak-1');
      if (streakAchievement7 && !streakAchievement7.unlocked && userProgress.streak >= 7) {
        streakAchievement7.unlocked = true;
        streakAchievement7.unlockedDate = Date.now();
        updated = true;
        
        // Show achievement notification
        Alert.alert(
          "Achievement Unlocked!",
          `${streakAchievement7.name}: ${streakAchievement7.description}`,
          [{ text: "Awesome!" }]
        );
      }
      
      // 30-day streak achievement
      const streakAchievement30 = updatedAchievements.find(a => a.id === 'badge-streak-2');
      if (streakAchievement30 && !streakAchievement30.unlocked && userProgress.streak >= 30) {
        streakAchievement30.unlocked = true;
        streakAchievement30.unlockedDate = Date.now();
        updated = true;
        
        // Show achievement notification
        Alert.alert(
          "Achievement Unlocked!",
          `${streakAchievement30.name}: ${streakAchievement30.description}`,
          [{ text: "Amazing!" }]
        );
      }
      
      // 90-day streak achievement
      const streakAchievement90 = updatedAchievements.find(a => a.id === 'badge-streak-3');
      if (streakAchievement90 && !streakAchievement90.unlocked && userProgress.streak >= 90) {
        streakAchievement90.unlocked = true;
        streakAchievement90.unlockedDate = Date.now();
        updated = true;
        
        // Show achievement notification
        Alert.alert(
          "Achievement Unlocked!",
          `${streakAchievement90.name}: ${streakAchievement90.description}`,
          [{ text: "Incredible!" }]
        );
      }
      
      if (updated) {
        setAchievements(updatedAchievements);
        await storeData(STORAGE_KEYS.ACHIEVEMENTS, updatedAchievements);
      }
    };
    
    checkStreakAchievements();
  }, [userProgress.streak, dataLoaded, achievements]);
  
  // Extract checkAndEvolveCompanion as a reusable function
  const checkAndEvolveCompanion = async () => {
    if (!companion || companion.type !== 'water') {
      console.log("Cannot evolve: companion is null or not water type", companion?.type);
      return;
    }
    
    console.log("----------------------------");
    console.log("EVOLUTION CHECK:");
    console.log("Current streak:", userProgress.streak);
    console.log("Current companion level:", companion.currentLevel);
    console.log("Companion type:", companion.type);
    console.log("Should evolve to level 2:", userProgress.streak >= 30 && companion.currentLevel < 2);
    console.log("Should evolve to level 3:", userProgress.streak >= 60 && companion.currentLevel < 3);
    console.log("----------------------------");
    
    // 60-day streak: Evolve to level 3
    if (userProgress.streak >= 60 && companion.currentLevel < 3) {
      console.log("Automatically evolving to level 3 (60-day streak)");
      
      const updatedCompanion: UserCompanion = {
        ...companion,
        currentLevel: 3,
        name: 'Stripes',
        isEvolutionReady: false,
        experience: 0,
        lastInteraction: Date.now(),
        happinessLevel: 100,
      };
      
      // Update state
      setCompanionState(updatedCompanion);
      
      // Save to storage
      await storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
      
      // Show notification
      Alert.alert(
        "Companion Evolved!",
        "Your companion has evolved to its final form after 60 days of dedication!",
        [{ text: "Awesome!" }]
      );
      
      return true;
    }
    // 30-day streak: Evolve to level 2
    else if (userProgress.streak >= 30 && companion.currentLevel < 2) {
      console.log("Automatically evolving to level 2 (30-day streak)");
      
      const updatedCompanion: UserCompanion = {
        ...companion,
        currentLevel: 2,
        name: 'Stripes',
        isEvolutionReady: false,
        experience: 0,
        lastInteraction: Date.now(),
        happinessLevel: 100,
      };
      
      // Update state
      setCompanionState(updatedCompanion);
      
      // Log the state update
      console.log("Updated companion state:", updatedCompanion);
      
      // Save to storage
      await storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
      console.log("Saved evolved companion to storage");
      
      // Show notification
      Alert.alert(
        "Companion Evolved!",
        "Your companion has evolved to stage 2 after maintaining a 30-day streak!",
        [{ text: "Great!" }]
      );
      
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
      if (journalEntries.length >= 10 && !achievements.find(a => a.id === 'badge-journal-2')?.unlocked) {
        setAchievements(prev => prev.map(a => 
          a.id === 'badge-journal-2' 
            ? { ...a, unlocked: true, unlockedDate: Date.now() } 
            : a
        ));
        addPoints(200);
      }
    };
    
    checkJournalAchievements();
  }, [journalEntries.length, dataLoaded, achievements]);
  
  // Check for challenge achievements
  useEffect(() => {
    if (!dataLoaded) return;
    
    const checkChallengeAchievements = async () => {
      if (userProgress.challengesCompleted.length >= 5 && !achievements.find(a => a.id === 'badge-challenge-1')?.unlocked) {
        setAchievements(prev => prev.map(a => 
          a.id === 'badge-challenge-1' 
            ? { ...a, unlocked: true, unlockedDate: Date.now() } 
            : a
        ));
        addPoints(250);
      }
    };
    
    checkChallengeAchievements();
  }, [userProgress.challengesCompleted.length, dataLoaded, achievements]);
  
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
    if (dailyCheckedIn) {
      console.log('Already checked in today');
      return;
    }
    
    try {
      // Use the streak service to perform check-in
      await serviceCheckIn();
      
      // Reload streak data
      const streakData = await loadStreakData();
      
      // Update local state
      setUserProgress(prev => ({
        ...prev,
        streak: streakData.streak,
        lastCheckIn: streakData.lastCheckIn,
      }));
      
      // Add points for check-in
      addPoints(10);
      
      // Check for streak-based achievements
      const updatedAchievements = [...achievements];
      
      // Check if any streak-based achievements were unlocked
      if (streakData.streak >= 7) {
        const weekBadge = updatedAchievements.find(a => a.id === 'badge-streak-1');
        if (weekBadge && !weekBadge.unlocked) {
          weekBadge.unlocked = true;
          weekBadge.unlockedDate = Date.now();
          addPoints(50);
        }
      }
      
      if (streakData.streak >= 30) {
        const monthBadge = updatedAchievements.find(a => a.id === 'badge-streak-2');
        if (monthBadge && !monthBadge.unlocked) {
          monthBadge.unlocked = true;
          monthBadge.unlockedDate = Date.now();
          addPoints(200);
        }
      }
      
      if (streakData.streak >= 90) {
        const ninetyDayBadge = updatedAchievements.find(a => a.id === 'badge-streak-3');
        if (ninetyDayBadge && !ninetyDayBadge.unlocked) {
          ninetyDayBadge.unlocked = true;
          ninetyDayBadge.unlockedDate = Date.now();
          addPoints(500);
        }
      }
      
      setAchievements(updatedAchievements);
      await storeData(STORAGE_KEYS.ACHIEVEMENTS, updatedAchievements);
      
      // Give companion XP for daily check-in if the user has a companion
      if (companion) {
        await updateCompanionExperience(25, XpActionType.DAILY_CHECK_IN);
      }
      
      // Check if companion should evolve based on the updated streak
      await checkAndEvolveCompanion();
    } catch (error) {
      console.error('Failed to check in:', error);
    }
  };
  
  // Add journal entry
  const addJournalEntry = (content: string) => {
    if (!content.trim()) return;
    
    const newEntry: JournalEntry = {
      id: `journal-${Date.now()}`,
      content,
      timestamp: Date.now(),
    };
    
    setJournalEntries(prev => [newEntry, ...prev]);
    
    // Award points for journal entry
    addPoints(15);
    
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
      setAchievements(prev => prev.map(a => 
        a.id === challenge.rewards?.badgeId 
          ? { ...a, unlocked: true, unlockedDate: Date.now() } 
          : a
      ));
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
    await clearAllData();
    
    setUserProgress(defaultUserProgress);
    setJournalEntries([]);
    setChallenges(initialChallenges);
    setAchievements(initialAchievements);
  };
  
  // Export data
  const exportData = () => {
    const data = {
      userProgress,
      journalEntries,
      challenges,
      achievements
    };
    
    // In a real app, we would create a file and prompt the user to share/save it
    // For this simulation, we'll just show an alert
    Alert.alert(
      "Data Export",
      "In a real app, this would create an encrypted file with your data that you could save.",
      [{ text: "OK" }]
    );
    
    if (Platform.OS === 'web') {
      console.log('Export data:', JSON.stringify(data, null, 2));
    }
  };
  
  // Import data
  const importData = () => {
    // In a real app, we would prompt the user to select a file
    // For this simulation, we'll just show an alert
    Alert.alert(
      "Data Import",
      "In a real app, this would let you select a previously exported file to restore your data.",
      [{ text: "OK" }]
    );
  };

  // Updated setStreak method to use the streak service
  const setStreak = async (days: number) => {
    try {
      // Update streak using the service (syncs with Supabase)
      await updateStreak(days);
      
      // Reload the updated streak data
      const streakData = await loadStreakData();
      
      // Update local state
      setUserProgress(prev => ({
        ...prev,
        streak: streakData.streak,
        lastCheckIn: streakData.lastCheckIn,
      }));
      
      // Check for streak-based achievements
      const updatedAchievements = [...achievements];
      
      // Check if any streak-based achievements were unlocked
      if (days >= 7) {
        const weekBadge = updatedAchievements.find(a => a.id === 'badge-streak-1');
        if (weekBadge && !weekBadge.unlocked) {
          weekBadge.unlocked = true;
          weekBadge.unlockedDate = Date.now();
          addPoints(50);
        }
      }
      
      if (days >= 30) {
        const monthBadge = updatedAchievements.find(a => a.id === 'badge-streak-2');
        if (monthBadge && !monthBadge.unlocked) {
          monthBadge.unlocked = true;
          monthBadge.unlockedDate = Date.now();
          addPoints(200);
        }
      }
      
      if (days >= 90) {
        const ninetyDayBadge = updatedAchievements.find(a => a.id === 'badge-streak-3');
        if (ninetyDayBadge && !ninetyDayBadge.unlocked) {
          ninetyDayBadge.unlocked = true;
          ninetyDayBadge.unlockedDate = Date.now();
          addPoints(500);
        }
      }
      
      setAchievements(updatedAchievements);
      await storeData(STORAGE_KEYS.ACHIEVEMENTS, updatedAchievements);
      
      // Store updated user progress
      await storeData(STORAGE_KEYS.USER_DATA, {
        ...userProgress,
        streak: days,
      });
      
      // Check if companion should evolve based on the updated streak
      await checkAndEvolveCompanion();
    } catch (error) {
      console.error('Failed to set streak:', error);
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
        isEvolutionReady: true, // Force to true for testing
        bondLevel: 10,
        feedingHistory: [],
        unlockedSnacks: 5
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
  const createDefaultCompanion = async () => {
    // Default water type companion
    const defaultCompanion: Companion = {
      id: `companion-${Date.now()}`,
      type: 'water',
      name: 'Stripes',
      description: 'A friendly water dragon companion',
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
    
    // Calculate total XP
    const totalXp = (companion.currentLevel - 1) * companion.nextLevelExperience + companion.experience;
    
    if (totalXp >= EVOLUTION_THRESHOLDS.STAGE_3) return 3;
    if (totalXp >= EVOLUTION_THRESHOLDS.STAGE_2) return 2;
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
      // Always allow evolution for testing purposes
      // Determine the new stage
      const newStage = getCompanionStage();
      const currentLevel = companion.currentLevel;
      
      console.log('Evolving companion from context. Current level:', currentLevel);
      
      // Find the evolution name based on type and stage
      let newName = companion.name;
      
      switch (companion.type) {
        case 'fire':
          newName = 'Snuglur';
          break;
        case 'water':
          newName = 'Stripes';
          break;
        case 'plant':
          newName = 'Drowsi';
          break;
      }
      
      // Update the companion data - always increment level on evolution
      const updatedCompanion: UserCompanion = {
        ...companion,
        currentLevel: currentLevel + 1,
        name: newName,
        isEvolutionReady: false,
        experience: 0,
        lastInteraction: Date.now(),
        happinessLevel: 100,
      };
      
      // Update the state BEFORE saving to storage for immediate feedback
      setCompanionState(updatedCompanion);
      console.log('Updated companion state in context to level:', updatedCompanion.currentLevel);
      
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
      // Clear companion data
      await storeData(STORAGE_KEYS.COMPANION_DATA, null);
      setCompanionState(null);
      
      // Create a new default companion
      await createDefaultCompanion();
      
      console.log("Companion reset successfully");
    } catch (error) {
      console.error("Error resetting companion:", error);
    }
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
        achievements,
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
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamification = () => useContext(GamificationContext);