import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, 
  TextInput, Dimensions, SafeAreaView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { Challenge } from '@/types/gamification';
import { RefreshCw, Check, Plus, Activity, Brain, X } from 'lucide-react-native';
import ChallengeCard from '@/components/challenges/ChallengeCard';
import { BlurView } from 'expo-blur';
import useAchievementNotification from '@/hooks/useAchievementNotification';

export default function ChallengesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { 
    activeChallenges, 
    availableChallenges, 
    startChallenge, 
    completeChallenge,
    logHabitReplacement,
    logWorkout,
    logMeditation,
    achievements 
  } = useGamification();
  const { showAchievement } = useAchievementNotification();
  
  const [activeTab, setActiveTab] = useState('active');
  
  // State for modals
  const [habitModalVisible, setHabitModalVisible] = useState(false);
  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);
  const [meditationModalVisible, setMeditationModalVisible] = useState(false);
  
  // State for input fields
  const [habitDescription, setHabitDescription] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('');
  const [meditationDuration, setMeditationDuration] = useState('');
  
  // Handle form submissions
  const handleHabitSubmit = () => {
    if (!habitDescription.trim()) {
      showAchievement({
        title: "Error",
        description: "Please describe the healthy activity you did.",
        buttonText: "OK"
      });
      return;
    }
    
    if (logHabitReplacement(habitDescription)) {
      setHabitModalVisible(false);
      setHabitDescription('');
      showAchievement({
        title: "Success",
        description: "Healthy habit logged successfully!",
        buttonText: "Great"
      });
    }
  };
  
  const handleWorkoutSubmit = () => {
    const duration = parseInt(workoutDuration);
    if (isNaN(duration) || duration <= 0) {
      showAchievement({
        title: "Error",
        description: "Please enter a valid workout duration.",
        buttonText: "OK"
      });
      return;
    }
    
    if (logWorkout(duration)) {
      setWorkoutModalVisible(false);
      setWorkoutDuration('');
      showAchievement({
        title: "Success",
        description: "Workout logged successfully!",
        buttonText: "Great"
      });
    }
  };
  
  const handleMeditationSubmit = () => {
    const duration = parseInt(meditationDuration);
    if (isNaN(duration) || duration <= 0) {
      showAchievement({
        title: "Error",
        description: "Please enter a valid meditation duration.",
        buttonText: "OK"
      });
      return;
    }
    
    if (logMeditation(duration)) {
      setMeditationModalVisible(false);
      setMeditationDuration('');
      showAchievement({
        title: "Success",
        description: "Meditation logged successfully!",
        buttonText: "Great"
      });
    }
  };
  
  const renderActiveChallenge = ({ item }: { item: Challenge }) => (
    <View>
    <ChallengeCard 
      challenge={item} 
      isActive={true}
      onComplete={() => completeChallenge(item.id)}
    />
      
      {/* Add logging buttons for specific challenges */}
      {item.id === 'challenge-4' && (
        <TouchableOpacity 
          style={[styles.logButton, { backgroundColor: colors.accent }]}
          onPress={() => setHabitModalVisible(true)}
        >
          <Plus size={18} color="#FFF" />
          <Text style={styles.logButtonText}>Log Healthy Activity</Text>
        </TouchableOpacity>
      )}
      
      {item.id === 'challenge-5' && (
        <TouchableOpacity 
          style={[styles.logButton, { backgroundColor: colors.accent }]}
          onPress={() => setWorkoutModalVisible(true)}
        >
          <Activity size={18} color="#FFF" />
          <Text style={styles.logButtonText}>Log Workout</Text>
        </TouchableOpacity>
      )}
      
      {item.id === 'challenge-2' && (
        <TouchableOpacity 
          style={[styles.logButton, { backgroundColor: colors.accent }]}
          onPress={() => setMeditationModalVisible(true)}
        >
          <Brain size={18} color="#FFF" />
          <Text style={styles.logButtonText}>Log Meditation</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  const renderAvailableChallenge = ({ item }: { item: Challenge }) => (
    <ChallengeCard 
      challenge={item} 
      isActive={false}
      onStart={() => startChallenge(item.id)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 40 }]}>
        <Text style={styles.headerTitle}>Challenges</Text>
      </View>
      
      <View style={[styles.tabContainer, { backgroundColor: 'rgba(30, 30, 30, 0.8)' }]}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'active' ? styles.activeTab : styles.inactiveTab,
            activeTab === 'active' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('active')}
        >
          <RefreshCw size={20} color={activeTab === 'active' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
          <Text 
            style={[
              styles.tabText, 
              { 
                color: activeTab === 'active' ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                fontWeight: activeTab === 'active' ? '700' : '500'
              }
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'available' ? styles.activeTab : styles.inactiveTab,
            activeTab === 'available' && { backgroundColor: colors.primary }
          ]}
          onPress={() => setActiveTab('available')}
        >
          <Check size={20} color={activeTab === 'available' ? '#FFFFFF' : 'rgba(255,255,255,0.7)'} />
          <Text 
            style={[
              styles.tabText, 
              { 
                color: activeTab === 'available' ? '#FFFFFF' : 'rgba(255,255,255,0.7)',
                fontWeight: activeTab === 'available' ? '700' : '500'
              }
            ]}
          >
            Available
          </Text>
        </TouchableOpacity>
      </View>
      
        <FlatList
        data={activeTab === 'active' ? activeChallenges : availableChallenges}
        renderItem={activeTab === 'active' ? renderActiveChallenge : renderAvailableChallenge}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
          ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
              {activeTab === 'active' 
                ? "No active challenges. Start one from the Available tab!" 
                : "No available challenges at the moment."}
            </Text>
          </View>
        }
      />
      
      {/* Habit Replacement Modal */}
      <Modal
        visible={habitModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setHabitModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Log Healthy Activity
            </Text>
            
            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>
              What healthy activity did you do instead of giving in to urges?
              </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Describe your healthy activity..."
              placeholderTextColor={colors.placeholder}
              value={habitDescription}
              onChangeText={setHabitDescription}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setHabitModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancel
              </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleHabitSubmit}
              >
                <Text style={styles.submitButtonText}>
                  Log Activity
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Workout Modal */}
      <Modal
        visible={workoutModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWorkoutModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Log Workout
            </Text>
            
            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>
              How many minutes did you exercise?
            </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Enter duration in minutes..."
              placeholderTextColor={colors.placeholder}
              value={workoutDuration}
              onChangeText={setWorkoutDuration}
              keyboardType="number-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setWorkoutModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleWorkoutSubmit}
              >
                <Text style={styles.submitButtonText}>
                  Log Workout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Meditation Modal */}
      <Modal
        visible={meditationModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setMeditationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Log Meditation
            </Text>
            
            <Text style={[styles.modalLabel, { color: colors.secondaryText }]}>
              How many minutes did you meditate?
              </Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Enter duration in minutes..."
              placeholderTextColor={colors.placeholder}
              value={meditationDuration}
              onChangeText={setMeditationDuration}
              keyboardType="number-pad"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setMeditationModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancel
              </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.submitButton, { backgroundColor: colors.primary }]}
                onPress={handleMeditationSubmit}
              >
                <Text style={styles.submitButtonText}>
                  Log Meditation
                </Text>
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
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFFFFF',
  },
  inactiveTab: {
    opacity: 0.8,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 17,
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 48,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginLeft: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});