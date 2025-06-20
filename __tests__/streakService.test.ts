import { 
  calculateHoursBetween, 
  simulateTimePassed,
  checkAndAdjustStreak,
  performCheckIn,
  updateStreak
} from '../utils/streakService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// Mock the supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      upsert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

// Mock the loadStreakData function to return test data
jest.mock('../utils/streakService', () => {
  const originalModule = jest.requireActual('../utils/streakService');
  
  return {
    ...originalModule,
    loadStreakData: jest.fn(() => Promise.resolve({
      streak: 5,
      lastCheckIn: Date.now() - (12 * 60 * 60 * 1000), // 12 hours ago
      startDate: Date.now() - (4 * 24 * 60 * 60 * 1000), // 4 days ago
      hourCount: 96, // 4 days * 24 hours
    })),
    saveStreakData: jest.fn(() => Promise.resolve()),
    syncWithSupabase: jest.fn(() => Promise.resolve()),
  };
});

describe('calculateHoursBetween', () => {
  it('should correctly calculate hours between two timestamps', () => {
    // Set up timestamps 6 hours apart
    const start = Date.now() - (6 * 60 * 60 * 1000);
    const end = Date.now();
    
    // Calculate hours
    const hours = calculateHoursBetween(start, end);
    
    // Should be approximately 6 hours (allow for small variations in test timing)
    expect(hours).toBeGreaterThanOrEqual(5);
    expect(hours).toBeLessThanOrEqual(7);
  });
  
  it('should return 0 for timestamps less than 1 hour apart', () => {
    // Set up timestamps 30 minutes apart
    const start = Date.now() - (30 * 60 * 1000);
    const end = Date.now();
    
    // Calculate hours
    const hours = calculateHoursBetween(start, end);
    
    // Should be 0 (floor of hours less than 1)
    expect(hours).toBe(0);
  });
  
  it('should handle timestamps in reverse order', () => {
    // Set up timestamps 6 hours apart, but end before start
    const end = Date.now() - (6 * 60 * 60 * 1000);
    const start = Date.now();
    
    // Calculate hours
    const hours = calculateHoursBetween(start, end);
    
    // Should be 0 or a negative number
    expect(hours).toBeLessThanOrEqual(0);
  });
});

describe('simulateTimePassed', () => {
  it('should update lastCheckIn by specified days', async () => {
    // Make sure loadStreakData returns our mock data
    const { loadStreakData } = require('../utils/streakService');
    loadStreakData.mockResolvedValue({
      streak: 5,
      lastCheckIn: Date.now(),
      startDate: Date.now() - (4 * 24 * 60 * 60 * 1000),
      hourCount: 96,
    });
    
    // Import saveStreakData to spy on it
    const { saveStreakData } = require('../utils/streakService');
    
    // Run the function
    const daysToSimulate = 2;
    await simulateTimePassed(daysToSimulate);
    
    // Check that saveStreakData was called with updated lastCheckIn
    expect(saveStreakData).toHaveBeenCalled();
    
    // Get the lastCheckIn value that was passed to saveStreakData
    const savedData = saveStreakData.mock.calls[0][0];
    
    // The new lastCheckIn should be approximately 2 days earlier
    const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
    const originalTime = Date.now();
    const timeDiff = originalTime - savedData.lastCheckIn;
    
    // Allow a small margin of error for test execution time
    expect(timeDiff).toBeGreaterThanOrEqual(twoDaysInMs - 1000);
    expect(timeDiff).toBeLessThanOrEqual(twoDaysInMs + 1000);
  });
}); 