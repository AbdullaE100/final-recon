import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Pressable, Platform, ColorValue , StatusBar } from 'react-native';
import { useGamification } from '@/context/GamificationContext';
import { SafeAreaView , useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  FadeIn, 
  FadeInDown,
  useAnimatedStyle, 
  useSharedValue, 
  withTiming,
  interpolateColor
} from 'react-native-reanimated';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { Achievement } from '@/types/gamification';
import { storeData, getData, STORAGE_KEYS } from '@/utils/storage';

// Define types
interface BadgeItemProps {
  title: string;
  description: string;
  locked?: boolean;
  days?: number | null;
  onPress: () => void;
  delay?: number;
}

interface RewardItem {
  id: number;
  title: string;
  description: string;
  locked: boolean;
}

// Badge component for grid display
const BadgeItem: React.FC<BadgeItemProps> = ({ 
  title, 
  description, 
  locked = true, 
  days = null, 
  onPress,
  delay = 0
}) => {
  // Determine badge color based on days (for streak badges)
  let badgeColors: [string, string] = ['#6772FF', '#9265FF'];
  if (days) {
    if (days >= 90) {
      badgeColors = ['#FFD700', '#FFA500']; // Gold for 90+ days
    } else if (days >= 30) {
      badgeColors = ['#C0C0C0', '#A9A9A9']; // Silver for 30+ days
    } else if (days >= 7) {
      badgeColors = ['#CD7F32', '#8B4513']; // Bronze for 7+ days
    }
  }

  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={styles.badgeItemWrapper}
    >
      <Pressable 
        style={styles.badgeItem} 
        onPress={onPress}
        android_ripple={{ color: 'rgba(255,255,255,0.1)', borderless: true }}
      >
        <View style={styles.badgeIconContainer}>
          {locked ? (
            <View style={styles.lockedBadge}>
              <Ionicons name="lock-closed" size={24} color="rgba(255,255,255,0.5)" />
            </View>
          ) : (
            <LinearGradient
              colors={badgeColors}
              style={styles.unlockedBadge}
            >
              <MaterialCommunityIcons name="medal" size={32} color="#FFFFFF" />
            </LinearGradient>
          )}
        </View>
        <View style={styles.badgeTextContainer}>
          <Text style={styles.badgeTitle} numberOfLines={2}>
            {days ? `${days} Day${days > 1 ? 's' : ''}` : title}
          </Text>
          <Text style={styles.badgeDescription} numberOfLines={3}>
            {days ? `Maintain a ${days}-day clean streak` : description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

export default function AchievementsScreen() {
  const { 
    streak, 
    level, 
    points, 
    totalPoints, 
    achievements, 
    companion, 
    getCompanionStage,
    forceCheckStreakAchievements,
    journalEntries,
    fix30DayBadge: contextFix30DayBadge
  } = useGamification();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'badges' | 'companion'>('badges');
  const [isCheckingAchievements, setIsCheckingAchievements] = useState(false);

  
  // Calculate progress percentage
  const progressPercentage = (points / totalPoints) * 100;
  const pointsToNextLevel = totalPoints - points;
  
  // Count unlocked badges
  const unlockedBadgesCount = achievements.filter(badge => badge.unlocked).length;
  
  // Get specific badges
  const sevenDayBadge = achievements?.find(badge => badge.id === 'badge-streak-1');
  const thirtyDayBadge = achievements?.find(badge => badge.id === 'badge-streak-2');
  const ninetyDayBadge = achievements?.find(badge => badge.id === 'badge-streak-3');
  const journalBadge = achievements?.find(badge => badge.id === 'badge-journal-1');
  const journalStreakBadge = achievements?.find(badge => badge.id === 'badge-journal-2');
  const challengeBadge = achievements?.find(badge => badge.id === 'badge-challenge-1');
  
  // Get the proper companion stage based purely on badge count
  const companionStage = unlockedBadgesCount >= 30 ? 3 : unlockedBadgesCount >= 15 ? 2 : 1;
  
  console.log("ACHIEVEMENTS: Badge count =", unlockedBadgesCount, "Companion stage =", companionStage);
  
  // Function to force-check achievements
  const handleForceCheckAchievements = async () => {
    setIsCheckingAchievements(true);
    try {
      const updated = await forceCheckStreakAchievements();
      console.log('Force checked achievements, updated:', updated);
    } catch (error) {
      console.error('Error force-checking achievements:', error);
    } finally {
      setIsCheckingAchievements(false);
    }
  };
  
  // Check if any streak badges should be unlocked but aren't
  const hasStreakBadgeDiscrepancy = 
    (streak >= 7 && sevenDayBadge && !sevenDayBadge.unlocked) ||
    (streak >= 30 && thirtyDayBadge && !thirtyDayBadge.unlocked) ||
    (streak >= 90 && ninetyDayBadge && !ninetyDayBadge.unlocked);
  
  // Add a flag to detect missing journal badges
  const hasJournalBadgeDiscrepancy = () => {
    const firstJournalBadge = achievements.find(a => a.id === 'badge-journal-first');
    const threeJournalBadge = achievements.find(a => a.id === 'badge-journal-3');
    const tenJournalBadge = achievements.find(a => a.id === 'badge-journal-2');
    const twentyJournalBadge = achievements.find(a => a.id === 'badge-journal-master');
    
    // Check if any journal badges are missing based on journal entry count
    return (
      journalEntries.length >= 1 && firstJournalBadge && !firstJournalBadge.unlocked ||
      journalEntries.length >= 3 && threeJournalBadge && !threeJournalBadge.unlocked ||
      journalEntries.length >= 10 && tenJournalBadge && !tenJournalBadge.unlocked ||
      journalEntries.length >= 20 && twentyJournalBadge && !twentyJournalBadge.unlocked
    );
  };
  
  // Get companion animation source based on stage and type
  const getCompanionSource = () => {
    // The companion's type determines which companion to show
    const companionType = companion?.type || 'water';
    
    if (companionType === 'plant') {
      // Drowsi (Panda) animations
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/panda/panda_stage3.json');
        case 2:
          return require('@/assets/lottie/panda/panda_stage2.json');
        default:
          return require('@/assets/lottie/baby_panda_stage1.json');
      }
    } else if (companionType === 'fire') {
      // Snuglur animations
      switch (companionStage) {
        case 3:
          return require('../../baby monster stage 3.json');
        case 2:
          return require('../../baby monster stage 2.json');
        default:
          return require('../../baby monster stage 1.json');
      }
    } else {
      // Stripes (Tiger) animations
      switch (companionStage) {
        case 3:
          return require('../../baby tiger stage 3.json');
        case 2:
          return require('../../baby tiger stage 2.json');
        default:
          return require('../../baby tiger stage 1.json');
      }
    }
  };
  
  // Get companion name and description based on type and stage
  const getCompanionInfo = () => {
    const companionType = companion?.type || 'water';
    
    if (companionType === 'plant') {
      return {
        name: companion?.name || 'Drowsi',
        descriptions: [
          "Falls asleep faster than your urges — let him nap, so you don't relapse.",
          "Growing stronger from your consistency, Drowsi now enjoys mindful eating. His noodle ritual brings focus and patience.",
          "Fully evolved, Drowsi has mastered meditation. His calm presence gives you the inner peace to overcome any challenge."
        ]
      };
    } else if (companionType === 'fire') {
      return {
        name: companion?.name || 'Snuglur',
        descriptions: [
          "Warm and playful, this little creature is your constant reminder to stay strong and focused.",
          "As your discipline grows, so does Snuglur's fiery spirit, burning away temptations with newfound intensity.",
          "In its final form, Snuglur radiates powerful energy that helps you transform urges into creative passion."
        ]
      };
    } else {
      return {
        name: companion?.name || 'Stripes',
        descriptions: [
          "Half tiger, half therapist — growls when you're about to mess up.",
          "Tiger shark of sobriety — all the bite of willpower with the wet nose of accountability.",
          "A powerful guardian of serenity and emotional control, Stripes has evolved along with your ability to channel desires into positive energy."
        ]
      };
    }
  };
  
  const companionInfo = getCompanionInfo();
  

  
  // Fix streak badges in UI
  const streakBadges = [
    {
      id: 'badge-streak-7',
      name: '7 Days',
      description: 'Maintain a 7-day clean streak',
      category: 'streak',
      unlockCriteria: 'Maintain a 7-day streak',
      unlocked: streak >= 7
    },
    {
      id: 'badge-streak-14',
      name: '14 Days',
      description: 'Maintain a 14-day clean streak',
      category: 'streak',
      unlockCriteria: 'Maintain a 14-day streak',
      unlocked: streak >= 14
    },
    {
      id: 'badge-streak-30',
      name: '30 Days',
      description: 'Maintain a 30-day clean streak',
      category: 'streak',
      unlockCriteria: 'Maintain a 30-day streak',
      unlocked: streak >= 30
    },
    {
      id: 'badge-streak-90',
      name: '90 Days',
      description: 'Maintain a 90-day clean streak',
      category: 'streak',
      unlockCriteria: 'Maintain a 90-day streak',
      unlocked: streak >= 90
    }
  ];
  
  // Add a function to specifically fix the 30-day badge
  const fix30DayBadge = async () => {
    try {
      setIsCheckingAchievements(true);
      
      // Use the direct fix function from the context
      const result = await contextFix30DayBadge();
      
      console.log(`Result of fixing 30-day badge:`, result);
      
      if (result) {
        console.log('Successfully fixed 30-day badge');
      } else {
        console.log('Could not fix 30-day badge. Check console for details.');
      }
    } catch (error) {
      console.error('Error fixing 30-day badge:', error);
    } finally {
      setIsCheckingAchievements(false);
    }
  };

  // Add a check for missing 30-day badge
  const has30DayBadgeIssue = () => {
    const thirtyDayBadge = achievements.find(a => a.id === 'badge-streak-2' || a.id === 'badge-streak-30days');
    return streak >= 30 && thirtyDayBadge && !thirtyDayBadge.unlocked;
  };
  
  const renderBadgesTab = () => {
    // Group badges by category
    const badgesByCategory = achievements ? achievements.reduce((acc: any, badge) => {
      if (!acc[badge.category]) {
        acc[badge.category] = [];
      }
      acc[badge.category].push(badge);
      return acc;
    }, {}) : {};

    // Custom order for categories
    const categoryOrder = [
      'streak', 
      'journal', 
      'challenge', 
      'meditation', 
      'workout', 
      'app', 
      'recovery', 
      'companion', 
      'milestone'
    ];
    
    // Sort categories
    const sortedCategories = Object.keys(badgesByCategory).sort(
      (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
    );

    // Limit to 4 badges per category for better display
    const limitBadges = (badges: Achievement[], limit = 4) => {
      // Sort by unlocked status and then by numerical order for streak badges
      let processedBadges = [...badges].sort((a, b) => {
        // Show unlocked badges first
        if (a.unlocked && !b.unlocked) return -1;
        if (!a.unlocked && b.unlocked) return 1;
        
        // For streak badges, sort by required days
        if (a.category === 'streak' && b.category === 'streak') {
          const daysA = extractNumberFromString(a.name) || 0;
          const daysB = extractNumberFromString(b.name) || 0;
          return daysA - daysB;
        }
        
        return 0;
      });
      
      // Ensure we have exactly 4 badges per category
      if (processedBadges.length > limit) {
        return processedBadges.slice(0, limit);
      } else if (processedBadges.length < limit) {
        return [...processedBadges, ...createAdditionalBadges(badges[0]?.category || 'unknown', limit - processedBadges.length)];
      }
      
      return processedBadges;
    };

    return (
    <>
        {/* Level and Progress Section */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.levelContainer}>
          <View style={styles.levelBadgeContainer}>
            <LinearGradient
              colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
              style={styles.levelBadge}
            >
              <Text style={styles.levelText}>Level {level}</Text>
            </LinearGradient>
          </View>
          
          <View style={styles.pointsContainer}>
            <Text style={styles.pointsText}>{points} / {totalPoints} points</Text>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${progressPercentage}%` as any }
                ]} 
              />
            </View>
          </View>
          
          <Text style={styles.nextLevelText}>
            {pointsToNextLevel} points to Level {level + 1}
          </Text>
          
          {/* Manual Achievement Check Buttons */}
          {hasStreakBadgeDiscrepancy && (
            <TouchableOpacity 
              style={styles.checkAchievementsButton}
              onPress={handleForceCheckAchievements}
              disabled={isCheckingAchievements}
            >
              <Text style={styles.checkAchievementsButtonText}>
                {isCheckingAchievements ? 'Checking...' : 'Verify Streak Badges'}
              </Text>
            </TouchableOpacity>
          )}
          
          {has30DayBadgeIssue() && (
            <TouchableOpacity 
              style={[styles.checkAchievementsButton, { marginTop: 10, backgroundColor: '#FF9500' }]}
              onPress={fix30DayBadge}
              disabled={isCheckingAchievements}
            >
              <Text style={styles.checkAchievementsButtonText}>
                {isCheckingAchievements ? 'Fixing...' : 'Fix 30-Day Badge'}
              </Text>
            </TouchableOpacity>
          )}
          
          {hasJournalBadgeDiscrepancy() && (
            <TouchableOpacity 
              style={[styles.checkAchievementsButton, { marginTop: 10, backgroundColor: '#4CD964' }]}
              onPress={handleForceCheckAchievements}
              disabled={isCheckingAchievements}
            >
              <Text style={styles.checkAchievementsButtonText}>
                {isCheckingAchievements ? 'Checking...' : 'Verify Journal Badges'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
        
        {/* Badges Section */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.badgesHeader}>
          <Text style={styles.sectionTitle}>
            Badges ({achievements ? achievements.filter(a => a.unlocked).length : 0}/36)
          </Text>
        </Animated.View>
        
        {/* Display badges by category */}
        {sortedCategories.map((category, categoryIndex) => {
          // Get an appropriate color for this category
          let categoryGradient: [string, string] = ['rgba(103, 114, 255, 0.15)', 'rgba(103, 114, 255, 0.05)'];
          
          if (category === 'streak') {
            categoryGradient = ['rgba(255, 215, 0, 0.15)', 'rgba(255, 215, 0, 0.05)']; // Gold tint for streak
          } else if (category === 'journal') {
            categoryGradient = ['rgba(102, 204, 153, 0.15)', 'rgba(102, 204, 153, 0.05)']; // Green tint
          } else if (category === 'challenge') {
            categoryGradient = ['rgba(255, 102, 102, 0.15)', 'rgba(255, 102, 102, 0.05)']; // Red tint
          } else if (category === 'meditation') {
            categoryGradient = ['rgba(147, 112, 219, 0.15)', 'rgba(147, 112, 219, 0.05)']; // Purple tint for meditation
          } else if (category === 'workout') {
            categoryGradient = ['rgba(70, 130, 180, 0.15)', 'rgba(70, 130, 180, 0.05)']; // Steel blue for workout
          }
          
          // For streak category, use our predefined streakBadges array
          let categoryBadges: Achievement[];
          
          if (category === 'streak') {
            // Return a copy of our fixed streakBadges array
            categoryBadges = [...streakBadges];
          } else {
            // For other categories, use the existing logic
            categoryBadges = badgesByCategory[category] && badgesByCategory[category].length > 0 ? 
              limitBadges(badgesByCategory[category], 4) : 
              createAdditionalBadges(category, 4);
              
            // Ensure we have exactly 4 badges
            if (categoryBadges.length < 4) {
              categoryBadges = [...categoryBadges, ...createAdditionalBadges(category, 4 - categoryBadges.length)];
            }
          }
          
          const unlockedCount = categoryBadges.filter((b: Achievement) => b.unlocked).length;
          
          return (
            <Animated.View 
              key={category} 
              entering={FadeInDown.delay(300 + (categoryIndex * 100)).duration(400)} 
              style={styles.categoryContainer}
            >
              <LinearGradient
                colors={categoryGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.categoryHeader}
              >
                <Text style={styles.categoryTitle}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} Badges
                </Text>
                <View style={styles.categoryBadgeCount}>
                  <Text style={styles.categoryCountText}>
                    {unlockedCount}/{categoryBadges.length}
                  </Text>
                </View>
              </LinearGradient>
              <View style={styles.badgesGrid}>
                {categoryBadges.map((badge: Achievement, badgeIndex: number) => (
                  <BadgeItem
                    key={badge.id}
                    title={badge.name}
                    description={badge.description}
                    locked={!badge.unlocked}
                    days={category === 'streak' ? extractNumberFromString(badge.name) : null}
                    delay={badgeIndex * 50}
                    onPress={() => {}}
                  />
                ))}
              </View>
            </Animated.View>
          );
        })}
    </>
  );
  };
  
  const renderCompanionTab = () => (
    <View style={styles.companionContainer}>
      <LinearGradient
        colors={['rgba(75, 192, 255, 0.2)', 'rgba(30, 144, 255, 0.2)']}
        style={styles.companionBackground}
      >
        <View style={styles.companionAnimationContainer}>
          <LottieView
            source={getCompanionSource()}
            autoPlay
            loop
            style={styles.companionAnimation}
          />
        </View>
        
        <View style={styles.companionInfo}>
          <View style={styles.companionNameContainer}>
            <Text style={styles.companionName}>
              {companionInfo.name}
            </Text>
            
            <Text style={styles.companionStageText}>
              Stage {companionStage}
            </Text>
          </View>
          
          <Text style={styles.companionDescription}>
            {companionInfo.descriptions[companionStage - 1]}
          </Text>
          
          <View style={styles.progressInfo}>
            <Text style={styles.progressLabel}>Evolution Progress:</Text>
            <View style={styles.badgeProgressContainer}>
              <View style={styles.badgeProgressBackground}>
                <View 
                  style={[
                    styles.badgeProgressFill, 
                    { 
                      width: companionStage === 3 
                        ? '100%' 
                        : companionStage === 2 
                          ? `${(unlockedBadgesCount - 15) * (100/15)}%` // Progress from 15-30 badges
                          : `${unlockedBadgesCount * (100/15)}%` // Progress from 0-15 badges
                    }
                  ]} 
                />
              </View>
            </View>
            <Text style={styles.badgeCount}>
              {companionStage === 3 
                ? 'Final evolution reached!'
                : companionStage === 2
                  ? `${unlockedBadgesCount}/30 badges (${30 - unlockedBadgesCount} more for final evolution)`
                  : `${unlockedBadgesCount}/15 badges (${15 - unlockedBadgesCount} more for evolution)`}
            </Text>
          </View>
          

        </View>
      </LinearGradient>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#121212', '#000000']}
        style={styles.background}
      />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Achievements</Text>
      </View>
      
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'badges' && styles.activeTab
          ]}
          onPress={() => setActiveTab('badges')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'badges' && styles.activeTabText
          ]}>
            Badges
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'companion' && styles.activeTab
          ]}
          onPress={() => setActiveTab('companion')}
        >
          <Text style={[
            styles.tabText, 
            activeTab === 'companion' && styles.activeTabText
          ]}>
            Companion
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'badges' ? renderBadgesTab() : renderCompanionTab()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30,30,30,0.8)',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#6772FF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  levelContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  levelBadgeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pointsContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarBackground: {
    flex: 1,
    borderRadius: 5,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#6772FF',
    borderRadius: 5,
  },
  nextLevelText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
    padding: 12,
  },
  badgeItemWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  badgeItem: {
    width: '100%',
    backgroundColor: 'rgba(30, 30, 40, 0.6)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    minHeight: 180,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  badgeIconContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTextContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  lockedBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(50, 50, 60, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  unlockedBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6772FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 10,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  badgeDescription: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 16,
  },
  companionContainer: {
    marginTop: 20,
  },
  companionBackground: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  companionAnimationContainer: {
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  companionAnimation: {
    width: 250,
    height: 250,
  },
  companionInfo: {
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  companionNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  companionName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'left',
  },
  companionDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  progressInfo: {
    marginTop: 10,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  badgeProgressContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  badgeProgressBackground: {
    flex: 1,
    borderRadius: 4,
  },
  badgeProgressFill: {
    height: '100%',
    backgroundColor: '#6772FF',
    borderRadius: 4,
  },
  badgeCount: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  companionStageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  checkAchievementsButton: {
    backgroundColor: '#6772FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  checkAchievementsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  badgeRarityText: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 2,
  },
  badgePercentText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  categoryContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(25, 25, 35, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryBadgeCount: {
    backgroundColor: 'rgba(103, 114, 255, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryCountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

});

// Helper function to extract number from string (e.g. "90 Day Champion" -> 90)
const extractNumberFromString = (str: string): number | null => {
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[0]) : null;
}

// Create additional well-designed badges for a category when needed
const createAdditionalBadges = (category: string, count = 4): Achievement[] => {
  const badges: Achievement[] = [];
  
  if (category === 'streak') {
    const streakBadges: Achievement[] = [
      {
        id: 'custom-streak-1',
        name: '7 Days',
        description: 'Maintain a clean streak for a full week',
        category: 'streak',
        unlockCriteria: 'Maintain a 7-day streak',
        unlocked: false
      },
      {
        id: 'custom-streak-2',
        name: '14 Days',
        description: 'Maintain a clean streak for two weeks',
        category: 'streak',
        unlockCriteria: 'Maintain a 14-day streak',
        unlocked: false
      },
      {
        id: 'custom-streak-3',
        name: '30 Days',
        description: 'Maintain a clean streak for a full month',
        category: 'streak',
        unlockCriteria: 'Maintain a 30-day streak',
        unlocked: false
      },
      {
        id: 'custom-streak-4',
        name: '90 Days',
        description: 'Complete the standard reboot challenge',
        category: 'streak',
        unlockCriteria: 'Maintain a 90-day streak',
        unlocked: false
      }
    ];
    
    for (let i = 0; i < count && i < streakBadges.length; i++) {
      badges.push(streakBadges[i]);
    }
  } 
  else if (category === 'journal') {
    const journalBadges: Achievement[] = [
      {
        id: 'custom-journal-1',
        name: 'First Entry',
        description: 'Begin your self-reflection journey',
        category: 'journal',
        unlockCriteria: 'Create your first journal entry',
        unlocked: false
      },
      {
        id: 'custom-journal-2',
        name: '7-Day Writer',
        description: 'Journal consistently for a week',
        category: 'journal',
        unlockCriteria: 'Create 7 journal entries',
        unlocked: false
      },
      {
        id: 'custom-journal-3',
        name: 'Deep Reflector',
        description: 'Write a detailed entry about your progress',
        category: 'journal',
        unlockCriteria: 'Create a journal entry with 200+ words',
        unlocked: false
      },
      {
        id: 'custom-journal-4',
        name: 'Gratitude Master',
        description: 'Practice gratitude in your recovery journey',
        category: 'journal',
        unlockCriteria: 'Create 5 gratitude-focused entries',
        unlocked: false
      }
    ];
    
    for (let i = 0; i < count && i < journalBadges.length; i++) {
      badges.push(journalBadges[i]);
    }
  }
  else if (category === 'challenge') {
    const challengeBadges: Achievement[] = [
      {
        id: 'custom-challenge-1',
        name: 'Challenge Taker',
        description: 'Begin your first official challenge',
        category: 'challenge',
        unlockCriteria: 'Start your first challenge',
        unlocked: false
      },
      {
        id: 'custom-challenge-2',
        name: 'Habit Replacer',
        description: 'Successfully replace urges with healthy habits',
        category: 'challenge',
        unlockCriteria: 'Complete the Habit Replacement challenge',
        unlocked: false
      },
      {
        id: 'custom-challenge-3',
        name: 'Morning Warrior',
        description: 'Establish a positive morning routine',
        category: 'challenge',
        unlockCriteria: 'Complete 5 morning meditation sessions',
        unlocked: false
      },
      {
        id: 'custom-challenge-4',
        name: 'Challenge Master',
        description: 'Become proficient at completing challenges',
        category: 'challenge',
        unlockCriteria: 'Complete 5 different challenges',
        unlocked: false
      }
    ];
    
    for (let i = 0; i < count && i < challengeBadges.length; i++) {
      badges.push(challengeBadges[i]);
    }
  }
  else if (category === 'meditation') {
    const meditationBadges: Achievement[] = [
      {
        id: 'custom-meditation-1',
        name: 'First Breath',
        description: 'Begin your meditation practice',
        category: 'meditation',
        unlockCriteria: 'Complete your first meditation session',
        unlocked: false
      },
      {
        id: 'custom-meditation-2',
        name: 'Mindful Week',
        description: 'Develop a consistent meditation practice',
        category: 'meditation',
        unlockCriteria: 'Meditate for 7 consecutive days',
        unlocked: false
      },
      {
        id: 'custom-meditation-3',
        name: 'Urge Surfer',
        description: 'Use meditation to overcome urges',
        category: 'meditation',
        unlockCriteria: 'Use meditation during 3 urge moments',
        unlocked: false
      },
      {
        id: 'custom-meditation-4',
        name: 'Zen Master',
        description: 'Achieve deep focus in meditation',
        category: 'meditation',
        unlockCriteria: 'Complete a 20-minute meditation session',
        unlocked: false
      }
    ];
    
    for (let i = 0; i < count && i < meditationBadges.length; i++) {
      badges.push(meditationBadges[i]);
    }
  }
  else if (category === 'workout') {
    const workoutBadges: Achievement[] = [
      {
        id: 'custom-workout-1',
        name: 'First Sweat',
        description: 'Begin your fitness journey',
        category: 'workout',
        unlockCriteria: 'Complete your first workout session',
        unlocked: false
      },
      {
        id: 'custom-workout-2',
        name: 'Consistency King',
        description: 'Establish a regular workout routine',
        category: 'workout',
        unlockCriteria: 'Complete 10 workout sessions',
        unlocked: false
      },
      {
        id: 'custom-workout-3',
        name: 'Urge Crusher',
        description: 'Use exercise to overcome urges',
        category: 'workout',
        unlockCriteria: 'Record 5 workouts that helped with urges',
        unlocked: false
      },
      {
        id: 'custom-workout-4',
        name: 'Endurance Master',
        description: 'Push your physical limits',
        category: 'workout',
        unlockCriteria: 'Complete a 60-minute workout session',
        unlocked: false
      }
    ];
    
    for (let i = 0; i < count && i < workoutBadges.length; i++) {
      badges.push(workoutBadges[i]);
    }
  }
  else {
    // For any other category, create generic badges
    for (let i = 0; i < count; i++) {
      badges.push({
        id: `${category}-badge-${i+1}`,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Expert`,
        description: `Master your ${category} skills`,
        category,
        unlockCriteria: `Complete ${category} activities`,
        unlocked: false
      });
    }
  }
  
  return badges;
};