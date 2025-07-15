import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

const communitySentiments = [
  {
    id: '1',
    quote: '"Every day is a new opportunity to rewrite your story. Keep going!"',
    author: 'A fellow traveler',
  },
  {
    id: '2',
    quote: '"It\'s okay to stumble, but it\'s never okay to give up. You\'re stronger than you think."',
    author: 'From the heart of the community',
  },
  {
    id: '3',
    quote: '"Finding peace starts with believing in yourself. Celebrate every small victory."',
    author: 'A seasoned member',
  },
  {
    id: '4',
    quote: '"The journey may be tough, but remember why you started. Your future self will thank you."',
    author: 'Inspired by collective wisdom',
  },
  {
    id: '5',
    quote: '"Connect with others, share your struggles and triumphs. You\'re not alone in this fight."',
    author: 'A supportive voice',
  },
];

const WeeklyDigestCard: React.FC = () => {
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }, []);

  const viewabilityConfigRef = useRef({
    itemVisiblePercentThreshold: 50
  });

  const scrollToNext = () => {
    const nextIndex = (currentIndex + 1) % communitySentiments.length;
    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
  };

  const scrollToPrevious = () => {
    const prevIndex = (currentIndex - 1 + communitySentiments.length) % communitySentiments.length;
    flatListRef.current?.scrollToIndex({ index: prevIndex, animated: true });
  };

  const renderItem = ({ item }: { item: typeof communitySentiments[0] }) => (
    <View style={[styles.itemContainer, { width: width - 32 }]}>
      <Text style={styles.quote}>{item.quote}</Text>
      <Text style={styles.author}>- {item.author}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#4CAF50', '#8BC34A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      >
        <Text style={styles.header}>Community Highlights</Text>
        <View style={styles.carouselContainer}>
          <TouchableOpacity onPress={scrollToPrevious} style={styles.navButton}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <FlatList
            ref={flatListRef}
            data={communitySentiments}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfigRef.current}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={styles.flatListContent}
          />
          <TouchableOpacity onPress={scrollToNext} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.pagination}>
          {communitySentiments.map((_, i) => {
            const inputRange = [
              (i - 1) * (width - 32),
              i * (width - 32),
              (i + 1) * (width - 32),
            ];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 20, 8],
              extrapolate: 'clamp',
            });
            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i.toString()}
                style={[
                  styles.dot,
                  { width: dotWidth, opacity, backgroundColor: colors.background }
                ]}
              />
            );
          })}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  gradientBackground: {
    padding: 16,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  carouselContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButton: {
    padding: 8,
  },
  itemContainer: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  author: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  flatListContent: {
    paddingHorizontal: 0, // Adjust as needed
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

export default WeeklyDigestCard; 