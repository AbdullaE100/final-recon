export type ChallengeType = 'meditation' | 'workout' | 'habit' | 'journal' | 'habit_replacement' | 'journal_streak';

export type ActivityType = 'meditation' | 'workout' | 'habit' | 'journal' | 'challenge';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  progress: number;
  steps?: {
    id: string;
    description: string;
    completed: boolean;
  }[];
  completed?: boolean;
  startDate?: number;
  endDate?: number;
  lastUpdated?: string;
  activities?: {
    timestamp: string;
    note: string;
  }[];
  isDaily?: boolean;
  points?: number;
  rewards?: {
    badgeId: string;
    badgeName: string;
  };
} 