import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import FireCompanion from './FireCompanion';
import WaterCompanion from './WaterCompanion';
import PlantCompanion from './PlantCompanion';

interface CompanionSelectorProps {
  onSelect: (companionType: 'fire' | 'water' | 'plant', stage?: number) => void;
  initialSelection?: 'fire' | 'water' | 'plant' | null;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const CompanionSelector: React.FC<CompanionSelectorProps> = ({
  onSelect,
  initialSelection = null
}) => {
  const [selectedType, setSelectedType] = useState<'fire' | 'water' | 'plant' | null>(initialSelection);
  const [stage, setStage] = useState(1);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.9))[0];
  
  // Show animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, []);
  
  // Handle companion selection
  const handleSelectCompanion = (type: 'fire' | 'water' | 'plant') => {
    setSelectedType(type);
    onSelect(type, stage);
    
    // Animate the selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };
  
  // Handle evolution stage change
  const handleStageChange = (newStage: number) => {
    if (newStage >= 1 && newStage <= 3) {
      setStage(newStage);
      if (selectedType) {
        onSelect(selectedType, newStage);
      }
    }
  };
  
  // Render companions with error handling
  const renderWaterCompanion = () => {
    try {
      return (
        <WaterCompanion 
          stage={stage as 1 | 2 | 3}
          size={SCREEN_WIDTH * 0.28}
          animate={true} 
        />
      );
    } catch (error) {
      console.error("Error rendering WaterCompanion:", error);
      return (
        <View style={{ width: SCREEN_WIDTH * 0.28, height: SCREEN_WIDTH * 0.28, backgroundColor: '#87CEFA', borderRadius: 100 }}>
          <Text style={{ textAlign: 'center', marginTop: SCREEN_WIDTH * 0.12, color: '#fff' }}>Water</Text>
        </View>
      );
    }
  };
  
  const renderPlantCompanion = () => {
    try {
      return (
        <PlantCompanion 
          stage={stage as 1 | 2 | 3}
          size={SCREEN_WIDTH * 0.28}
          animate={true} 
        />
      );
    } catch (error) {
      console.error("Error rendering PlantCompanion:", error);
      return (
        <View style={{ width: SCREEN_WIDTH * 0.28, height: SCREEN_WIDTH * 0.28, backgroundColor: '#90EE90', borderRadius: 100 }}>
          <Text style={{ textAlign: 'center', marginTop: SCREEN_WIDTH * 0.12, color: '#fff' }}>Plant</Text>
        </View>
      );
    }
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      <Text style={styles.title}>Choose Your Companion</Text>
      
      <View style={styles.companionsContainer}>
        {/* Fire Companion */}
        <TouchableOpacity
          style={[
            styles.companionOption,
            selectedType === 'fire' && styles.selectedOption
          ]}
          onPress={() => handleSelectCompanion('fire')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#FFD700', '#FF8C00', '#FF4500']}
            style={styles.gradientBackground}
          >
            <View style={styles.companionWrapper}>
              <FireCompanion 
                stage={stage as 1 | 2 | 3}
                size={SCREEN_WIDTH * 0.28}
                animate={true} 
              />
              <Text style={styles.companionName}>Snuglur</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Water Companion */}
        <TouchableOpacity
          style={[
            styles.companionOption,
            selectedType === 'water' && styles.selectedOption
          ]}
          onPress={() => handleSelectCompanion('water')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#87CEFA', '#1E90FF', '#0000CD']}
            style={styles.gradientBackground}
          >
            <View style={styles.companionWrapper}>
              {renderWaterCompanion()}
              <Text style={styles.companionName}>Stripes</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        {/* Plant Companion */}
        <TouchableOpacity
          style={[
            styles.companionOption,
            selectedType === 'plant' && styles.selectedOptionPlant
          ]}
          onPress={() => handleSelectCompanion('plant')}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#90EE90', '#3CB371', '#2E8B57']}
            style={styles.gradientBackground}
          >
            <View style={styles.companionWrapper}>
              {renderPlantCompanion()}
              <Text style={styles.companionName}>Drowsi</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      {/* Evolution Stage Controls */}
      <View style={styles.stageControls}>
        <TouchableOpacity 
          style={[styles.stageButton, stage === 1 && styles.activeStageButton]}
          onPress={() => handleStageChange(1 as 1)}
        >
          <Text style={styles.stageText}>Basic</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.stageButton, stage === 2 && styles.activeStageButton]}
          onPress={() => handleStageChange(2 as 2)}
        >
          <Text style={styles.stageText}>Evolved</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.stageButton, stage === 3 && styles.activeStageButton]}
          onPress={() => handleStageChange(3 as 3)}
        >
          <Text style={styles.stageText}>Final</Text>
        </TouchableOpacity>
      </View>
      
      {selectedType && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionInfoText}>
            {selectedType === 'fire' && stage === 1 && "Snuglur: The monster under your bed — but this time, he's scaring off your bad habits."}
            {selectedType === 'water' && stage === 1 && "Stripes: Half tiger, half therapist — growls when you're about to mess up."}
            {selectedType === 'water' && stage === 2 && "Stripes: Tiger shark of sobriety — all the bite of willpower with the wet nose of accountability."}
            {selectedType === 'water' && stage === 3 && "Aquadrake: A powerful guardian of serenity. Stripes has evolved along with your ability to channel desires into positive energy."}
            {selectedType === 'plant' && stage === 1 && "Drowsi: Falls asleep faster than your urges — let him nap, so you don't relapse."}
            {stage === 2 && "At this stage, your companion has evolved to reflect your growing strength."}
            {stage === 3 && "The final form represents mastery and long-term commitment."}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
    color: '#333',
    textAlign: 'center',
  },
  companionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
    width: '100%',
  },
  companionOption: {
    width: SCREEN_WIDTH * 0.30,
    height: SCREEN_WIDTH * 0.50,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 10,
  },
  selectedOption: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  selectedOptionPlant: {
    borderWidth: 3,
    borderColor: '#3CB371',
  },
  gradientBackground: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    flex: 1,
  },
  companionName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  stageControls: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  stageButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeStageButton: {
    backgroundColor: '#007AFF',
    borderColor: '#0055CC',
  },
  stageText: {
    fontSize: 16,
    color: '#555',
    fontWeight: '500',
  },
  selectionInfo: {
    marginTop: 20,
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 10,
    width: '100%',
  },
  selectionInfoText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#555',
  }
});

export default CompanionSelector;