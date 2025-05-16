import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image } from 'react-native';
import LottieView from 'lottie-react-native';
import { useTheme } from '@/context/ThemeContext';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, interpolate, Extrapolate } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useGamification } from '@/context/GamificationContext';
import { Companion } from '@/types/companion';
import { EVOLUTION_THRESHOLDS, BOND_THRESHOLDS } from '@/types/companion';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.8;
const SPACING = width * 0.05;

export type CompanionChoice = 'tiger' | 'monster' | 'pumpkin';

interface CompanionSelectionScreenProps {
  onSelect: (companion: CompanionChoice) => void;
  onComplete: () => void;
}

interface CompanionData {
  id: CompanionChoice;
  name: string;
  description: string;
  color: string;
  animation: any;
}

const CompanionSelectionScreen: React.FC<CompanionSelectionScreenProps> = ({ onSelect, onComplete }) => {
  const { colors } = useTheme();
  const { setCompanion } = useGamification();
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedCompanion, setSelectedCompanion] = useState<CompanionChoice | null>(null);
  const scrollX = useSharedValue(0);
  const router = useRouter();

  const companions: CompanionData[] = [
    {
      id: 'tiger',
      name: 'Stripes',
      description: "Half tiger, half therapist — growls when you're about to mess up.",
      color: '#4FC3F7', // Light blue
      animation: require('@/assets/lottie/baby_tiger_stage1.json'),
    },
    {
      id: 'monster',
      name: 'Snuglur',
      description: "The monster under your bed — but this time, he's scaring off your bad habits.",
      color: '#FF8A65', // Orange/red
      animation: require('@/assets/lottie/baby_monster_stage1.json'),
    },
    {
      id: 'pumpkin',
      name: 'Drowsi',
      description: "Falls asleep faster than your urges — let him nap, so you don't relapse.",
      color: '#81C784', // Green
      animation: require('@/assets/lottie/baby_panda_stage1.json'),
    },
  ];

  useEffect(() => {
    if (scrollViewRef.current) {
      const newOffset = activeIndex * (CARD_WIDTH + SPACING);
      scrollViewRef.current.scrollTo({ x: newOffset, animated: true });
    }
  }, [activeIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    
    const newIndex = Math.round(offsetX / (CARD_WIDTH + SPACING));
    if (newIndex !== activeIndex) {
      setActiveIndex(newIndex);
    }
  };

  const handleSelect = (companion: CompanionChoice) => {
    setSelectedCompanion(companion);
    onSelect(companion);
    
    // Create a companion object from the selected choice
    const selectedData = companions.find(c => c.id === companion);
    if (selectedData) {
      const companionObj: Companion = {
        id: selectedData.id,
        type: selectedData.id === 'tiger' ? 'water' : 
              selectedData.id === 'monster' ? 'fire' : 'plant',
        name: selectedData.name,
        description: selectedData.description,
        currentLevel: 1,
        experience: 0,
        nextLevelExperience: 100,
        evolutions: [
          { 
            level: 2, 
            name: `${selectedData.name} Jr.`,
            xpRequired: EVOLUTION_THRESHOLDS.STAGE_2,
            bondRequired: BOND_THRESHOLDS.LEVEL_2
          },
          { 
            level: 3, 
            name: `${selectedData.name} Sr.`,
            xpRequired: EVOLUTION_THRESHOLDS.STAGE_3,
            bondRequired: BOND_THRESHOLDS.LEVEL_3 
          }
        ]
      };
      
      // Set the companion in the context
      setCompanion(companionObj);
      
      // Complete onboarding after a short delay
      setTimeout(() => {
        onComplete();
      }, 500);
    }
  };

  const renderCompanionCard = (companion: CompanionData, index: number) => {
    const inputRange = [
      (index - 1) * (CARD_WIDTH + SPACING),
      index * (CARD_WIDTH + SPACING),
      (index + 1) * (CARD_WIDTH + SPACING),
    ];

    const animatedStyle = useAnimatedStyle(() => {
      const scale = interpolate(
        scrollX.value,
        inputRange,
        [0.9, 1, 0.9],
        Extrapolate.CLAMP
      );

      return {
        transform: [{ scale }],
      };
    });

    return (
      <Animated.View 
        key={companion.id}
        style={[
          styles.card, 
          { 
            backgroundColor: colors.card,
            borderColor: companion.color,
            marginRight: index === companions.length - 1 ? 0 : SPACING,
          },
          animatedStyle
        ]}
      >
        <Text style={[styles.companionName, { color: companion.color }]}>
          {companion.name}
        </Text>
        <View style={styles.animationContainer}>
          <LottieView
            source={companion.animation}
            autoPlay
            loop
            style={styles.animation}
          />
        </View>
        <Text style={[styles.description, { color: colors.text }]}>
          {companion.description}
        </Text>
        <TouchableOpacity
          style={[styles.selectButton, { backgroundColor: companion.color }]}
          onPress={() => handleSelect(companion.id)}
        >
          <Text style={styles.selectButtonText}>Select</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPaginationDots = () => {
    return (
      <View style={styles.paginationContainer}>
        {companions.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: index === activeIndex ? companions[activeIndex].color : colors.border,
                width: index === activeIndex ? 20 : 10,
              },
            ]}
            onPress={() => setActiveIndex(index)}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Choose Your Companion</Text>
      <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
        Your companion will grow and evolve as you progress
      </Text>
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        snapToInterval={CARD_WIDTH + SPACING}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {companions.map((companion, index) => renderCompanionCard(companion, index))}
      </ScrollView>
      
      {renderPaginationDots()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scrollViewContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: 500,
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  companionName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  animationContainer: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 22,
  },
  selectButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  paginationDot: {
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
});

export default CompanionSelectionScreen; 