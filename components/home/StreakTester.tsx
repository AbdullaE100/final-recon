import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const StreakTester = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Streak testing functionality has been removed from the application.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    margin: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  }
});

export default StreakTester; 