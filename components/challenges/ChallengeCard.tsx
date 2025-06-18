import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Award, CircleCheck as CheckCircle, Play, CheckCircle2, XCircle } from 'lucide-react-native';
import { Challenge } from '@/types/gamification';
import { format, formatDistanceToNow } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export interface ChallengeProgressData {
  challengeId: string;
  note: string;
  timestamp: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
  isActive: boolean;
  isLoading?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  onLogProgress?: (data: ChallengeProgressData) => void;
}

export default function ChallengeCard({ 
  challenge, 
  isActive,
  isLoading,
  onStart,
  onComplete,
  onLogProgress
}: ChallengeCardProps) {
  const { colors } = useTheme();
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const progress = challenge.progress || 0;
  
  const getPromptOptions = () => {
    switch (challenge.title) {
      case 'Healthy Eating':
        return [
          'Balanced plate (lean protein, complex carbs, vegetables)',
          'Large salad with protein topper',
          'Homemade whole-grain breakfast',
          'Plant-based or vegetarian meal',
          'Low-carb, high-protein option',
          'Meal-prepped box from earlier in the week',
          'Other healthy recipe',
        ];
      case 'Digital Detox':
        return [
          'Kept total screen-time < 30 min',
          'Phone on Do Not Disturb / Focus mode',
          'No social media during meals',
          'Deleted or logged out of apps for the day',
          'Replaced scrolling with another activity (reading, walk, etc.)',
          'No social media at all today',
        ];
      case 'Sleep Hygiene':
        return [
          'In bed at target time',
          'Woke up within 30 min of goal time',
          'Put screens away 1 hour before bed',
          'Followed the same wind-down routine',
          'Slept 7 hours or more',
          'Kept the bedroom cool, dark, and quiet',
        ];
      case 'Social Connection':
        return [
          'Phone call with friend/family',
          'Video call or voice note',
          'In-person visit or coffee chat',
          'Supportive text conversation',
          'Sent a handwritten note / letter',
          'Helped someone with an errand or task',
        ];
      case 'Hydration Habit':
        return [
          'Drank 8 glasses (≈ 2 L) of plain water',
          '8 glasses including herbal tea or flavored water',
          'Carried and refilled a water bottle all day',
          'Tracked intake with an app and hit the goal',
          'Other method, met 8-glass target',
        ];
      case 'Stress Reduction':
        return [
          '5-minute deep-breathing exercise',
          'Progressive muscle relaxation',
          'Body-scan mindfulness',
          'Guided meditation session',
          'Journaling / expressive writing',
          'Short outdoor walk or stretch break',
          'Other stress-relief method',
        ];
      case 'Stay Clean Today':
        return [
          'Completed the full day without relapsing',
          'Attended a support meeting / group',
          'Used coping skills when urges arose',
          'Reached out to accountability partner',
          'Avoided known triggers successfully',
        ];
      case 'Morning Meditation':
        return [
          'Breathing or mindfulness of breath',
          'Loving-kindness / compassion practice',
          'Body awareness scan',
          'Guided session in an app',
          'Silent sitting meditation',
          'Other meditation style',
        ];
      case 'Evening Reflection':
        return [
          'Wrote a journal entry about the day',
          'Listed wins, challenges, and lessons',
          'Reviewed emotions and triggers',
          'Planned improvements for tomorrow',
          'Practiced self-compassion statements',
          'Other reflection method',
        ];
      case 'Reading Time':
        return [
          'Recovery-focused self-help book',
          'Memoir or biography on growth/recovery',
          'Motivational article or blog post',
          'Chapter from a psychology / mindset book',
          'Spiritual or philosophical text',
          'Other recovery-related reading',
        ];
      case 'Mindful Walking':
      return [
          'Neighborhood streets',
          'Park or green space',
          'Beach or waterside path',
          'Trail / nature reserve',
          'Urban area with full awareness practice',
          'Indoor track or treadmill, mindful focus',
      ];
      case 'Gratitude Practice':
        return [
          'Wrote them in a journal',
          'Entered them in a gratitude app',
          'Shared them aloud with someone',
          'Reflected on them mentally before bed',
          'Posted them on a personal board / sticky notes',
          'Other gratitude method',
        ];
      case 'Habit Replacement':
        return [
          'Exercise or stretching',
          'Creative hobby (art, music, writing)',
          'Reading or learning something new',
          'Calling a friend or support person',
          'Mindfulness / breathing practice',
          'Working on a personal project',
          'Other positive substitute',
        ];
      case 'Journal Streak':
        return [
          'Morning reflection',
          'Gratitude list',
          'Processing emotions',
          'Goal setting & intentions',
          'Brain-dump / stream of consciousness',
          'Creative writing / poetry',
          'Dream journal',
          'Other personal notes',
        ];
      case 'Weekly Exercise':
        return [
          'Cardio run / cycle',
          'Strength or weights session',
          'Yoga / Pilates / stretch',
          'HIIT or circuit workout',
          'Dance or aerobics',
          'Team sport or game',
          'Brisk walk or hike',
          'Other activity',
        ];
      default:
        return [
          'Maintained sobriety despite challenges', 
          'Recognized and avoided a potential trigger', 
          'Used recovery tools when feeling vulnerable',
          'Practiced self-compassion in difficult moment', 
          'Strengthened my commitment to recovery today'
        ];
    }
  };

  const handleLogProgress = () => {
    if (!selectedOption || !onLogProgress) return;
    
    const data: ChallengeProgressData = {
      challengeId: challenge.id,
      note: selectedOption,
      timestamp: new Date().toISOString()
    };
    
    onLogProgress(data);
    setSelectedOption('');
    setLogModalVisible(false);
  };

  const handleComplete = async () => {
    if (!onComplete || isCompleting) return;
    
    try {
      setError(null);
      setIsCompleting(true);
      await onComplete();
    } catch (err) {
      setError('Failed to complete challenge. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };
  
  const lastActivity = challenge.activities && challenge.activities.length > 0
    ? challenge.activities[challenge.activities.length - 1]
    : null;

  return (
    <LinearGradient
      colors={['#1F2937', '#111827']}
      style={styles.container}
    >
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: '#38BDF8' }]}>
          <Text style={styles.badgeText}>{challenge.isDaily ? 'Daily' : 'Weekly'}</Text>
        </View>
        <View style={styles.pointsContainer}>
          <Text style={[styles.pointsText, { color: '#FFFFFF' }]}>+{challenge.points} pts</Text>
        </View>
      </View>
      
      <Text style={[styles.title, { color: '#FFFFFF' }]}>{challenge.title}</Text>
      <Text style={[styles.description, { color: '#9CA3AF' }]}>{challenge.description}</Text>
      
      {challenge.rewards?.badgeId && (
        <View style={[styles.rewardSection, { backgroundColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 16 }]}>
          <Award size={18} color={'#F472B6'} /><Text style={[styles.rewardText, { color: '#FFFFFF' }]}>Earn "{challenge.rewards.badgeName}" badge</Text>
        </View>
      )}
      
      {isActive && (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressLabel, { color: '#9CA3AF' }]}>Progress:</Text>
            <Text style={[styles.progressValue, { color: '#FFFFFF' }]}>{progress}%</Text>
          </View>
          <View style={[styles.progressContainer, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: progress >= 100 ? colors.success : colors.primary }]} />
          </View>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[styles.logButton, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} 
              onPress={() => setLogModalVisible(true)}
              disabled={isCompleting}
            >
              <CheckCircle2 size={18} color={colors.primary} />
              <Text style={[styles.logButtonText, { color: '#FFFFFF' }]}>Log Progress</Text>
            </TouchableOpacity>
            
            {progress >= 100 && (
              <TouchableOpacity 
                style={[styles.completeButton, { backgroundColor: colors.success }]} 
                onPress={handleComplete}
                disabled={isCompleting}
              >
                <CheckCircle size={18} color="#fff" />
                <Text style={[styles.completeButtonText, { color: '#fff' }]}>
                  {isCompleting ? 'Completing...' : 'Complete Challenge'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
      
      {!isActive && (
        <TouchableOpacity 
          style={[styles.startButton, { backgroundColor: '#6366F1' }]} 
          onPress={onStart}
          disabled={isLoading}
        >
          <Play size={18} color="#fff" />
          <Text style={[styles.startButtonText, { color: '#FFFFFF' }]}>
            {isLoading ? 'Starting...' : 'Start Challenge'}
          </Text>
        </TouchableOpacity>
      )}
      
      {lastActivity && (
        <View style={styles.lastActivityContainer}>
          <Text style={[styles.lastActivityLabel, { color: '#9CA3AF' }]}>Last activity:</Text>
          <Text style={[styles.lastActivityText, { color: '#FFFFFF' }]}>
            {lastActivity.note} - {format(new Date(lastActivity.timestamp), 'MMM d, h:mm a')}
          </Text>
        </View>
      )}
      
      {error && (
        <Text style={[styles.errorText, { color: '#F87171' }]}>{error}</Text>
      )}
      
      <Modal
        visible={logModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <BlurView
            style={styles.modalContent}
            tint="dark"
            intensity={80}
          >
            <Text style={[styles.modalTitle, { color: '#FFFFFF' }]}>Log Progress</Text>
          <ScrollView style={styles.optionsContainer}>
            {getPromptOptions().map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                      { 
                        backgroundColor: selectedOption === option ? '#6366F140' : 'transparent',
                        borderColor: selectedOption === option ? '#6366F1' : 'rgba(255, 255, 255, 0.2)',
                      }
                  ]}
                  onPress={() => setSelectedOption(option)}
                >
                    <Text style={[styles.optionText, { color: '#FFFFFF' }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setLogModalVisible(false);
                  setSelectedOption('');
                }}
              >
                  <XCircle size={18} color="#FFFFFF" />
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Cancel</Text>
            </TouchableOpacity>
              <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: '#6366F1' }]}
                onPress={handleLogProgress}
                disabled={!selectedOption}
              >
                <CheckCircle size={18} color="#fff" />
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>Submit</Text>
            </TouchableOpacity>
            </View>
            </BlurView>
        </View>
      </Modal>
      </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 12 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  pointsContainer: { flexDirection: 'row', alignItems: 'center' },
  pointsText: { fontSize: 14, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  description: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  rewardSection: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8 },
  rewardText: { fontSize: 14, marginLeft: 8 },
  progressSection: { marginTop: 8 },
  progressInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressLabel: { fontSize: 14 },
  progressValue: { fontSize: 14 },
  progressContainer: { height: 8, borderRadius: 4, marginBottom: 16, overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  logButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, flex: 1, marginRight: 8 },
  logButtonText: { fontSize: 16, marginLeft: 8 },
  completeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 8, flex: 1 },
  completeButtonText: { fontSize: 16, color: '#fff' },
  startButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  startButtonText: { color: '#fff', fontSize: 16, marginLeft: 8 },
  lastActivityContainer: { marginTop: 16 },
  lastActivityLabel: { fontSize: 14, marginBottom: 4 },
  lastActivityText: { fontSize: 14 },
  errorText: { fontSize: 14, textAlign: 'center' },
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 20, 
    paddingBottom: 40, 
    overflow: 'hidden' 
  },
  modalTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  optionsContainer: { maxHeight: 250 },
  optionButton: { 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 8, 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  optionText: { fontSize: 16, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center', marginRight: 8 },
  submitButton: { flex: 2, padding: 16, borderRadius: 12, alignItems: 'center' },
  modalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
});