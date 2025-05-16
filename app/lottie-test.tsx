import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, SafeAreaView } from 'react-native';
import LottieView from 'lottie-react-native';
import { useRouter } from 'expo-router';

export default function LottieTest() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<string>('monster');
  
  const renderAnimation = () => {
    switch(selectedTab) {
      case 'monster':
        return (
          <View style={styles.lottieContainer}>
            <Text>Monster Animation:</Text>
            <LottieView
              source={require('../assets/lottie/baby_monster_stage1.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>
        );
      case 'tiger':
        return (
          <View style={styles.lottieContainer}>
            <Text>Tiger Animation:</Text>
            <LottieView
              source={require('../assets/lottie/baby_tiger_stage1.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>
        );
      case 'simple':
        return (
          <View style={styles.lottieContainer}>
            <Text>Simple Rectangle:</Text>
            <LottieView
              source={require('../assets/test-animation.json')}
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>
        );
      default:
        return null;
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Lottie Test Screen</Text>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'monster' && styles.selectedTab]}
          onPress={() => setSelectedTab('monster')}
        >
          <Text style={styles.tabText}>Monster</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'tiger' && styles.selectedTab]}
          onPress={() => setSelectedTab('tiger')}
        >
          <Text style={styles.tabText}>Tiger</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, selectedTab === 'simple' && styles.selectedTab]}
          onPress={() => setSelectedTab('simple')}
        >
          <Text style={styles.tabText}>Simple</Text>
        </TouchableOpacity>
      </View>
      
      {renderAnimation()}
      
      <Button title="Go Back" onPress={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  selectedTab: {
    backgroundColor: '#6a5acd',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
  },
  lottieContainer: {
    marginVertical: 30,
    alignItems: 'center',
  },
  lottie: {
    width: 250,
    height: 250,
    backgroundColor: '#f0f0f0',
  },
}); 