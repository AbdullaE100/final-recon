import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, FlatList, Image } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { ArrowLeft, MessageSquare, Heart, TrendingUp, Sparkles, Smile, Flame, Shield, TrendingDown, BookOpen, Award, Users, CheckCircle, Clock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
// import { WeeklyDigestData } from '@/utils/journalInsights'; // Removed

const { width, height } = Dimensions.get('window');

// Hardcoded community sentiment quotes
const COMMUNITY_SENTIMENTS = [
  {
    id: '1',
    quote: "This week, the community truly rallied, sharing incredible stories of resilience. It\'s inspiring to see so much positive growth!",
    author: 'A Member',
    icon: <Heart size={20} color='#EC4899' />,
    gradientColors: ['#471AFF', '#7000FF'] as const,
  },
  {
    id: '2',
    quote: "Many found strength in collective wisdom. \'Sharing my struggles here made all the difference,\' one user wrote.",
    author: 'Community Insights',
    icon: <MessageSquare size={20} color='#6366F1' />,
    gradientColors: ['#FF3CAC', '#784BA0'] as const,
  },
  {
    id: '3',
    quote: "The focus on mindfulness and daily check-ins has really boosted spirits this week. Keep up the amazing work everyone!",
    author: 'Daily Digest',
    icon: <TrendingUp size={20} color='#10B981' />,
    gradientColors: ['#0061FF', '#60EFFF'] as const,
  },
  {
    id: '4',
    quote: "A recurring theme: \'Small steps lead to big changes.\' It\'s a powerful reminder to celebrate every win, no matter how small.",
    author: 'User Feedback',
    icon: <Sparkles size={20} color='#F59E0B' />,
    gradientColors: ['#FF8B8B', '#FF5858'] as const,
  },
  {
    id: '5',
    quote: "The support threads were buzzing with encouragement. \'Feeling less alone because of this community,\' shared another member.",
    author: 'Community Echoes',
    icon: <Smile size={20} color='#3B82F6' />,
    gradientColors: ['#00DBDE', '#FC00FF'] as const,
  },
];

// Dummy data for streak statistics
const STREAK_STATS = [
  {
    id: '1',
    title: 'Daily Streaks',
    keptToday: 12500,
    totalUsers: 15000,
    percentChange: 12,
    icon: <Flame size={30} color="white" />,
    gradientColors: ['#0F2027', '#203A43', '#2C5364'] as const,
    iconGradientColors: ['#FF416C', '#FF4B2B'] as const,
  },
  {
    id: '2',
    title: 'Journal Entries',
    keptToday: 28750,
    totalUsers: 35000,
    percentChange: 8,
    icon: <BookOpen size={30} color="white" />,
    gradientColors: ['#134E5E', '#1F6E8C', '#2E8B9A'] as const,
    iconGradientColors: ['#4776E6', '#8E54E9'] as const,
  },
  {
    id: '3',
    title: 'Community Support',
    keptToday: 5320,
    totalUsers: 8400,
    percentChange: 24,
    icon: <MessageSquare size={30} color="white" />,
    gradientColors: ['#1A2980', '#26D0CE'] as const, 
    iconGradientColors: ['#00C9FF', '#92FE9D'] as const,
  },
  {
    id: '4',
    title: 'Focus Minutes',
    keptToday: 9650000,
    totalUsers: 12000000,
    percentChange: 15,
    icon: <Clock size={30} color="white" />,
    gradientColors: ['#3E1F47', '#5E2750', '#7E3159'] as const,
    iconGradientColors: ['#FF9966', '#FF5E62'] as const,
    formatter: (num: number) => `${(num / 1000000).toFixed(1)}M`,
  },
];

// Dummy data for achievements
const ACHIEVEMENTS = [
  {
    id: '1',
    title: 'Consistency Kings',
    count: 2450,
    description: 'Users with 30+ day streaks',
    icon: <Award size={24} color='#FFD700' />,
    gradientColors: ['#8E2DE2', '#4A00E0'] as const,
  },
  {
    id: '2',
    title: 'Rising Stars', 
    count: 5280,
    description: 'New users who journaled daily',
    icon: <TrendingUp size={24} color='#4ADE80' />,
    gradientColors: ['#00C9FF', '#92FE9D'] as const,
  },
  {
    id: '3',
    title: 'Community Pillars',
    count: 1860,
    description: 'Users helping others stay on track',
    icon: <Users size={24} color='#60A5FA' />,
    gradientColors: ['#3F2B96', '#A8C0FF'] as const,
  },
];

// Dummy data for reality insights
const REALITY_INSIGHTS = [
  {
    id: '1',
    title: "It\'s Okay to Struggle",
    description: "Growth isn\'t linear. Many users faced challenges this week and emerged stronger by acknowledging them. Your journey is valid.",
    icon: <TrendingDown size={20} color='white' />,
    gradientColors: ['#3A1C71', '#D76D77'] as const,
  },
  {
    id: '2',
    title: "Resilience in Action",
    description: "A significant portion of our community demonstrated incredible resilience, picking themselves up after setbacks. You are not alone in your fight.",
    icon: <Shield size={20} color='white' />,
    gradientColors: ['#5F72BD', '#9B23EA'] as const,
  },
  {
    id: '3',
    title: "Learning from Relapses",
    description: "Relapses are part of the process. This week, insights show that users who journaled about their struggles were more likely to recover faster.",
    icon: <BookOpen size={20} color='white' />,
    gradientColors: ['#6D6027', '#D3CBB8'] as const,
  },
];

interface WeeklyDigestProps {
  onBack: () => void;
  // digestData: WeeklyDigestData; // Removed
}

const WeeklyDigest: React.FC<WeeklyDigestProps> = ({ onBack }) => {
  const { colors } = useTheme();

  const renderSentimentCard = ({ item, index }: { item: typeof COMMUNITY_SENTIMENTS[0]; index: number }) => (
    <Animated.View 
      entering={FadeInRight.delay(index * 100).springify()}
      style={styles.sentimentCardContainer}
    >
      <LinearGradient
        colors={item.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.sentimentCard}
      >
        <BlurView intensity={20} tint="dark" style={styles.sentimentBlurBackground}>
          <View style={styles.sentimentHeader}>
            {item.icon}
            <Text style={styles.sentimentAuthor}>{item.author}</Text>
          </View>
          <Text style={styles.sentimentQuote}>{item.quote}</Text>
        </BlurView>
      </LinearGradient>
    </Animated.View>
  );

  const renderStreakStatsCard = ({ item, index }: { item: typeof STREAK_STATS[0]; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(300 + index * 50).springify()}
      style={styles.streakStatsCardContainer}
    >
      <LinearGradient
        colors={item.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakStatsCard}
      >
        <View style={styles.streakStatsContent}>
          <View style={styles.streakStatsTextContainer}>
            <Text style={styles.streakStatsTitle}>{item.title}</Text>
            <View style={styles.streakStatsValueContainer}>
              <Text style={styles.streakStatsValue}>
                <Text style={styles.streakStatsHighlight}>
                  {item.formatter ? item.formatter(item.keptToday) : item.keptToday.toLocaleString()}
                </Text>
                <Text> of </Text>
                {item.formatter ? item.formatter(item.totalUsers) : item.totalUsers.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.streakStatsSubtitle}>users kept their streak today</Text>
            <View style={styles.streakStatsBadge}>
              <TrendingUp size={16} color="#4ADE80" />
              <Text style={styles.streakStatsBadgeText}>+{item.percentChange}% from last week</Text>
            </View>
          </View>
          <View style={styles.streakStatsIconContainer}>
            <LinearGradient
              colors={item.iconGradientColors}
              style={styles.streakStatsIconBackground}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {item.icon}
            </LinearGradient>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderAchievementCard = ({ item, index }: { item: typeof ACHIEVEMENTS[0]; index: number }) => (
    <Animated.View 
      entering={FadeInDown.delay(400 + index * 100).springify()}
      style={styles.achievementCardContainer}
    >
      <LinearGradient
        colors={item.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.achievementCard}
      >
        <View style={styles.achievementIconContainer}>
          <View style={styles.achievementIconBackground}>
            {item.icon}
          </View>
        </View>
        <View style={styles.achievementContent}>
          <Text style={styles.achievementTitle}>{item.title}</Text>
          <Text style={styles.achievementCount}>{item.count.toLocaleString()}</Text>
          <Text style={styles.achievementDescription}>{item.description}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderRealityInsightCard = ({ item, index }: { item: typeof REALITY_INSIGHTS[0]; index: number }) => (
    <Animated.View 
      entering={FadeInRight.delay(600 + index * 100).springify()}
      style={styles.insightCardContainer}
    >
      <LinearGradient
        colors={item.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.realityInsightCard}
      >
        <View style={styles.realityInsightHeader}>
          <View style={styles.realityInsightIconContainer}>
            {item.icon}
          </View>
          <Text style={styles.realityInsightTitle}>{item.title}</Text>
        </View>
        <Text style={styles.realityInsightDescription}>{item.description}</Text>
      </LinearGradient>
    </Animated.View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <LinearGradient
        colors={['#121212', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Community Pulse</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <Text style={styles.sectionTitle}>Weekly Highlights</Text>
          <Text style={styles.sectionSubtitle}>Discover what is resonating in the community</Text>
        </Animated.View>

        <FlatList
          data={COMMUNITY_SENTIMENTS}
          renderItem={renderSentimentCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width * 0.85 + 15}
          decelerationRate="fast"
          contentContainerStyle={styles.sentimentList}
        />

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Community Stats</Text>
          <Text style={styles.sectionSubtitle}>Track progress across our community</Text>
        </Animated.View>

        <FlatList
          data={STREAK_STATS}
          renderItem={renderStreakStatsCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width * 0.85 + 15}
          decelerationRate="fast"
          contentContainerStyle={styles.streakStatsList}
        />

        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Community Achievements</Text>
          <Text style={styles.sectionSubtitle}>Celebrating our collective victories</Text>
        </Animated.View>

        {ACHIEVEMENTS.map((item, index) => (
          <View key={item.id}>
            {renderAchievementCard({ item, index })}
          </View>
        ))}
      
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Reality Insights</Text>
          <Text style={styles.sectionSubtitle}>Embracing the full spectrum of recovery</Text>
        </Animated.View>

        <FlatList
          data={REALITY_INSIGHTS}
          renderItem={renderRealityInsightCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width * 0.85 + 15}
          decelerationRate="fast"
          contentContainerStyle={styles.insightList}
        />

        <Animated.Text 
          entering={FadeInDown.delay(700).springify()}
          style={styles.footerText}
        >
          You are part of a powerful movement. Keep going!
        </Animated.Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  backButton: {
    padding: 10,
    marginRight: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    paddingHorizontal: 20,
    marginBottom: 20,
    marginTop: 4,
  },
  sentimentList: {
    paddingLeft: 20,
    paddingRight: 5,
  },
  sentimentCardContainer: {
    marginRight: 15,
    marginVertical: 10,
    width: width * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sentimentCard: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
  },
  sentimentBlurBackground: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  sentimentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sentimentAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  sentimentQuote: {
    fontSize: 18,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  streakStatsList: {
    paddingLeft: 20,
    paddingRight: 5,
  },
  streakStatsCardContainer: {
    marginRight: 15,
    marginVertical: 10,
    width: width * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  streakStatsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
  },
  streakStatsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  streakStatsTextContainer: {
    flex: 1,
  },
  streakStatsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
  },
  streakStatsValueContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  streakStatsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  streakStatsHighlight: {
    color: '#F9C851',
    fontWeight: '900',
  },
  streakStatsSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  streakStatsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  streakStatsBadgeText: {
    color: '#4ADE80',
    marginLeft: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  streakStatsIconContainer: {
    justifyContent: 'center',
  },
  streakStatsIconBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementCardContainer: {
    marginHorizontal: 20,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  achievementCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementIconContainer: {
    marginRight: 15,
  },
  achievementIconBackground: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  achievementCount: {
    fontSize: 24,
    fontWeight: '800',
    color: 'white',
    marginVertical: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  insightList: {
    paddingLeft: 20,
    paddingRight: 5,
    paddingBottom: 10,
  },
  insightCardContainer: {
    marginRight: 15,
    marginVertical: 10,
    width: width * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  realityInsightCard: {
    borderRadius: 16,
    padding: 20,
    height: 180,
  },
  realityInsightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  realityInsightIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 10,
  },
  realityInsightTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  realityInsightDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  // Removed old styles
  // dateRange: {},
  // card: {},
  // cardHeader: {},
  // cardTitle: {},
  // cardContent: {},
  // themesContainer: {},
  // themeChip: {},
  // themeText: {},
  // chartPlaceholder: {},
  // chartText: {},
});

export default WeeklyDigest; 