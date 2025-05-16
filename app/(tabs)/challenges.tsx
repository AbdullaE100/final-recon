import { StyleSheet, View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import ChallengeCard from '@/components/challenges/ChallengeCard';
import { RefreshCw, Check } from 'lucide-react-native';

export default function ChallengesScreen() {
  const { colors } = useTheme();
  const { 
    activeChallenges, 
    availableChallenges, 
    startChallenge, 
    completeChallenge,
    achievements 
  } = useGamification();
  
  const [activeTab, setActiveTab] = useState('active');
  
  const renderActiveChallenge = ({ item }) => (
    <ChallengeCard 
      challenge={item} 
      isActive={true}
      onComplete={() => completeChallenge(item.id)}
    />
  );
  
  const renderAvailableChallenge = ({ item }) => (
    <ChallengeCard 
      challenge={item} 
      isActive={false}
      onStart={() => startChallenge(item.id)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Challenges</Text>
      </View>
      
      <View style={[styles.tabContainer, { backgroundColor: colors.cardAlt }]}>
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'active' && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('active')}
        >
          <RefreshCw size={16} color={activeTab === 'active' ? colors.white : colors.text} />
          <Text 
            style={[
              styles.tabText, 
              { color: activeTab === 'active' ? colors.white : colors.text }
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.tab, 
            activeTab === 'available' && [styles.activeTab, { backgroundColor: colors.primary }]
          ]}
          onPress={() => setActiveTab('available')}
        >
          <Check size={16} color={activeTab === 'available' ? colors.white : colors.text} />
          <Text 
            style={[
              styles.tabText, 
              { color: activeTab === 'available' ? colors.white : colors.text }
            ]}
          >
            Available
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'active' ? (
        <FlatList
          data={activeChallenges}
          renderItem={renderActiveChallenge}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Active Challenges
              </Text>
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                Start a challenge to earn points and make progress on your journey.
              </Text>
              <TouchableOpacity 
                style={[styles.switchTabButton, { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab('available')}
              >
                <Text style={styles.switchTabText}>View Available Challenges</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={availableChallenges}
          renderItem={renderAvailableChallenge}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={[styles.emptyState, { backgroundColor: colors.cardAlt }]}>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                You've Started All Challenges!
              </Text>
              <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                Check back later for new challenges or focus on completing your active ones.
              </Text>
              <TouchableOpacity 
                style={[styles.switchTabButton, { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab('active')}
              >
                <Text style={styles.switchTabText}>View Active Challenges</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 28,
  },
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  tabText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    marginLeft: 4,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyState: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  switchTabButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  switchTabText: {
    color: 'white',
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
  }
});