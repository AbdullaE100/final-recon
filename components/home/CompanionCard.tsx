import React from 'react';
import { StyleSheet, TouchableOpacity, View, Text, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useGamification } from '../../context/GamificationContext';
import { Achievement } from '@/types/gamification';

export default function CompanionCard() {
  const { companion, achievements } = useGamification();
  const router = useRouter();
  
  if (!companion) {
    return null;
  }
  
  const unlockedBadgesCount = achievements.filter((badge: Achievement) => badge.unlocked).length;
  const evolutionReady = unlockedBadgesCount >= 15 && companion.currentLevel < 2;
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push('/(tabs)/companion' as any)}
      >
        <View style={styles.content}>
          <Text style={styles.name}>{companion.name}</Text>
          <Text style={styles.description}>{companion.description || 'Your companion'}</Text>
          <Text style={styles.stage}>Stage {companion.currentLevel}</Text>
        </View>
      </TouchableOpacity>
      

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 15,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#BBBBBB',
    marginBottom: 8,
  },
  stage: {
    fontSize: 12,
    color: '#888888',
  },
  evolutionNotice: {
    backgroundColor: '#FF9500',
    padding: 10, 
    borderRadius: 8,
    marginTop: 12,
  },
  evolutionNoticeText: {
    color: '#000',
    fontWeight: '600',
    textAlign: 'center',
  },
});