import { Achievement } from '@/types/gamification';

/**
 * Calculates the percentage of badges unlocked in a category
 * @param badges Array of achievements in a category
 * @returns A number between 0 and 100 representing the unlock percentage
 */
export const getBadgeCompletionPercentage = (badges: Achievement[]): number => {
  if (!badges || badges.length === 0) return 0;
  
  const unlockedCount = badges.filter(badge => badge.unlocked).length;
  return Math.round((unlockedCount / badges.length) * 100);
};

/**
 * Returns badges filtered by locked/unlocked status
 * @param badges Array of achievements
 * @param unlocked If true, returns only unlocked badges, if false returns only locked badges
 */
export const filterBadgesByStatus = (badges: Achievement[], unlocked: boolean): Achievement[] => {
  if (!badges || badges.length === 0) return [];
  
  return badges.filter(badge => badge.unlocked === unlocked);
};

/**
 * Sorts badges by their unlock status and then by name
 * @param badges Array of achievements
 * @returns Sorted array of achievements
 */
export const sortBadges = (badges: Achievement[]): Achievement[] => {
  if (!badges || badges.length === 0) return [];
  
  return [...badges].sort((a, b) => {
    // Sort unlocked badges first
    if (a.unlocked && !b.unlocked) return -1;
    if (!a.unlocked && b.unlocked) return 1;
    
    // If both have same unlock status, sort by name
    return a.name.localeCompare(b.name);
  });
};

/**
 * Get the next badge to unlock in a category
 * @param badges Array of achievements in a category
 * @returns The next badge to unlock or undefined if all unlocked
 */
export const getNextBadgeToUnlock = (badges: Achievement[]): Achievement | undefined => {
  if (!badges || badges.length === 0) return undefined;
  
  // Find the first locked badge
  return badges.find(badge => !badge.unlocked);
};

/**
 * Format the unlock date string for badges
 * @param timestamp Timestamp of when badge was unlocked
 * @returns Formatted date string
 */
export const formatBadgeUnlockDate = (timestamp?: number): string => {
  if (!timestamp) return 'Not yet unlocked';
  
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}; 