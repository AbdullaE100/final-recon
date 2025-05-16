import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Pressable, Platform } from 'react-native';
import { useGamification } from '@/context/GamificationContext';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import LottieView from 'lottie-react-native';

// Define types
interface BadgeItemProps {
  title: string;
  description: string;
  locked?: boolean;
  days?: number | null;
  onPress: () => void;
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
  onPress 
}) => {
  return (
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
            colors={['#6772FF', '#9265FF']}
            style={styles.unlockedBadge}
          >
            <MaterialCommunityIcons name="medal" size={32} color="#FFFFFF" />
          </LinearGradient>
        )}
      </View>
      <Text style={styles.badgeTitle}>
        {days ? `${days} Day Streak` : title}
      </Text>
      <Text style={styles.badgeDescription}>
        {days ? `Maintain a ${days}-day clean streak` : description}
      </Text>
    </Pressable>
  );
};

export default function AchievementsScreen() {
  const { streak, level, points, totalPoints, achievements, companion, getCompanionStage } = useGamification();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'badges' | 'companion'>('companion'); // Set initial tab to companion for testing
  
  // Calculate progress percentage
  const progressPercentage = (points / totalPoints) * 100;
  const pointsToNextLevel = totalPoints - points;
  
  // Count unlocked badges
  const unlockedBadgesCount = achievements ? achievements.filter(badge => badge.unlocked).length : 0;
  
  // TESTING: Force companion to be at stage 3 (tiger companion - Stripes)
  // In production, use: const companionStage = companion ? getCompanionStage() : (unlockedBadgesCount >= 10 ? 3 : unlockedBadgesCount >= 5 ? 2 : 1);
  const companionStage: number = 2; // Changed to stage 2 for testing tiger's middle evolution
  
  // Get companion animation source based on stage - using tiger animations
  const getCompanionSource = () => {
    switch (companionStage) {
      case 3:
        return require('../../baby tiger stage 3.json');
      case 2:
        return require('../../baby tiger stage 2.json');
      default:
        return require('../../baby tiger stage 1.json');
    }
  };
  
  const renderBadgesTab = () => (
    <>
        {/* Level and Progress Section */}
        <View style={styles.levelContainer}>
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
        </View>
        
        {/* Badges Section */}
        <View style={styles.badgesHeader}>
          <Text style={styles.sectionTitle}>Badges to Unlock ({6})</Text>
        </View>
        
        <View style={styles.badgesGrid}>
          <BadgeItem
            title="7 Day Streak"
            description="Maintain a 7-day clean streak"
            locked={streak < 7}
            days={7}
            onPress={() => {}}
          />
          <BadgeItem
            title="30 Day Streak"
            description="Maintain a 30-day clean streak"
            locked={streak < 30}
            days={30}
            onPress={() => {}}
          />
          <BadgeItem
            title="90 Day Streak"
            description="Maintain a 90-day clean streak"
            locked={streak < 90}
            days={90}
            onPress={() => {}}
          />
          <BadgeItem
            title="Journal Enthusiast"
            description="Write 5 journal entries"
            locked={true}
            onPress={() => {}}
          />
          <BadgeItem
            title="Journal Streak"
            description="Write journal entries for 3 consecutive days"
            locked={true}
            onPress={() => {}}
          />
          <BadgeItem
            title="Challenge Accepted"
            description="Complete 5 challenges"
            locked={true}
            onPress={() => {}}
          />
        </View>
    </>
  );
  
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
          <Text style={styles.companionName}>
            Stripes
          </Text>
          
          <Text style={styles.companionDescription}>
            {companionStage === 1
              ? "Half tiger, half therapist — growls when you're about to mess up."
              : companionStage === 2
                ? "Flowing like water around obstacles, Stripes teaches adaptability and patience, washing away impulsive urges."
                : "A powerful guardian of serenity and emotional control, Stripes has evolved along with your ability to channel desires into positive energy."}
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
                          ? '60%' // Hardcoded progress for stage 2 (showing 6/10 badges)
                          : `${(unlockedBadgesCount % 5) * 20}%` 
                    }
                  ]} 
                />
              </View>
            </View>
            <Text style={styles.badgeCount}>
              {companionStage === 3 
                ? 'Final evolution reached!'
                : companionStage === 2
                  ? '6/10 badges (4 more for final evolution)' // Hardcoded count for testing
                  : `${unlockedBadgesCount}/5 badges (${5 - unlockedBadgesCount} more for evolution)`}
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
    backgroundColor: '#000000',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: 'rgba(103, 114, 255, 0.6)',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  levelContainer: {
    marginVertical: 20,
  },
  levelBadgeContainer: {
    marginBottom: 10,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pointsContainer: {
    marginBottom: 10,
  },
  pointsText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarBackground: {
    flex: 1,
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  nextLevelText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
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
    marginBottom: 16,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeItem: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  badgeIconContainer: {
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  badgeDescription: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
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
  companionName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
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
});