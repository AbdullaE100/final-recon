import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';

const LottieTestScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.titleText}>Lottie Animation Test</Text>
      <Text style={styles.instructionText}>
        You should see a green square below. Inside it, a red square.
        Inside the red square, an orange pulsing circle should be visible.
      </Text>
      <View style={styles.lottieWrapper}>
        <LottieView
          source={require('../assets/lottie/baby_monster_stage1.json')}
          autoPlay
          loop
          style={styles.lottieView}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50', // Dark blue/grey background
    padding: 20,
  },
  titleText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 25,
    textAlign: 'center',
  },
  lottieWrapper: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(0, 255, 0, 0.4)', // Semi-transparent Green
    padding: 10, // Padding to see the wrapper color around LottieView
    borderWidth: 2,
    borderColor: 'lime',
  },
  lottieView: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 0, 0, 0.4)', // Semi-transparent Red
  },
});

export default LottieTestScreen; 