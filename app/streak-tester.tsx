import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useStreak } from '@/context/StreakContext';
import { format, subDays, startOfToday } from 'date-fns';
import { resetStreakData, debugStreakData, setManualStreak, setCalendarHistory, setSevenDayStreak } from '@/utils/resetStreakData';

export default function StreakTesterScreen() {
  const { streak, streakStartDate, setStreakStartDate, forceRefresh } = useStreak();
  const [streakDays, setStreakDays] = useState('7');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  // Force refresh the component when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      // This will trigger a re-render of the component
      console.log('Refreshing component...');
    }
  }, [refreshKey]);

  const refreshComponent = async () => {
    setMessage('Refreshing...');
    
    // Use setTimeout to ensure the message is displayed before refresh
    setTimeout(async () => {
      await forceRefresh();
      setRefreshKey(prev => prev + 1);
      
      // Reload the streak context data
      try {
        // This is a workaround since we can't directly reload the page in React Native
        // We'll navigate away and back to force a full reload
        router.replace('/');
        setTimeout(() => {
          router.replace('/streak-tester');
        }, 100);
      } catch (e) {
        console.error('Navigation error:', e);
        // Fallback to just refreshing the component
        setRefreshKey(prev => prev + 1);
      }
    }, 500);
  };

  const handleSetStreak = async () => {
    try {
      setLoading(true);
      setMessage('Setting streak...');
      
      const days = parseInt(streakDays, 10);
      if (isNaN(days) || days < 0) {
        setMessage('Please enter a valid number of days');
        return;
      }
      
      await setManualStreak(days);
      setMessage(`Successfully set streak to ${days} days`);
      
      // Refresh the component to show updated data
      Alert.alert(
        'Success',
        `Streak set to ${days} days. The app will refresh to show changes.`,
        [{ text: 'OK', onPress: refreshComponent }]
      );
    } catch (error: any) {
      setMessage(`Error: ${error?.message || 'Unknown error occurred'}`);
      Alert.alert('Error', `Failed to set streak: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResetData = async () => {
    try {
      setLoading(true);
      setMessage('Resetting streak data...');
      
      await resetStreakData();
      setMessage('Streak data reset complete');
      
      // Refresh the component to show updated data
      Alert.alert(
        'Success',
        'Streak data has been reset. The app will refresh to show changes.',
        [{ text: 'OK', onPress: refreshComponent }]
      );
    } catch (error: any) {
      setMessage(`Error: ${error?.message || 'Unknown error occurred'}`);
      Alert.alert('Error', `Failed to reset data: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugData = async () => {
    try {
      setLoading(true);
      setMessage('Debugging streak data...');
      
      await debugStreakData();
      setMessage('Check console for debug information');
      
      Alert.alert(
        'Debug Complete',
        'Streak data has been logged to the console.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      setMessage(`Error: ${error?.message || 'Unknown error occurred'}`);
      Alert.alert('Error', `Debug failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSet7DayStreak = async () => {
    try {
      setLoading(true);
      setMessage('Setting 7-day streak...');
      
      // Create clean days for the past 7 days
      const today = startOfToday();
      const cleanDays = [];
      
      for (let i = 0; i < 7; i++) {
        cleanDays.push(subDays(today, i));
      }
      
      // Set the calendar history
      await setCalendarHistory(cleanDays);
      setMessage('7-day streak set successfully');
      
      // Refresh the component to show updated data
      Alert.alert(
        'Success',
        '7-day streak has been set. The app will refresh to show changes.',
        [{ text: 'OK', onPress: refreshComponent }]
      );
    } catch (error: any) {
      setMessage(`Error: ${error?.message || 'Unknown error occurred'}`);
      Alert.alert('Error', `Failed to set 7-day streak: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSetStreakWithRelapse = async () => {
    try {
      setLoading(true);
      setMessage('Setting streak with relapse...');
      
      // Create clean days for the past 10 days
      const today = startOfToday();
      const cleanDays = [];
      const relapseDays = [];
      
      // Set 10 days of clean days
      for (let i = 0; i < 10; i++) {
        cleanDays.push(subDays(today, i));
      }
      
      // But mark day 3 as a relapse
      relapseDays.push(subDays(today, 3));
      
      // Set the calendar history
      await setCalendarHistory(cleanDays, relapseDays);
      setMessage('Streak with relapse set successfully');
      
      // Refresh the component to show updated data
      Alert.alert(
        'Success',
        'Streak with relapse has been set. The app will refresh to show changes.',
        [{ text: 'OK', onPress: refreshComponent }]
      );
    } catch (error: any) {
      setMessage(`Error: ${error?.message || 'Unknown error occurred'}`);
      Alert.alert('Error', `Failed to set streak with relapse: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} key={`screen-${refreshKey}`}>
      <Stack.Screen options={{ 
        title: "Streak Calendar Tester", 
        headerStyle: { backgroundColor: '#4a6fa5' },
        headerTintColor: '#fff',
      }} />
      
      <ScrollView style={styles.content}>
        <View style={styles.infoContainer}>
          <Text style={styles.title}>Streak Calendar Testing</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Current Streak Info:</Text>
            <Text style={styles.infoText}>Current Streak: {streak} days</Text>
            {streakStartDate && (
              <Text style={styles.infoText}>
                Start Date: {format(streakStartDate, 'MMM d, yyyy')}
              </Text>
            )}
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Set Streak (days):</Text>
            <TextInput
              style={styles.input}
              value={streakDays}
              onChangeText={setStreakDays}
              keyboardType="numeric"
              placeholder="Enter days"
            />
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleSetStreak}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Set Streak</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions:</Text>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={[styles.button, styles.quickButton, loading && styles.buttonDisabled]} 
                onPress={handleSet7DayStreak}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Set 7-Day Streak</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.quickButton, loading && styles.buttonDisabled]} 
                onPress={handleSetStreakWithRelapse}
                disabled={loading}
              >
                <Text style={styles.buttonText}>Streak with Relapse</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.debugButton, loading && styles.buttonDisabled]} 
              onPress={handleDebugData}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Debug Data</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.resetButton, loading && styles.buttonDisabled]} 
              onPress={handleResetData}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Reset Data</Text>
            </TouchableOpacity>
          </View>
          
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
        
        {/* Calendar removed */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  content: {
    flex: 1,
  },
  infoContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 5,
  },
  inputContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4a6fa5',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  debugButton: {
    backgroundColor: '#5c6bc0',
    marginRight: 10,
  },
  resetButton: {
    backgroundColor: '#e57373',
    marginLeft: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4a6fa5',
    color: '#333',
    fontSize: 14,
  },
  calendarContainer: {
    padding: 10,
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginBottom: 20,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickButton: {
    marginHorizontal: 5,
  },
}); 