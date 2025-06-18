import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, 
  TextInput, SafeAreaView, ScrollView, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { Challenge } from '@/types/gamification';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import ChallengeCard, { ChallengeProgressData } from '@/components/challenges/ChallengeCard';
import { BarChart2, TrendingUp, Award, Activity, Clock, BookOpen, History } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { format } from 'date-fns';

export default function ChallengesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const { 
    activeChallenges, 
    availableChallenges, 
    startChallenge, 
    completeChallenge,
    logChallengeProgress,
    points,
    level,
    streak,
    activityStats,
    logMeditation,
    logWorkout,
    logReading,
    forceResetAllChallenges,
    completedChallenges,
  } = useGamification();
  
  const [activeTab, setActiveTab] = useState('available');
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [meditationModalVisible, setMeditationModalVisible] = useState(false);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [readingModalVisible, setReadingModalVisible] = useState(false);
  
  // State for form inputs
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [meditationDuration, setMeditationDuration] = useState('');
  const [readingDuration, setReadingDuration] = useState('');
  const [selectedWorkoutType, setSelectedWorkoutType] = useState('');
  const [selectedMeditationType, setSelectedMeditationType] = useState('');
  const [readingBook, setReadingBook] = useState('');

  // Loading states
  const [isSubmittingWorkout, setIsSubmittingWorkout] = useState(false);
  const [isSubmittingMeditation, setIsSubmittingMeditation] = useState(false);
  const [isSubmittingReading, setIsSubmittingReading] = useState(false);

  const startInitialChallenges = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (availableChallenges.length > 0) {
        await startChallenge(availableChallenges[0].id);
      }
    } catch (err) {
      setError('Failed to start challenges. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLogMeditation = async () => {
    if (meditationDuration && selectedMeditationType) {
      try {
        setIsSubmittingMeditation(true);
        setError(null);
        await logMeditation(parseInt(meditationDuration, 10), selectedMeditationType);
        setMeditationModalVisible(false);
        setMeditationDuration('');
        setSelectedMeditationType('');
      } catch (err) {
        setError('Failed to log meditation. Please try again.');
      } finally {
        setIsSubmittingMeditation(false);
      }
    }
  };

  const handleLogWorkout = async () => {
    if (workoutDuration && selectedWorkoutType) {
    try {
      setIsSubmittingWorkout(true);
        setError(null);
        await logWorkout(parseInt(workoutDuration, 10), selectedWorkoutType);
        setWorkoutModalVisible(false);
        setWorkoutDuration('');
        setSelectedWorkoutType('');
      } catch (err) {
        setError('Failed to log workout. Please try again.');
    } finally {
      setIsSubmittingWorkout(false);
    }
    }
  };
  
  const handleLogReading = async () => {
    if (readingDuration && readingBook) {
      try {
        setIsSubmittingReading(true);
        setError(null);
        await logReading(parseInt(readingDuration, 10), readingBook);
        setReadingModalVisible(false);
        setReadingDuration('');
        setReadingBook('');
      } catch (err) {
        setError('Failed to log reading. Please try again.');
    } finally {
        setIsSubmittingReading(false);
      }
    }
  };

  const handleResetAllChallenges = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await forceResetAllChallenges();
    } catch (err) {
      setError('Failed to reset challenges. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderActiveChallenge = ({ item }: { item: Challenge }) => (
    <ChallengeCard
      challenge={item}
      isActive={true}
      onComplete={() => completeChallenge(item.id)}
      onLogProgress={(data: ChallengeProgressData) => logChallengeProgress(item.id, data.note)}
      isLoading={isLoading}
    />
  );
  
  const renderAvailableChallenge = ({ item }: { item: Challenge }) => (
    <ChallengeCard 
      challenge={item} 
      isActive={false}
      onStart={() => startChallenge(item.id)}
      isLoading={isLoading}
    />
  );

  const renderInsights = () => {
    const allChallenges = [...activeChallenges, ...completedChallenges];
    const allActivities = allChallenges
      .flatMap(challenge => 
        (challenge.activities || []).map(activity => ({
          ...activity,
          challengeTitle: challenge.title,
          challengeId: challenge.id,
        }))
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
      <ScrollView 
        style={styles.insightsContainer}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Cards from screenshot */}
        <View style={styles.insightCard}>
          <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
          <View style={styles.insightHeader}>
            <TrendingUp size={24} color="#6366F1" />
            <Text style={styles.insightTitle}>Progress Overview</Text>
          </View>
        <View style={styles.statsGrid}>
            <View style={styles.statBlock}><Text style={styles.statValue}>{activeChallenges.length}</Text><Text style={styles.statLabel}>Active Challenges</Text></View>
            <View style={styles.statBlock}><Text style={styles.statValue}>{availableChallenges.length}</Text><Text style={styles.statLabel}>Available</Text></View>
            <View style={styles.statBlock}><Text style={styles.statValue}>{points}</Text><Text style={styles.statLabel}>Total Points</Text></View>
                  </View>
                </View>
                
        <View style={styles.insightCard}>
          <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}/>
          <View style={styles.insightHeader}>
            <Award size={24} color="#EC4899" />
            <Text style={styles.insightTitle}>Achievements</Text>
                  </View>
          <View style={styles.statsGrid}>
            <View style={styles.statBlock}><Text style={styles.statValue}>{level}</Text><Text style={styles.statLabel}>Current Level</Text></View>
            <View style={styles.statBlock}><Text style={styles.statValue}>{streak}</Text><Text style={styles.statLabel}>Day Streak</Text></View>
                    </View>
                  </View>
        
        {/* Activity Cards */}
        <TouchableOpacity style={styles.activityCard} onPress={() => setMeditationModalVisible(true)}>
          <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            <View style={styles.activityIconContainer}><FontAwesome5 name="brain" size={22} color="#7B68EE" /></View>
            <View style={styles.activityTextContainer}><Text style={styles.activityTitle}>Meditation</Text><Text style={styles.activitySubtitle}>Start your journey</Text></View>
            <View style={styles.activityStatContainer}><Text style={styles.activityStatValue}>{activityStats.totalMeditationMinutes || 0}</Text><Text style={styles.activityStatLabel}>min</Text></View>
            <View style={styles.streakBadge}><Text style={styles.streakText}>{(activityStats.meditationStreak || 0)} day streak</Text></View>
          </BlurView>
          </TouchableOpacity>

        <TouchableOpacity style={styles.activityCard} onPress={() => setWorkoutModalVisible(true)}>
          <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            <View style={styles.activityIconContainer}><Activity size={22} color="#FF6B6B" /></View>
            <View style={styles.activityTextContainer}><Text style={styles.activityTitle}>Workouts</Text><Text style={styles.activitySubtitle}>Start your journey</Text></View>
            <View style={styles.activityStatContainer}><Text style={styles.activityStatValue}>{activityStats.totalWorkoutMinutes || 0}</Text><Text style={styles.activityStatLabel}>min</Text></View>
            <View style={styles.streakBadge}><Text style={styles.streakText}>{(activityStats.workoutStreak || 0)} day streak</Text></View>
          </BlurView>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.activityCard} onPress={() => setReadingModalVisible(true)}>
          <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
            <View style={styles.activityIconContainer}><BookOpen size={22} color="#4CAF50" /></View>
            <View style={styles.activityTextContainer}><Text style={styles.activityTitle}>Reading</Text><Text style={styles.activitySubtitle}>Start your journey</Text></View>
            <View style={styles.activityStatContainer}><Text style={styles.activityStatValue}>{activityStats.totalReadingMinutes || 0}</Text><Text style={styles.activityStatLabel}>min</Text></View>
            <View style={styles.streakBadge}><Text style={styles.streakText}>{(activityStats.readingStreak || 0)} day streak</Text></View>
          </BlurView>
          </TouchableOpacity>

        {/* History Toggle Button */}
          <TouchableOpacity 
          style={styles.mainHistoryButton} 
          onPress={() => setShowFullHistory(!showFullHistory)}
            >
          <History size={20} color="#FFFFFF" />
          <Text style={styles.mainHistoryButtonText}>
            {showFullHistory ? 'Show Recent Activity' : 'Show Full History'}
                    </Text>
          </TouchableOpacity>

        {/* Recent Activity / History Section */}
        <View style={styles.recentActivityContainer}>
          <View style={styles.insightHeaderWithButton}>
            <View style={styles.insightHeader}>
              <Clock size={24} color="#34D399" />
              <Text style={styles.insightTitle}>
                {showFullHistory ? 'History' : 'Recent Activity'}
                        </Text>
                      </View>
                      </View>
          
          {allActivities.length > 0 ? (
            allActivities.slice(0, showFullHistory ? undefined : 5).map((activity, index) => (
              <View key={index} style={styles.activityHistoryItem}>
                <View style={styles.activityHistoryContent}>
                  <Text style={styles.activityHistoryNote}>{activity.note}</Text>
                  <Text style={styles.activityHistoryChallenge}>{activity.challengeTitle}</Text>
                    </View>
                <Text style={styles.activityHistoryTimestamp}>
                  {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                          </Text>
                  </View>
                ))
          ) : (
            <Text style={styles.noActivityText}>No recent activity to show.</Text>
              )}
            </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#121212', '#000000']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.header}><Text style={styles.headerTitle}>Challenges</Text></View>
      
      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
      </View>
      )}
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]} 
          onPress={() => setActiveTab('active')}
        >
          <FontAwesome5 name="fist-raised" size={20} color={activeTab === 'active' ? '#FFFFFF' : '#AAAAAA'} />
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'available' && styles.activeTab]} 
          onPress={() => setActiveTab('available')}
        >
          <Award size={20} color={activeTab === 'available' ? '#FFFFFF' : '#AAAAAA'} />
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>Available</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'insights' && styles.activeTab]} onPress={() => setActiveTab('insights')}>
          <TrendingUp size={20} color={activeTab === 'insights' ? '#FFFFFF' : '#AAAAAA'} />
          <Text style={[styles.tabText, activeTab === 'insights' && styles.activeTabText]}>Insights</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : activeTab === 'insights' ? (
        renderInsights()
      ) : activeTab === 'active' && activeChallenges.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>You don't have any active challenges yet.</Text>
        <TouchableOpacity 
            style={[styles.startChallengesButton, isLoading && styles.disabledButton]} 
            onPress={startInitialChallenges}
            disabled={isLoading}
          >
            <Text style={styles.startChallengesButtonText}>
              {isLoading ? 'Starting...' : 'Start Initial Challenges'}
          </Text>
        </TouchableOpacity>
      </View>
      ) : (
          <FlatList
          data={activeTab === 'active' ? activeChallenges : availableChallenges}
          renderItem={activeTab === 'active' ? renderActiveChallenge : renderAvailableChallenge}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                No available challenges.
              </Text>
              <Text style={styles.emptyStateSubText}>
                Great work on completing your challenges! We're preparing new ones for you. Please check back later.
          </Text>
      </View>
          }
          />
      )}
      
      {/* Modals */}
      <Modal animationType="slide" transparent={true} visible={meditationModalVisible} onRequestClose={() => setMeditationModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Meditation</Text>
            
            <Text style={styles.modalLabel}>Duration (minutes)</Text>
            <View style={styles.quickOptionsRow}>
              {[5, 10, 15, 20, 30].map(mins => (
                <TouchableOpacity 
                  key={mins} 
                  style={[styles.quickOption, meditationDuration === mins.toString() && styles.selectedQuickOption]} 
                  onPress={() => setMeditationDuration(mins.toString())}
                >
                  <Text style={[styles.quickOptionText, meditationDuration === mins.toString() && styles.selectedQuickOptionText]}>{mins}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.quickOption, styles.customOption]} 
                onPress={() => {/* Focus on input */}}
              >
                <Text style={styles.quickOptionText}>Custom</Text>
              </TouchableOpacity>
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="Or enter custom duration" 
              placeholderTextColor="rgba(255,255,255,0.5)" 
              keyboardType="number-pad" 
              value={meditationDuration} 
              onChangeText={setMeditationDuration}
            />
            
            <Text style={styles.modalLabel}>Meditation Type</Text>
            <View style={styles.optionsContainer}>
              {[
                'Mindfulness', 
                'Guided', 
                'Breathing', 
                'Body Scan',
                'Loving-Kindness',
                'Visualization',
                'Mantra',
                'Zen'
              ].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionButton, selectedMeditationType === type && styles.selectedOption]} 
                  onPress={() => setSelectedMeditationType(type)}
                >
                  <Text style={[styles.optionText, selectedMeditationType === type && styles.selectedOptionText]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton} 
                onPress={() => setMeditationModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  (!meditationDuration || !selectedMeditationType) && styles.disabledButton
                ]}
                onPress={handleLogMeditation} 
                disabled={!meditationDuration || !selectedMeditationType || isSubmittingMeditation}
              >
                {isSubmittingMeditation ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Log Session</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={workoutModalVisible} onRequestClose={() => setWorkoutModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Workout</Text>
            
            <Text style={styles.modalLabel}>Duration (minutes)</Text>
            <View style={styles.quickOptionsRow}>
              {[15, 30, 45, 60, 90].map(mins => (
                <TouchableOpacity 
                  key={mins} 
                  style={[styles.quickOption, workoutDuration === mins.toString() && styles.selectedQuickOption]} 
                  onPress={() => setWorkoutDuration(mins.toString())}
                >
                  <Text style={[styles.quickOptionText, workoutDuration === mins.toString() && styles.selectedQuickOptionText]}>{mins}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.quickOption, styles.customOption]} 
                onPress={() => {/* Focus on input */}}
              >
                <Text style={styles.quickOptionText}>Custom</Text>
              </TouchableOpacity>
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="Or enter custom duration" 
              placeholderTextColor="rgba(255,255,255,0.5)" 
              keyboardType="number-pad" 
              value={workoutDuration} 
              onChangeText={setWorkoutDuration}
            />
            
            <Text style={styles.modalLabel}>Workout Type</Text>
            <View style={styles.optionsContainer}>
              {[
                'Cardio', 
                'Strength', 
                'HIIT', 
                'Yoga',
                'Pilates',
                'Cycling',
                'Running',
                'Walking',
                'Swimming',
                'Sports',
                'Calisthenics',
                'Other'
              ].map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.optionButton, selectedWorkoutType === type && styles.selectedOption]} 
                  onPress={() => setSelectedWorkoutType(type)}
                >
                  <Text style={[styles.optionText, selectedWorkoutType === type && styles.selectedOptionText]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Intensity</Text>
            <View style={styles.intensityContainer}>
              <View style={styles.intensityScale}>
                <View style={styles.intensityLevel}><Text style={styles.intensityText}>Light</Text></View>
                <View style={styles.intensityLevel}><Text style={styles.intensityText}>Moderate</Text></View>
                <View style={styles.intensityLevel}><Text style={styles.intensityText}>Intense</Text></View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton} 
                onPress={() => setWorkoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  (!workoutDuration || !selectedWorkoutType) && styles.disabledButton
                ]}
                onPress={handleLogWorkout} 
                disabled={!workoutDuration || !selectedWorkoutType || isSubmittingWorkout}
              >
                {isSubmittingWorkout ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Log Workout</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" transparent={true} visible={readingModalVisible} onRequestClose={() => setReadingModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Reading</Text>

            <Text style={styles.modalLabel}>Duration (minutes)</Text>
            <View style={styles.quickOptionsRow}>
              {[10, 15, 30, 45, 60].map(mins => (
                <TouchableOpacity
                  key={mins} 
                  style={[styles.quickOption, readingDuration === mins.toString() && styles.selectedQuickOption]} 
                  onPress={() => setReadingDuration(mins.toString())}
                >
                  <Text style={[styles.quickOptionText, readingDuration === mins.toString() && styles.selectedQuickOptionText]}>{mins}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity 
                style={[styles.quickOption, styles.customOption]} 
                onPress={() => {/* Focus on input */}}
              >
                <Text style={styles.quickOptionText}>Custom</Text>
              </TouchableOpacity>
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="Or enter custom duration" 
              placeholderTextColor="rgba(255,255,255,0.5)" 
              keyboardType="number-pad" 
              value={readingDuration} 
              onChangeText={setReadingDuration}
            />
            
            <Text style={styles.modalLabel}>Book Title</Text>
                <TextInput
              style={styles.input} 
              placeholder="What are you reading?" 
              placeholderTextColor="rgba(255,255,255,0.5)" 
              value={readingBook} 
              onChangeText={setReadingBook}
            />
            
            <Text style={styles.modalLabel}>Category</Text>
            <View style={styles.optionsContainer}>
              {[
                'Self-Help',
                'Psychology',
                'Recovery',
                'Mindfulness',
                'Biography',
                'Fiction',
                'Science',
                'Philosophy',
                'Spirituality',
                'Other'
              ].map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.optionButton, styles.categoryOption]} 
                  onPress={() => {}}
                >
                  <Text style={styles.optionText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton} 
                onPress={() => setReadingModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton, 
                  (!readingDuration || !readingBook) && styles.disabledButton
                ]}
                onPress={handleLogReading} 
                disabled={!readingDuration || !readingBook || isSubmittingReading}
              >
                {isSubmittingReading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Log Reading</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 34, fontWeight: '800', marginBottom: 8, color: '#FFFFFF' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 20, marginTop: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, marginRight: 8 },
  activeTab: { backgroundColor: '#6366F1' },
  tabText: { marginLeft: 8, fontSize: 14, color: '#AAAAAA', fontWeight: '600' },
  activeTabText: { color: '#FFFFFF' },
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyStateText: { fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#AAAAAA' },
  emptyStateSubText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#A1A1AA',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  startChallengesButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366F1' },
  startChallengesButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  insightsContainer: { flex: 1, paddingHorizontal: 0 },
  insightCard: { borderRadius: 16, padding: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  insightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  insightTitle: { fontSize: 20, fontWeight: '700', marginLeft: 12, color: '#FFFFFF' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statBlock: { alignItems: 'center' },
  statValue: { fontSize: 32, fontWeight: '700', marginBottom: 4, color: '#FFFFFF' },
  statLabel: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' },
  activityCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  blurContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  activityIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  activityTextContainer: { flex: 1, marginLeft: 12 },
  activityTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  activitySubtitle: { fontSize: 14, color: 'rgba(255, 255, 255, 0.6)' },
  activityStatContainer: { alignItems: 'center', marginRight: 12 },
  activityStatValue: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  activityStatLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' },
  streakBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12 },
  streakText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.8)', fontWeight: '500' },
  recentActivityContainer: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  activityHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  activityHistoryContent: {
    flex: 1,
  },
  activityHistoryNote: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  activityHistoryChallenge: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  activityHistoryTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginLeft: 8,
    textAlign: 'right'
  },
  noActivityText: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14
  },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, backgroundColor: '#1F2937' },
  modalTitle: { fontSize: 24, fontWeight: '700', marginBottom: 20, textAlign: 'center', color: '#FFFFFF' },
  modalLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#FFFFFF' },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 20, fontSize: 16, borderColor: 'rgba(255,255,255,0.2)', color: '#FFFFFF', backgroundColor: 'rgba(255,255,255,0.1)' },
  optionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  optionButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  selectedOption: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  optionText: { color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  selectedOptionText: { color: '#FFFFFF' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginRight: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  cancelButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 2, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366F1' },
  disabledButton: { backgroundColor: 'rgba(99, 102, 241, 0.5)' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  insightHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  mainHistoryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
      },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  quickOptionsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  quickOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  selectedQuickOption: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  quickOptionText: { color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  selectedQuickOptionText: { color: '#FFFFFF' },
  customOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  intensityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  intensityScale: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intensityLevel: {
    width: 30,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  categoryOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
});