import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Pressable, Platform, ColorValue , StatusBar, Alert, Modal, ActivityIndicator } from 'react-native';
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
import { useStreak } from '@/context/StreakContext';

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
        style={[styles.badgeItem, locked ? styles.lockedBadgeItem : styles.unlockedBadgeItem]} 
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
          <Text style={[styles.badgeTitle, locked ? {} : styles.unlockedBadgeTitle]} numberOfLines={2}>
            {days ? `${days} Day${days > 1 ? 's' : ''}` : title}
          </Text>
          <Text style={[styles.badgeDescription, locked ? {} : styles.unlockedBadgeDescription]} numberOfLines={3}>
            {days ? `Maintain a ${days}-day clean streak` : description}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

// This component will be used to handle the rendering of badges header
// It will NOT include the "Refresh badges" button
const BadgesHeader = ({ achievementsCount }: { achievementsCount: number }) => {
  return (
    <Animated.View 
      entering={FadeInDown.delay(200).duration(500)} 
      style={styles.badgesHeader}
    >
      <Text style={styles.sectionTitle}>
        Badges ({achievementsCount}/36)
      </Text>
    </Animated.View>
  );
};

export default function AchievementsScreen() {
  const gamification = useGamification();
  const { 
    streak = 0, 
    level = 1, 
    points = 0, 
    totalPoints = 0, 
    achievements = [], 
    companion, 
    getCompanionStage,
    forceCheckStreakAchievements,
    journalEntries = [],
    fix30DayBadge: contextFix30DayBadge,
    checkAllAchievementTypes
  } = gamification || {};
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'badges' | 'companion'>('badges');
  const [isCheckingAchievements, setIsCheckingAchievements] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<Achievement | null>(null);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [displayBadges, setDisplayBadges] = useState<Achievement[]>([]);

  // If achievements is empty, use placeholder badges for display
  useEffect(() => {
    const defaultCategories = ['streak', 'journal', 'challenge', 'meditation'];
    
    if (!achievements || achievements.length === 0) {
      console.log('Creating placeholder badges for display');
      const placeholderBadges: Achievement[] = [];
      
      defaultCategories.forEach(category => {
        for (let i = 0; i < 4; i++) {
          placeholderBadges.push({
            id: `placeholder-${category}-${i}`,
            name: category === 'streak' ? 
              [7, 30, 90, 365][i] + ' Days' : 
              'Achievement ' + (i + 1),
            description: category === 'streak' ? 
              `Maintain a ${[7, 30, 90, 365][i]}-day clean streak` :
              'Keep using the app to unlock more badges!',
            category,
            unlocked: false,
            icon: 'lock',
            unlockCriteria: 'Continue using the app to unlock'
          });
        }
      });
      
      setDisplayBadges(placeholderBadges);
    } else {
      setDisplayBadges(achievements);
    }
  }, [achievements]);

  // Calculate progress percentage
  const progressPercentage = (points / totalPoints) * 100;
  const pointsToNextLevel = totalPoints - points;
  
  // Count unlocked badges
  const unlockedBadgesCount = displayBadges.filter(badge => badge.unlocked).length;
  
  // Get specific badges
  const sevenDayBadge = displayBadges?.find(badge => badge.id === 'badge-streak-1');
  const thirtyDayBadge = displayBadges?.find(badge => badge.id === 'badge-streak-2');
  const ninetyDayBadge = displayBadges?.find(badge => badge.id === 'badge-streak-3');
  const journalBadge = displayBadges?.find(badge => badge.id === 'badge-journal-1');
  const journalStreakBadge = displayBadges?.find(badge => badge.id === 'badge-journal-2');
  const challengeBadge = displayBadges?.find(badge => badge.id === 'badge-challenge-1');
  
  // Get the proper companion stage based purely on badge count
  const companionStage = unlockedBadgesCount >= 30 ? 3 : unlockedBadgesCount >= 15 ? 2 : 1;
  
  console.log("ACHIEVEMENTS: Badge count =", unlockedBadgesCount, "Companion stage =", companionStage);
  
  // Automatically check for badge unlocks when component mounts
  useEffect(() => {
    // Check for all types of achievements, including challenge badges
    const checkAchievements = async () => {
      try {
        console.log('Achievements screen: Checking all badge types on mount');
        setIsCheckingAchievements(true);
        
        // First check streak achievements
        if (typeof forceCheckStreakAchievements === 'function') {
          console.log('Checking streak achievements');
          await forceCheckStreakAchievements();
        }
        
        // Then check all other achievement types (challenges, journal, etc.)
        if (typeof checkAllAchievementTypes === 'function') {
          console.log('Checking all other achievement types');
          await checkAllAchievementTypes();
        }
      } catch (error) {
        console.error('Error checking achievements:', error);
      } finally {
        setIsCheckingAchievements(false);
      }
    };
    
    checkAchievements();
  }, []);

  // Create simple fixed streak badges array
  const streakBadges = [
    {
      id: 'badge-streak-7',
      name: '7 Days',
      description: 'Maintain a 7-day clean streak',
      category: 'streak',
      unlocked: achievements?.some(badge => 
        (badge.id === 'badge-streak-1' || 
         badge.id === 'badge-streak-7days' || 
         badge.id.includes('7')) && 
        badge.unlocked
      ) || false,
      icon: 'medal',
      unlockCriteria: 'Complete 7 days of streak'
    },
    {
      id: 'badge-streak-30days',
      name: '30 Days',
      description: 'Maintain a 30-day clean streak',
      category: 'streak',
      unlocked: achievements?.some(badge => 
        (badge.id === 'badge-streak-2' || 
         badge.id === 'badge-streak-30days' || 
         badge.id.includes('30')) && 
        badge.unlocked
      ) || false,
      icon: 'medal',
      unlockCriteria: 'Complete 30 days of streak'
    },
    {
      id: 'badge-streak-90days',
      name: '90 Days',
      description: 'Maintain a 90-day clean streak',
      category: 'streak',
      unlocked: achievements?.some(badge => 
        (badge.id === 'badge-streak-3' || 
         badge.id === 'badge-streak-90days' || 
         badge.id.includes('90')) && 
        badge.unlocked
      ) || false,
      icon: 'medal',
      unlockCriteria: 'Complete 90 days of streak'
    },
    {
      id: 'badge-streak-365days',
      name: '365 Days',
      description: 'Maintain a 365-day clean streak',
      category: 'streak',
      unlocked: achievements?.some(badge => 
        (badge.id === 'badge-streak-4' || 
         badge.id === 'badge-streak-365days' || 
         badge.id === 'badge-streak-1year' || 
         badge.id.includes('365')) && 
        badge.unlocked
      ) || false,
      icon: 'medal',
      unlockCriteria: 'Complete 365 days of streak'
    }
  ];
  
  // Get companion animation source based on stage and type
  const getCompanionSource = () => {
    // The companion's type determines which companion to show
    // IMPORTANT: Read from companion?.type first, fallback only if missing
    console.log(`Looking for companion type: ${companion?.type || 'none'}, name: ${companion?.name || 'none'}`);
    
    const companionType = companion?.type || 'plant'; // Default to plant/Drowsi instead of water
    
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
          return require('@/assets/lottie/baby_monster_stage3.json');
        case 2:
          return require('@/assets/lottie/baby_monster_stage2.json');
        default:
          return require('@/assets/lottie/baby_monster_stage1.json');
      }
    } else if (companionType === 'water') {
      // Stripes (Tiger) animations - IMPORTANT: This is specifically for the tiger (Stripes)
      console.log("Using Stripes (tiger) animations");
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/baby_tiger_stage3.json');
        case 2:
          return require('@/assets/lottie/baby_tiger_stage2.json');
        default:
          return require('@/assets/lottie/baby_tiger_stage1.json');
      }
    } else {
      // Default to Drowsi (Panda) animations if type is unknown
      // This ensures we don't accidentally show the wrong animation
      console.warn(`Unknown companion type: ${companionType}, defaulting to Drowsi`);
      switch (companionStage) {
        case 3:
          return require('@/assets/lottie/panda/panda_stage3.json');
        case 2:
          return require('@/assets/lottie/panda/panda_stage2.json');
        default:
          return require('@/assets/lottie/baby_panda_stage1.json');
      }
    }
  };
  
  // Get companion name and description based on type and stage
  const getCompanionInfo = () => {
    // Determine the companion type - ensure it's consistent with the animation source
    let companionType = companion?.type || 'plant'; // Default to plant/Drowsi
    
    // Debug companion info
    console.log(`Companion before detection - type: ${companionType}, name: ${companion?.name || 'none'}`);
    
    // Force override with correct type if needed - this ensures the name matches the animation
    const source = getCompanionSource().toString();
    
    // Log the source for debugging
    console.log(`Animation source: ${source.substring(0, 50)}...`);
    
    if (source.includes('panda')) {
      console.log('Animation source includes panda - using plant type (Drowsi)');
      companionType = 'plant';
    } else if (source.includes('monster')) {
      console.log('Animation source includes monster - using fire type (Snuglur)');
      companionType = 'fire';
    } else if (source.includes('tiger')) {
      console.log('Animation source includes tiger - using water type (Stripes)');
      companionType = 'water';
    }
    
    // Log final companion type
    console.log(`Final companion type: ${companionType}`);
    
    if (companionType === 'plant') {
      return {
        name: 'Drowsi', // Always use 'Drowsi' for plant type, ignore any custom name
        descriptions: [
          "Falls asleep faster than your urges — let him nap, so you don't relapse.",
          "Growing stronger from your consistency, Drowsi now enjoys mindful eating. His noodle ritual brings focus and patience.",
          "Fully evolved, Drowsi has mastered meditation. His calm presence gives you the inner peace to overcome any challenge."
        ]
      };
    } else if (companionType === 'fire') {
      return {
        name: 'Snuglur', // Always use 'Snuglur' for fire type
        descriptions: [
          "Warm and playful, this little creature is your constant reminder to stay strong and focused.",
          "As your discipline grows, so does Snuglur's fiery spirit, burning away temptations with newfound intensity.",
          "In its final form, Snuglur radiates powerful energy that helps you transform urges into creative passion."
        ]
      };
    } else {
      return {
        name: 'Stripes', // Always use 'Stripes' for water type
        descriptions: [
          "Half tiger, half therapist — growls when you're about to mess up.",
          "Tiger shark of sobriety — all the bite of willpower with the wet nose of accountability.",
          "A powerful guardian of serenity and emotional control, Stripes has evolved along with your ability to channel desires into positive energy."
        ]
      };
    }
  };
  
  const companionInfo = getCompanionInfo();
  
  const renderBadgesTab = () => {
    // Show loading state while checking achievements
    if (isCheckingAchievements) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6772FF" />
          <Text style={styles.loadingText}>Loading achievements...</Text>
        </View>
      );
    }

    // Group badges by category
    const badgesByCategory = displayBadges ? displayBadges.reduce((acc: any, badge) => {
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
          
          {/* Only show points container if points exist */}
          {(points > 0 || totalPoints > 0) && (
            <View style={styles.pointsContainer}>
              <Text style={styles.pointsText}>{points} / {totalPoints} points</Text>
            </View>
          )}
          
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
          
          {/* Badge counts */}
          <View style={styles.badgeStatsContainer}>
            <Text style={styles.badgeStatsText}>
              {unlockedBadgesCount} / {displayBadges?.length || 0} badges unlocked
            </Text>
            
            {/* Remove the instructional text as requested by user */}
          </View>
          
          {/* Only show points to next level if there are points */}
          {pointsToNextLevel > 0 && (
            <Text style={styles.nextLevelText}>
              {pointsToNextLevel} points to Level {level + 1}
            </Text>
          )}
        </Animated.View>
        
        {/* Badges Section */}
        <BadgesHeader achievementsCount={unlockedBadgesCount} />
        
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
                    onPress={() => handleBadgePress(badge)}
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

  const handleBadgePress = (badge: Achievement) => {
    setSelectedBadge(badge);
    setBadgeModalVisible(true);
  };

  // Create a proper badges array if achievements are not available or empty
  useEffect(() => {
    if (!achievements || achievements.length === 0) {
      console.log('No achievements found, creating placeholder badges');
      const defaultCategories = ['streak', 'journal', 'challenge', 'meditation'];
      const placeholderBadges: Achievement[] = [];
      
      defaultCategories.forEach(category => {
        for (let i = 0; i < 4; i++) {
          placeholderBadges.push({
            id: `placeholder-${category}-${i}`,
            name: category === 'streak' ? 
              [7, 30, 90, 365][i] + ' Days' : 
              'Achievement ' + (i + 1),
            description: category === 'streak' ? 
              `Maintain a ${[7, 30, 90, 365][i]}-day clean streak` :
              'Keep using the app to unlock more badges!',
            category,
            unlocked: false,
            icon: 'lock',
            unlockCriteria: 'Continue using the app to unlock'
          });
        }
      });
      
      // Manually set badges for display in the component state
      // This won't affect the global context but will ensure badges display
      // badgesToShow = placeholderBadges; // This line is removed as per the new_code
      
      // Force the check for streak achievements if we have a streak but no badges
      if (streak > 0 && forceCheckStreakAchievements) {
        forceCheckStreakAchievements();
      }
    }
  }, [achievements]);

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

      {/* Badge Details Modal */}
      {selectedBadge && (
        <Modal
          visible={badgeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setBadgeModalVisible(false)}
        >
          <BlurView intensity={30} tint="dark" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
              width: 320,
              borderRadius: 20,
              padding: 28,
              alignItems: 'center',
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.08)',
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 8,
            }}>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 10, textAlign: 'center' }}>
                {selectedBadge.name}
              </Text>
              <Text style={{ fontSize: 15, color: '#D1D5DB', textAlign: 'center', marginBottom: 18, marginTop: 2 }}>
                {selectedBadge.description}
              </Text>
              {selectedBadge.unlockCriteria && (
                <Text style={{ fontSize: 14, color: '#A5B4FC', textAlign: 'center', marginBottom: 18 }}>
                  Unlock Criteria: {selectedBadge.unlockCriteria}
                </Text>
              )}
              <Text style={{ fontSize: 16, color: selectedBadge.unlocked ? '#34D399' : '#F87171', fontWeight: '600', marginBottom: 18 }}>
                {selectedBadge.unlocked ? 'Unlocked' : 'Locked'}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#23272F',
                  borderRadius: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                }}
                onPress={() => setBadgeModalVisible(false)}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Close</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Modal>
      )}
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
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  checkAchievementsButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
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
  testButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginHorizontal: 5,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  badgeStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeStatsText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  lockedBadgeItem: {
    opacity: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  unlockedBadgeItem: {
    opacity: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
  },
  unlockedBadgeTitle: {
    color: '#FFFFFF',
  },
  unlockedBadgeDescription: {
    color: 'rgba(255,255,255,0.7)',
  },
  badgeTipText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 10,
  },
});

// Helper function to extract number from string (e.g. "90 Day Champion" -> 90)
const extractNumberFromString = (str: string): number | null => {
  const matches = str.match(/\d+/);
  return matches && matches.length > 0 ? parseInt(matches[0], 10) : null;
};

// Create placeholder badges to fill empty slots
const createAdditionalBadges = (category: string, count: number): Achievement[] => {
  const placeholders = [];
    for (let i = 0; i < count; i++) {
    placeholders.push({
      id: `placeholder-${category}-${i}`,
      name: 'Locked',
      description: 'Keep using the app to unlock more badges!',
        category,
      unlocked: false,
      icon: 'lock',
      unlockCriteria: 'Continue using the app to unlock'
      });
    }
  return placeholders;
};