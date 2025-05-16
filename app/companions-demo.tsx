import React, { useState } from 'react';
import { StyleSheet, View, Text, SafeAreaView, StatusBar, ScrollView, TouchableOpacity, ColorValue } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import CompanionSelector from '@/components/companions/CompanionSelector';
import FireCompanion from '@/components/companions/FireCompanion';
import WaterCompanion from '@/components/companions/WaterCompanion';
import { LinearGradient } from 'expo-linear-gradient';

export default function CompanionDemoScreen() {
  const { colors } = useTheme();
  const [selectedType, setSelectedType] = useState<'fire' | 'water' | null>(null);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  
  const handleCompanionSelect = (type: 'fire' | 'water', selectedStage: number = 1) => {
    setSelectedType(type);
    setStage(selectedStage as 1 | 2 | 3);
  };
  
  const renderSelectedCompanion = () => {
    if (!selectedType) return null;
    
    const companionNames = {
      fire: ['Emberlite', 'Emberheat', 'Infernova'],
      water: ['Aquamist', 'Aquastream', 'Tidalforce']
    };
    
    const companionDescriptions = {
      fire: [
        "A tiny flame of determination flickers within the egg. As it cracks, you feel its warmth resonating with your own inner fire.",
        "The flame of willpower burns brightly, helping you resist temptations and building your inner strength with each challenge overcome.",
        "A majestic embodiment of mastery and self-control, your companion now radiates the power you've cultivated through discipline and commitment."
      ],
      water: [
        "Gentle ripples pulse through this mysterious egg. The calming energy within helps clear your mind of distracting thoughts.",
        "Flowing like water around obstacles, your companion teaches adaptability and patience, washing away impulsive urges.",
        "A powerful force of serenity and emotional control, your companion has evolved along with your ability to channel desires into positive energy."
      ]
    };
    
    return (
      <View style={styles.companionDetailContainer}>
        {selectedType === 'fire' ? (
          <LinearGradient
            colors={['#F9484A', '#FBD72B']}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.companionWrapper}>
              <FireCompanion stage={stage} size={250} animate={true} />
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={['#5B86E5', '#36D1DC']}
            style={styles.gradientBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.companionWrapper}>
              <WaterCompanion stage={stage} size={250} animate={true} />
            </View>
          </LinearGradient>
        )}
        
        <View style={styles.infoContainer}>
          <Text style={[styles.companionName, { color: colors.text }]}>
            {companionNames[selectedType][stage-1]}
          </Text>
          
          <Text style={[styles.companionDescription, { color: colors.secondary }]}>
            {companionDescriptions[selectedType][stage-1]}
          </Text>
          
          <View style={styles.stageInfo}>
            <Text style={[styles.stageTitle, { color: colors.text }]}>
              {stage === 1 ? 'Egg Stage' : stage === 2 ? 'Basic Form' : 'Final Evolution'}
            </Text>
            <Text style={[styles.stageHint, { color: colors.secondary }]}>
              {stage === 1 
                ? 'Unlocked when you start your journey' 
                : stage === 2 
                  ? 'Evolves after 7 days of commitment' 
                  : 'Achieved after 30 days of dedication'}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            NoFap Companions
          </Text>
          <Text style={[styles.subtitle, { color: colors.secondary }]}>
            Choose your companion to join your journey of self-improvement
          </Text>
        </View>
        
        <View style={styles.selectorContainer}>
          <CompanionSelector 
            onSelect={handleCompanionSelect}
            initialSelection={selectedType}
          />
        </View>
        
        {renderSelectedCompanion()}
        
        <View style={styles.infoBlock}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            About Companions
          </Text>
          <Text style={[styles.infoText, { color: colors.secondary }]}>
            Your companion evolves as you progress in your NoFap journey, 
            reflecting your growth and commitment. The visual changes serve as both
            a reminder of your progress and a motivational tool.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  selectorContainer: {
    height: 500,
  },
  companionDetailContainer: {
    padding: 20,
    alignItems: 'center',
  },
  gradientBackground: {
    width: 300,
    height: 300,
    borderRadius: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  companionWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
  },
  companionName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  companionDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  stageInfo: {
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    width: '100%',
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  stageHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoBlock: {
    padding: 20,
    margin: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16,
    lineHeight: 24,
  },
}); 