import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Award, CircleCheck, Play, Clock, CheckCircle2, XCircle } from 'lucide-react-native';
import { Challenge } from '@/types/gamification';
import { format } from 'date-fns';

interface ChallengeProgressData {
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

const ChallengeCard = ({
  challenge,
  isActive,
  isLoading = false,
  onStart,
  onComplete,
  onLogProgress
}: ChallengeCardProps) => {
  const { colors } = useTheme();
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate progress percentage
  const progress = challenge.progress || 0;
  
  // Get pre-prompted options based on challenge type and title
  const getPromptOptions = () => {
    // First check specific challenge titles for the most personalized options
    switch (challenge.title) {
      case 'Stay Clean Today':
        return [
          'Resisted an urge successfully',
          'Focused on productive activities',
          'Practiced mindfulness when triggered',
          'Reached out to my support network',
          'Used healthy coping mechanisms',
          'Other'
        ];
      
      case 'Morning Meditation':
        return [
          'Completed 5-minute mindfulness session',
          'Practiced deep breathing exercises',
          'Did body scan meditation',
          'Focused on positive intentions',
          'Practiced gratitude meditation',
          'Other'
        ];
      
      case 'Journal Streak':
        return [
          'Reflected on my recovery journey',
          'Wrote about my feelings and triggers',
          'Documented my daily achievements',
          'Set goals and intentions',
          'Expressed gratitude in writing',
          'Other'
        ];
      
      case 'Habit Replacement':
        return [
          'Exercised instead of acting on urges',
          'Practiced meditation when triggered',
          'Called a friend for support',
          'Went for a walk to clear my mind',
          'Engaged in a creative activity',
          'Other'
        ];
      
      case 'Weekly Exercise':
        return [
          'Completed a cardio workout',
          'Did strength training exercises',
          'Went for a run/jog',
          'Practiced yoga/stretching',
          'Participated in sports activity',
          'Other'
        ];
    }

    // Fallback to type-based options if no specific title match
    switch (challenge.type) {
      case 'meditation':
        return [
          'Completed guided meditation',
          'Did mindfulness exercises',
          'Practiced breathing techniques',
          'Focused on mental clarity',
          'Found inner peace and calm',
          'Other'
        ];
      
      case 'workout':
        return [
          'Completed full workout session',
          'Achieved my exercise goals',
          'Pushed through challenges',
          'Felt energized afterward',
          'Improved my fitness level',
          'Other'
        ];
      
      case 'habit':
        return [
          'Made positive choices today',
          'Stayed committed to my goals',
          'Overcame difficult moments',
          'Built healthy habits',
          'Proud of my progress',
          'Other'
        ];
      
      case 'journal_streak':
        return [
          'Wrote meaningful reflections',
          'Processed my emotions',
          'Tracked my progress',
          'Set new personal goals',
          'Gained self-awareness',
          'Other'
        ];
      
      case 'habit_replacement':
        return [
          'Chose healthy alternatives',
          'Identified and avoided triggers',
          'Used positive coping strategies',
          'Stayed focused on recovery',
          'Built new healthy habits',
          'Other'
        ];
      
      default:
        return [
          'Made good progress today',
          'Overcame challenges successfully',
          'Stayed committed to my goals',
          'Learned something valuable',
          'Proud of my efforts',
          'Other'
        ];
    }
  };

  const handleLogProgress = async () => {
    if (onLogProgress) {
      try {
        setLocalLoading(true);
        setError(null);
        
        // Use custom note if "Other" is selected, otherwise use the selected option
        const noteToSubmit = selectedOption === 'Other' ? customNote : selectedOption;
        
        // Validate that custom note is provided when "Other" is selected
        if (selectedOption === 'Other' && !customNote.trim()) {
          setError('Please enter details for your "Other" option');
          setLocalLoading(false);
          return;
        }
        
        await onLogProgress({
          challengeId: challenge.id,
          note: noteToSubmit,
          timestamp: new Date().toISOString()
        });
        
        setLogModalVisible(false);
        setSelectedOption('');
        setCustomNote('');
      } catch (err) {
        setError('Failed to log progress. Please try again.');
        console.error('Error logging progress:', err);
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const handleStart = async () => {
    if (onStart) {
      try {
        setLocalLoading(true);
        setError(null);
        await onStart();
      } catch (err) {
        setError('Failed to start challenge. Please try again.');
        console.error('Error starting challenge:', err);
      } finally {
        setLocalLoading(false);
      }
    }
  };

  const handleComplete = async () => {
    if (onComplete) {
      try {
        setLocalLoading(true);
        setError(null);
        await onComplete();
      } catch (err) {
        setError('Failed to complete challenge. Please try again.');
        console.error('Error completing challenge:', err);
      } finally {
        setLocalLoading(false);
      }
    }
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.headerRow}>
        {challenge.isDaily ? (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={[styles.badgeText, { color: colors.white }]}>Daily</Text>
          </View>
        ) : (
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.badgeText, { color: colors.white }]}>Weekly</Text>
          </View>
        )}
        
        <View style={styles.pointsContainer}>
          <Text style={[styles.pointsText, { color: colors.primary }]}>
            +{challenge.points} pts
          </Text>
        </View>
      </View>
      
      <Text style={[styles.title, { color: colors.text }]}>
        {challenge.title}
      </Text>
      
      <Text style={[styles.description, { color: colors.secondaryText }]}>
        {challenge.description}
      </Text>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.error + '1A' }]}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      )}
      
      {challenge.rewards && challenge.rewards.badgeId && (
        <View style={[styles.rewardSection, { backgroundColor: colors.cardAlt }]}>
          <Award size={18} color={colors.accent} />
          <Text style={[styles.rewardText, { color: colors.text }]}>
            Earn "{challenge.rewards.badgeName}" badge
          </Text>
        </View>
      )}

      {challenge.lastUpdated && (
        <View style={[styles.timestampSection, { backgroundColor: colors.cardAlt }]}>
          <Clock size={16} color={colors.secondaryText} />
          <Text style={[styles.timestampText, { color: colors.secondaryText }]}>
            Last activity: {format(new Date(challenge.lastUpdated), 'MMM d, h:mm a')}
          </Text>
        </View>
      )}
      
      {isActive ? (
        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressLabel, { color: colors.secondaryText }]}>
              Progress:
            </Text>
            <Text style={[styles.progressValue, { color: colors.text }]}>
              {progress}%
            </Text>
          </View>
          
          <View style={[styles.progressContainer, { backgroundColor: colors.progressTrack }]}>
            <View 
              style={[
                styles.progressBar, 
                { 
                  width: `${progress}%`,
                  backgroundColor: progress >= 100 ? colors.success : colors.primary 
                }
              ]} 
            />
          </View>
          
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity 
              style={[
                styles.logButton, 
                { backgroundColor: colors.cardAlt },
                (isLoading || localLoading) && styles.disabledButton
              ]}
              onPress={() => setLogModalVisible(true)}
              disabled={isLoading || localLoading}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                Log Progress
              </Text>
            </TouchableOpacity>
            
            {progress >= 100 && (
              <TouchableOpacity 
                style={[
                  styles.completeButton, 
                  { backgroundColor: colors.success },
                  (isLoading || localLoading) && styles.disabledButton
                ]}
                onPress={handleComplete}
                disabled={isLoading || localLoading}
              >
                <CircleCheck size={18} color={colors.white} />
                <Text style={[styles.buttonText, { color: colors.white }]}>
                  Complete
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <TouchableOpacity 
          style={[
            styles.startButton, 
            { backgroundColor: colors.primary },
            (isLoading || localLoading) && styles.disabledButton
          ]}
          onPress={handleStart}
          disabled={isLoading || localLoading}
        >
          <Play size={18} color={colors.white} />
          <Text style={[styles.buttonText, { color: colors.white }]}>
            Start Challenge
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={logModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Log Progress
            </Text>
            
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: colors.error + '1A' }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}
            
            <ScrollView style={styles.optionsContainer}>
              {getPromptOptions().map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    { 
                      backgroundColor: selectedOption === option ? colors.primary : colors.cardAlt,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setSelectedOption(option)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: selectedOption === option ? colors.white : colors.text }
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
              
              {selectedOption === 'Other' && (
                <View style={[styles.customInputContainer, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.customInput, { color: colors.text }]}
                    placeholder="Type your custom entry here..."
                    placeholderTextColor={colors.secondaryText}
                    value={customNote}
                    onChangeText={setCustomNote}
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.error }]}
                onPress={() => {
                  setLogModalVisible(false);
                  setSelectedOption('');
                  setCustomNote('');
                }}
                disabled={isLoading || localLoading}
              >
                <XCircle size={18} color={colors.white} />
                <Text style={[styles.modalButtonText, { color: colors.white }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { 
                    backgroundColor: (selectedOption && (selectedOption !== 'Other' || customNote.trim())) ? colors.success : colors.cardAlt,
                    opacity: (selectedOption && (selectedOption !== 'Other' || customNote.trim()) && !isLoading && !localLoading) ? 1 : 0.5
                  }
                ]}
                onPress={handleLogProgress}
                disabled={!selectedOption || (selectedOption === 'Other' && !customNote.trim()) || isLoading || localLoading}
              >
                <CheckCircle2 size={18} color={colors.white} />
                <Text style={[styles.modalButtonText, { color: colors.white }]}>
                  {isLoading || localLoading ? 'Saving...' : 'Save Progress'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
  },
  rewardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  rewardText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  timestampSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  timestampText: {
    marginLeft: 8,
    fontSize: 12,
  },
  progressSection: {
    marginTop: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    flex: 1,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    flex: 1,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    flex: 1,
  },
  buttonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    flex: 1,
  },
  modalButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    padding: 12,
    marginVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  customInputContainer: {
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  customInput: {
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});

export default ChallengeCard; 