import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useGamification } from '../context/GamificationContext';
import { useRouter } from 'expo-router';
import { storeData, STORAGE_KEYS } from '@/utils/storage';

export default function ForceEvolutionScreen() {
  const { companion, forceCheckStreakAchievements, evolveCompanion, achievements } = useGamification();
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const router = useRouter();

  // Get the number of unlocked badges
  const unlockedBadgesCount = achievements.filter(badge => badge.unlocked).length;

  const handleForceCheck = async () => {
    setLoading(true);
    setStatusMessage('Checking achievements...');
    
    try {
      // First, force check all streak achievements
      const updated = await forceCheckStreakAchievements();
      
      if (updated) {
        setStatusMessage('Achievements updated! Triggering evolution...');
        
        // Wait a moment for updates to propagate
        setTimeout(() => {
          // Try to evolve the companion
          const evolved = evolveCompanion();
          
          if (evolved) {
            setStatusMessage('SUCCESS: Companion evolved successfully!');
          } else {
            setStatusMessage('Evolution not ready or not successful. Check badge count.');
          }
          setLoading(false);
        }, 1500);
      } else {
        setStatusMessage('No achievement updates needed.');
        setLoading(false);
      }
    } catch (error: any) {
      console.error('Error forcing evolution:', error);
      setStatusMessage(`Error: ${error.message || 'Unknown error'}`);
      setLoading(false);
    }
  };

  const handleDirectEvolve = () => {
    setLoading(true);
    setStatusMessage('Attempting direct evolution...');
    
    try {
      const evolved = evolveCompanion();
      
      if (evolved) {
        setStatusMessage('SUCCESS: Companion evolved successfully!');
      } else {
        setStatusMessage('Direct evolution failed. Try checking achievements first.');
      }
    } catch (error: any) {
      console.error('Error with direct evolution:', error);
      setStatusMessage(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Fix Companion Evolution</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.companionInfo}>
          Companion: {companion?.name || 'None'}
        </Text>
        <Text style={styles.companionInfo}>
          Current Level: {companion?.currentLevel || '1'}
        </Text>
        <Text style={styles.companionInfo}>
          Type: {companion?.type || 'Unknown'}
        </Text>
        <Text style={styles.companionInfo}>
          Badges Unlocked: {unlockedBadgesCount} / {achievements.length}
        </Text>
        <Text style={styles.evolutionRequirement}>
          {companion?.currentLevel === 1 ? 'Need 15+ badges for evolution to stage 2' : 
           companion?.currentLevel === 2 ? 'Need 30+ badges for evolution to stage 3' :
           'Maximum evolution reached!'}
        </Text>
      </View>
      
      <View style={styles.divider} />
      
      <Text style={styles.description}>
        If your companion is not evolving despite having enough badges, use this utility to force the evolution process.
      </Text>
      
      {statusMessage ? (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      ) : null}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleForceCheck}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Check Achievements & Evolve
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton, loading && styles.buttonDisabled]} 
          onPress={handleDirectEvolve}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Force Direct Evolution</Text>
        </TouchableOpacity>

        {companion?.currentLevel === 1 && (
          <TouchableOpacity 
            style={[styles.button, styles.emergencyButton, loading && styles.buttonDisabled]} 
            onPress={() => {
              setLoading(true);
              setStatusMessage('Emergency evolution in progress...');
              
              try {
                // Create a new evolved companion directly
                const companionType = companion.type || 'water';
                let evolvedName = 'Unknown';
                
                switch (companionType) {
                  case 'fire':
                    evolvedName = 'Emberclaw';
                    break;
                  case 'water':
                    evolvedName = 'Bubblescale';
                    break;
                  case 'plant':
                    evolvedName = 'Vinesprout';
                    break;
                  default:
                    evolvedName = companion.name || 'Companion';
                }

                // Store companion data directly
                const updatedCompanion = {
                  ...companion,
                  currentLevel: 2,
                  name: evolvedName,
                  isEvolutionReady: false,
                  isNewUser: false,
                  experience: 0,
                  lastInteraction: Date.now(),
                  happinessLevel: 100,
                };
                
                // Save directly to storage - on reload it will show evolved
                storeData(STORAGE_KEYS.COMPANION_DATA, updatedCompanion);
                
                setStatusMessage('EMERGENCY EVOLUTION COMPLETED! Your companion is now at stage 2! Restart the app to see changes.');
              } catch (error: any) {
                setStatusMessage(`Emergency evolution failed: ${error?.message || 'Unknown error'}`);
                console.error('Emergency evolution error:', error);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
          >
            <Text style={styles.buttonText}>Emergency Stage 2 Evolution</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.button, styles.tertiaryButton]} 
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    marginTop: 40,
  },
  description: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 30,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  companionInfo: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  evolutionRequirement: {
    fontSize: 16,
    color: '#FF9500',
    marginTop: 8,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 20,
  },
  buttonContainer: {
    gap: 16,
  },
  button: {
    backgroundColor: '#6772FF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondaryButton: {
    backgroundColor: '#FF9500',
  },
  tertiaryButton: {
    backgroundColor: '#333333',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  emergencyButton: {
    backgroundColor: '#e74c3c',
  },
}); 