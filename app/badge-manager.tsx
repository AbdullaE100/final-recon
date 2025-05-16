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
  
  // Group badges by category
  const badgesByCategory: BadgesByCategory = achievements ? achievements.reduce((acc: BadgesByCategory, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {}) : {};
  
  const applyCustomStreak = async () => {
    const value = parseInt(customStreakValue, 10);
    if (isNaN(value) || value < 0) {
      // Invalid input
      return;
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
          <Text style={styles.headerTitle}>Achievement Cabinet</Text>
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
                    <Text style={styles.badgeCountLabel}>ACHIEVEMENTS</Text>
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
                    {totalBadges - unlockedBadges} badges remaining to unlock
                  </Text>
                </View>
              </BlurView>
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
              
              return (
                <View key={category} style={styles.categoryItem}>
                  <View style={styles.categoryHeader}>
                    <Text style={styles.categoryName}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    <View style={styles.categoryBadgeCount}>
                      <Text style={styles.categoryCountText}>
                        {categoryUnlocked}/{badges.length}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.badgesDisplay}>
                    <BlurView intensity={10} style={styles.badgesDisplayInner} tint="dark">
                      <View style={styles.badgesGrid}>
                        {badges.map((badge) => (
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
                                  <Award size={16} color="#FFFFFF" />
                                </LinearGradient>
                              ) : (
                                <View style={styles.badgeIconBackgroundLocked}>
                                  <Award size={16} color="rgba(255,255,255,0.3)" />
                                </View>
                              )}
                            </View>
                            
                            <Text 
                              style={[
                                badge.unlocked ? styles.badgeNameUnlocked : styles.badgeNameLocked
                              ]}
                              numberOfLines={1}
                            >
                              {badge.name}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </BlurView>
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
    marginBottom: 10,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  categoryBadgeCount: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  badgesDisplay: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgesDisplayInner: {
    padding: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  badgeItem: {
    width: (SCREEN_WIDTH - 100) / 3,
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeItemUnlocked: {
    opacity: 1,
  },
  badgeItemLocked: {
    opacity: 0.6,
  },
  badgeIconContainer: {
    marginBottom: 8,
  },
  badgeIconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconBackgroundLocked: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badgeNameUnlocked: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    maxWidth: 100,
  },
  badgeNameLocked: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    maxWidth: 100,
  },
}); 