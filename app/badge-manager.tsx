import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/context/GamificationContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, Award, Check, ChevronRight, Trophy, Star } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Achievement } from '@/types/gamification';
import { BlurView } from 'expo-blur';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { getBadgeCompletionPercentage, sortBadges, filterBadgesByStatus, getNextBadgeToUnlock } from '@/utils/badgeHelper';
import { getData, storeData } from '@/utils/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface BadgesByCategory {
  [category: string]: Achievement[];
}

export default function BadgeManagerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { 
    streak, 
    setStreak, 
    achievements, 
    forceCheckStreakAchievements,
    addJournalEntry,
    logMeditation,
    logWorkout 
  } = useGamification();
  
  const [customStreakValue, setCustomStreakValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Count unlocked and total badges
  const unlockedBadges = achievements ? achievements.filter(badge => badge.unlocked).length : 0;
  const totalBadges = achievements ? achievements.length : 0;
  
  // Group badges by category and sort them
  const badgesByCategory: BadgesByCategory = achievements ? achievements.reduce((acc: BadgesByCategory, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {}) : {};
  
  // Sort badges in each category (unlocked first, then by name)
  Object.keys(badgesByCategory).forEach(category => {
    badgesByCategory[category] = sortBadges(badgesByCategory[category]);
  });
  
  const applyCustomStreak = async () => {
    // Validate the streak value
    const value = parseInt(customStreakValue, 10);
    if (isNaN(value) || value < 0) {
      // Invalid input
      return;
    }
    
    // Add protection against rapid repeat calls
    try {
      const lastSetKey = 'clearmind:last-custom-streak-time';
      const lastTimeStr = await getData<string>(lastSetKey, '0');
      const lastTime = parseInt(lastTimeStr, 10) || 0;
      const now = Date.now();
      
      // If we've set streak in the last 3 seconds, skip this one
      if (now - lastTime < 3000) {
        console.log('Skipping redundant custom streak - already set recently');
        return;
      }
      
      // Record this time
      await storeData(lastSetKey, now.toString());
    } catch (e) {
      console.error('Error checking recent streak sets:', e);
      // Continue execution even if this check fails
    }
    
    setIsLoading(true);
    try {
      await setStreak(value);
      await forceCheckStreakAchievements();
    } catch (error) {
      console.error('Error setting streak:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const applyPresetStreak = async (days: number) => {
    // Validate the streak value
    if (typeof days !== 'number' || isNaN(days) || days < 0) {
      console.error('Invalid streak value:', days);
      return;
    }
    
    // Add protection against rapid repeat calls
    try {
      const lastSetKey = 'clearmind:last-preset-streak-time';
      const lastTimeStr = await getData<string>(lastSetKey, '0');
      const lastTime = parseInt(lastTimeStr, 10) || 0;
      const now = Date.now();
      
      // If we've set streak in the last 3 seconds, skip this one
      if (now - lastTime < 3000) {
        console.log('Skipping redundant preset streak - already set recently');
        return;
      }
      
      // Record this time
      await storeData(lastSetKey, now.toString());
    } catch (e) {
      console.error('Error checking recent preset streak sets:', e);
      // Continue execution even if this check fails
    }
    
    setIsLoading(true);
    try {
      await setStreak(days);
      await forceCheckStreakAchievements();
    } catch (error) {
      console.error('Error setting preset streak:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkAllAchievements = async () => {
    setIsLoading(true);
    try {
      await forceCheckStreakAchievements();
    } catch (error) {
      console.error('Error checking achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const unlockJournalAchievements = async () => {
    setIsLoading(true);
    try {
      // Add sample journal entries to unlock journal badges
      for (let i = 0; i < 5; i++) {
        await addJournalEntry(`Test journal entry ${i + 1} for badge testing`);
      }
      await forceCheckStreakAchievements();
    } catch (error) {
      console.error('Error unlocking journal achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const unlockMeditationAchievements = async () => {
    setIsLoading(true);
    try {
      // Log multiple meditation sessions
      for (let i = 0; i < 10; i++) {
        logMeditation(10);
      }
      await forceCheckStreakAchievements();
    } catch (error) {
      console.error('Error unlocking meditation achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const unlockWorkoutAchievements = async () => {
    setIsLoading(true);
    try {
      // Log multiple workout sessions
      for (let i = 0; i < 10; i++) {
        logWorkout(30);
      }
      await forceCheckStreakAchievements();
    } catch (error) {
      console.error('Error unlocking workout achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const unlockMultipleBadges = async (count: number) => {
    // Validate the count value
    if (typeof count !== 'number' || isNaN(count) || count < 0) {
      console.error('Invalid count value:', count);
      return;
    }
    
    // Add protection against rapid repeat calls
    try {
      const lastUnlockKey = 'clearmind:last-bulk-unlock-time';
      const lastTimeStr = await getData<string>(lastUnlockKey, '0');
      const lastTime = parseInt(lastTimeStr, 10) || 0;
      const now = Date.now();
      
      // If we've done a bulk unlock in the last 5 seconds, skip this one
      if (now - lastTime < 5000) {
        console.log('Skipping redundant bulk unlock - already done recently');
        return;
      }
      
      // Record this time
      await storeData(lastUnlockKey, now.toString());
    } catch (e) {
      console.error('Error checking recent bulk unlocks:', e);
      // Continue execution even if this check fails
    }
    
    setIsLoading(true);
    try {
      if (count >= 5) {
        // Set streak to 5 days to unlock early streak badges
        await setStreak(5);
        
        // Add journal entries
        for (let i = 0; i < 3; i++) {
          await addJournalEntry(`Test journal entry ${i + 1} for badge testing`);
        }
        
        // Log some meditation and workout sessions
        for (let i = 0; i < 3; i++) {
          logMeditation(10);
          logWorkout(20);
        }
      }
      
      if (count >= 10) {
        // Set streak to 14 days to unlock more streak badges
        await setStreak(14);
        
        // Add more journal entries
        for (let i = 0; i < 5; i++) {
          await addJournalEntry(`Additional journal entry ${i + 1} for badge testing`);
        }
        
        // Log more meditation and workout sessions
        for (let i = 0; i < 5; i++) {
          logMeditation(15);
          logWorkout(30);
        }
      }
      
      // Force check all achievements
      await forceCheckStreakAchievements();
    } catch (error) {
      console.error('Error unlocking multiple badges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#0A0A0A' }]}>
      <StatusBar style="light" />
      
      <LinearGradient
        colors={['#111', '#000']}
        style={styles.background}
      />
      
      {/* Custom Header with Trophy Cabinet Theme */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#E0E0E0" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Trophy size={24} color="#FFD700" style={styles.trophyIcon} />
          <Text style={styles.headerTitle}>Badges</Text>
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Showcase Header with Polished Wooden Look */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <LinearGradient
            colors={['#8B4513', '#6B3613', '#4A2513']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.cabinetHeader}
          >
            <View style={styles.displayGlass}>
              <BlurView intensity={20} style={styles.blurBackground} tint="dark">
                <View style={styles.badgeShowcaseContainer}>
                  <View style={styles.badgeCountDisplay}>
                    <Trophy size={32} color="#FFD700" />
                    <Text style={styles.badgeCountText}>{unlockedBadges}/{totalBadges}</Text>
                    <Text style={styles.badgeCountLabel}>BADGES</Text>
                  </View>
                  
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <LinearGradient
                        colors={['#FFD700', '#FFA500']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                          styles.progressBarFill,
                          { width: `${(unlockedBadges / totalBadges) * 100}%` }
                        ]}
                      />
                    </View>
                  </View>
                  
                  <Text style={styles.badgeRemainingText}>
                    {totalBadges - unlockedBadges} badges remaining to unlock ({Math.round((unlockedBadges / totalBadges) * 100)}% complete)
                  </Text>
                </View>
              </BlurView>
            </View>
          </LinearGradient>
        </Animated.View>
        
        {/* Progress Summary */}
        <Animated.View entering={FadeInDown.delay(150).duration(600)} style={styles.showcaseShelf}>
          <LinearGradient
            colors={['#5D4037', '#3E2723']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.shelfBackground}
          >
            <View style={styles.shelfHeader}>
              <Award size={20} color="#FFD700" />
              <Text style={styles.shelfTitle}>Progress Summary</Text>
            </View>
            
            <Text style={styles.shelfDescription}>
              Your badge collection progress by category:
            </Text>
            
            <View style={styles.categorySummaryContainer}>
              {Object.keys(badgesByCategory).map(category => {
                const badges = badgesByCategory[category];
                const unlockedCount = badges.filter(badge => badge.unlocked).length;
                const percentage = getBadgeCompletionPercentage(badges);
                
                // Skip categories with no badges
                if (badges.length === 0) return null;
                
                // Get color based on category
                let categoryColor;
                switch (category) {
                  case 'streak':
                    categoryColor = '#FF5722';
                    break;
                  case 'journal':
                    categoryColor = '#2196F3';
                    break;
                  case 'challenge':
                    categoryColor = '#4CAF50';
                    break;
                  case 'meditation':
                    categoryColor = '#9C27B0';
                    break;
                  case 'workout':
                    categoryColor = '#F44336';
                    break;
                  case 'app':
                    categoryColor = '#00BCD4';
                    break;
                  case 'recovery':
                    categoryColor = '#3F51B5';
                    break;
                  case 'companion':
                    categoryColor = '#FF9800';
                    break;
                  case 'milestone':
                    categoryColor = '#673AB7';
                    break;
                  default:
                    categoryColor = '#757575';
                }
                
                return (
                  <View key={category} style={styles.categoryProgressItem}>
                    <View style={styles.categoryLabelContainer}>
                      <Text style={styles.categoryProgressLabel}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                      <Text style={styles.categoryProgressCount}>
                        {unlockedCount}/{badges.length}
                      </Text>
                    </View>
                    
                    <View style={styles.categoryProgressBarContainer}>
                      <View 
                        style={[
                          styles.categoryProgressFill,
                          { 
                            width: `${percentage}%`,
                            backgroundColor: categoryColor
                          }
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        </Animated.View>
        
        {/* Quick Evolution Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.showcaseShelf}>
          <LinearGradient
            colors={['#5D4037', '#3E2723']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.shelfBackground}
          >
            <View style={styles.shelfHeader}>
              <Star size={20} color="#FFD700" />
              <Text style={styles.shelfTitle}>Evolution Showcase</Text>
            </View>
            
            <Text style={styles.shelfDescription}>
              Quickly unlock multiple badges to evolve your companion:
            </Text>
          
            <View style={styles.evolutionButtonsContainer}>
              <TouchableOpacity 
                style={styles.evolutionButton}
                onPress={() => unlockMultipleBadges(5)}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#4CAF50', '#388E3C']}
                  style={styles.evolutionButtonGradient}
                >
                  <View style={styles.evolutionButtonContent}>
                    <Text style={styles.evolutionButtonTitle}>Stage 2 Evolution</Text>
                    <Text style={styles.evolutionButtonDescription}>Unlock 5+ badges</Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ChevronRight size={20} color="#FFFFFF" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.evolutionButton}
                onPress={() => unlockMultipleBadges(10)}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#673AB7', '#512DA8']}
                  style={styles.evolutionButtonGradient}
                >
                  <View style={styles.evolutionButtonContent}>
                    <Text style={styles.evolutionButtonTitle}>Final Evolution</Text>
                    <Text style={styles.evolutionButtonDescription}>Unlock 10+ badges</Text>
                  </View>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ChevronRight size={20} color="#FFFFFF" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
        
        {/* Add "Check All Badges" button */}
        <Animated.View entering={FadeInDown.delay(250).duration(600)} style={styles.showcaseShelf}>
          <LinearGradient
            colors={['#5D4037', '#3E2723']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.shelfBackground}
          >
            <View style={styles.shelfHeader}>
              <Check size={20} color="#4CAF50" />
              <Text style={styles.shelfTitle}>Badge Verification</Text>
            </View>
            
            <Text style={styles.shelfDescription}>
              Verify your progress to ensure all badges are correctly unlocked:
            </Text>
            
            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={checkAllAchievements}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#4CAF50', '#388E3C']}
                style={styles.verifyButtonGradient}
              >
                <View style={styles.evolutionButtonContent}>
                  <Text style={styles.evolutionButtonTitle}>Check All Badges</Text>
                  <Text style={styles.evolutionButtonDescription}>
                    Verify all achievements are properly unlocked
                  </Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Check size={20} color="#FFFFFF" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
        
        {/* Badge Categories */}
        <Animated.View entering={FadeInDown.delay(300).duration(600)} style={[styles.showcaseShelf, {marginBottom: 40}]}>
          <LinearGradient
            colors={['#5D4037', '#3E2723']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.shelfBackground}
          >
            <View style={styles.shelfHeader}>
              <Award size={20} color="#FFD700" />
              <Text style={styles.shelfTitle}>Badge Collection</Text>
            </View>
            
            {Object.keys(badgesByCategory).map((category) => {
              const badges = badgesByCategory[category];
              const categoryUnlocked = badges.filter(badge => badge.unlocked).length;
              const completionPercentage = getBadgeCompletionPercentage(badges);
              
              // Get the next badge to unlock if any
              const nextBadgeToUnlock = getNextBadgeToUnlock(badges);
              
              // Special styling for milestone category
              const isMilestoneCategory = category === 'milestone';
              const categoryStyle = isMilestoneCategory ? 
                { marginBottom: 30, marginTop: 10 } : // Extra spacing for milestone category
                { marginBottom: 20 };
                
              const badgeIconStyle = isMilestoneCategory ?
                { width: 50, height: 50 } : // Larger icons for milestone badges
                { width: 40, height: 40 };
              
              return (
                <View key={category} style={[styles.categoryItem, categoryStyle]}>
                  <View style={styles.categoryHeader}>
                    <Text style={[
                      styles.categoryName,
                      isMilestoneCategory && { fontSize: 18, fontWeight: 'bold' }
                    ]}>
                      {isMilestoneCategory ? 'Milestone Badges' : category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    <View style={[
                      styles.categoryBadgeCount,
                      isMilestoneCategory && { backgroundColor: 'rgba(103, 58, 183, 0.3)' }
                    ]}>
                      <Text style={styles.categoryCountText}>
                        {categoryUnlocked}/{badges.length} ({completionPercentage}%)
                      </Text>
                    </View>
                  </View>
                  
                  {nextBadgeToUnlock && (
                    <View style={styles.nextBadgeContainer}>
                      <Text style={styles.nextBadgeText}>
                        Next: {nextBadgeToUnlock.name}
                      </Text>
                      <Text style={styles.nextBadgeCriteria}>
                        {nextBadgeToUnlock.unlockCriteria}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.badgesDisplay}>
                    <View style={styles.badgesGrid}>
                      {badges.map((badge, index) => (
                        <View 
                          key={badge.id} 
                          style={[
                            styles.badgeItem,
                            badge.unlocked ? styles.badgeItemUnlocked : styles.badgeItemLocked
                          ]}
                        >
                          <View style={styles.badgeIconContainer}>
                            {badge.unlocked ? (
                              <LinearGradient
                                colors={['#FFD700', '#FFA500']}
                                style={styles.badgeIconBackground}
                              >
                                <Award size={24} color="#FFFFFF" />
                              </LinearGradient>
                            ) : (
                              <View style={styles.badgeIconBackgroundLocked}>
                                <Award size={24} color="rgba(255,255,255,0.3)" />
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.badgeTextContainer}>
                            <Text 
                              style={[
                                badge.unlocked ? styles.badgeNameUnlocked : styles.badgeNameLocked
                              ]}
                              numberOfLines={2}
                            >
                              {badge.name}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              );
            })}
          </LinearGradient>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trophyIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },
  content: {
    flex: 1,
  },
  cabinetHeader: {
    borderRadius: 16,
    margin: 16,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  displayGlass: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  blurBackground: {
    padding: 16,
  },
  badgeShowcaseContainer: {
    alignItems: 'center',
  },
  badgeCountDisplay: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeCountText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  badgeCountLabel: {
    fontSize: 12,
    color: '#FFD700',
    letterSpacing: 2,
    marginTop: 4,
  },
  progressBarContainer: {
    height: 12,
    width: '100%',
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  progressBarBackground: {
    height: '100%',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  badgeRemainingText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
    width: '100%',
  },
  showcaseShelf: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shelfBackground: {
    borderRadius: 16,
    padding: 16,
  },
  shelfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shelfTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  shelfDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  evolutionButtonsContainer: {
    gap: 12,
  },
  evolutionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  evolutionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  evolutionButtonContent: {
    flex: 1,
  },
  evolutionButtonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  evolutionButtonDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  categoryItem: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  categoryName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  categoryBadgeCount: {
    backgroundColor: 'rgba(255,215,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryCountText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badgesDisplay: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 12,
    width: '100%',
  },
  badgesGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '48%',
    height: 125,
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
  },
  badgeItemUnlocked: {
    opacity: 1,
    borderColor: 'rgba(255,215,0,0.6)',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  badgeItemLocked: {
    opacity: 0.9,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  badgeIconContainer: {
    marginBottom: 10,
  },
  badgeIconBackground: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  badgeIconBackgroundLocked: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(40,40,40,0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  badgeTextContainer: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 6,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeNameUnlocked: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  badgeNameLocked: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  badgeDescriptionUnlocked: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    width: '100%',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badgeDescriptionLocked: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    width: '100%',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  verifyButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  verifyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  nextBadgeContainer: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  nextBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  nextBadgeCriteria: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  categorySummaryContainer: {
    marginTop: 8,
  },
  categoryProgressItem: {
    marginBottom: 12,
  },
  categoryLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryProgressLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  categoryProgressCount: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  categoryProgressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
}); 