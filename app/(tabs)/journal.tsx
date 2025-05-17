import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import { useGamification } from '@/context/GamificationContext';
import { useTheme } from '@/context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  CirclePlus as PlusCircle, 
  Trash2, 
  Save, 
  X, 
  Calendar,
  Tag,
  Filter,
  ArrowLeft,
  Smile,
  Frown,
  Meh,
  Flame
} from 'lucide-react-native';
import JournalEntry from '@/components/journal/JournalEntry';
import { formatDate } from '@/utils/dateUtils';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { JournalEntry as JournalEntryType } from '@/types/gamification';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// Predefined tags
const JOURNAL_TAGS = [
  'Urge',
  'Victory',
  'Struggle',
  'Insight',
  'Trigger',
  'Progress',
  'Relapse',
  'Gratitude',
  'Motivation',
  'Health',
];

// Mood options
const MOOD_OPTIONS = [
  { key: 'great', label: 'Great', icon: Smile, color: '#4CAF50' },
  { key: 'good', label: 'Good', icon: Smile, color: '#8BC34A' },
  { key: 'neutral', label: 'Neutral', icon: Meh, color: '#FFC107' },
  { key: 'bad', label: 'Bad', icon: Meh, color: '#FF9800' },
  { key: 'awful', label: 'Awful', icon: Frown, color: '#F44336' },
];

export default function JournalScreen() {
  const { colors } = useTheme();
  const { addJournalEntry, journalEntries, deleteJournalEntry, streak } = useGamification();
  
  // State for journal writing
  const [isWriting, setIsWriting] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // State for filtering
  const [filterVisible, setFilterVisible] = useState(false);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntryType[]>([]);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: number | null; end: number | null}>({
    start: null,
    end: null
  });
  
  // Animation values
  const entryAnimation = useRef(new Animated.Value(0)).current;
  
  // Loading state for the first render
  const [isLoading, setIsLoading] = useState(true);
  
  // Effect to animate entry form when opened
  useEffect(() => {
    if (isWriting) {
      Animated.timing(entryAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(entryAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isWriting]);
  
  // Effect to filter entries when filters change
  useEffect(() => {
    filterEntries();
  }, [selectedMoodFilter, selectedTagFilter, dateRange, journalEntries]);
  
  // Initial loading
  useEffect(() => {
    setIsLoading(false);
    setFilteredEntries(journalEntries);
  }, []);
  
  // Filter entries based on filters
  const filterEntries = () => {
    let filtered = [...journalEntries];
    
    // Filter by mood
    if (selectedMoodFilter) {
      filtered = filtered.filter(entry => 
        entry.mood === selectedMoodFilter
      );
    }
    
    // Filter by tag
    if (selectedTagFilter) {
      filtered = filtered.filter(entry => 
        entry.tags?.includes(selectedTagFilter)
      );
    }
    
    // Filter by date range
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(entry => 
        entry.timestamp >= dateRange.start! && entry.timestamp <= dateRange.end!
      );
    }
    
    setFilteredEntries(filtered);
  };
  
  // Handle adding entry
  const handleAddEntry = () => {
    if (entryText.trim().length > 0) {
      // Create entry with mood and tags if selected
      const entryWithMeta = {
        content: entryText,
        mood: selectedMood || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined
      };
      
      addJournalEntry(entryText);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reset form
      setEntryText('');
      setSelectedMood('');
      setSelectedTags([]);
      setIsWriting(false);
    }
  };

  const handleCancel = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setEntryText('');
    setSelectedMood('');
    setSelectedTags([]);
    setIsWriting(false);
  };

  // Toggle tag selection
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Toggle mood selection
  const selectMood = (mood: string) => {
    setSelectedMood(prev => prev === mood ? '' : mood);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Reset all filters
  const resetFilters = () => {
    setSelectedMoodFilter(null);
    setSelectedTagFilter(null);
    setDateRange({ start: null, end: null });
    setFilterVisible(false);
  };
  
  // Render a loading state
  if (isLoading) {
  return (
      <SafeAreaView style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Animation styles
  const entryFormStyle = {
    opacity: entryAnimation,
    transform: [
      { translateY: entryAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [50, 0]
      })}
    ]
  };
  
  // Render journal entry form
  const renderEntryForm = () => (
    <Animated.View style={[entryFormStyle, styles.formContainer, { backgroundColor: colors.card }]}>
      <View style={styles.formHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleCancel}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.formTitle, { color: colors.text }]}>New Journal Entry</Text>
        <View style={styles.placeholder} />
      </View>
      
      <LinearGradient
        colors={['rgba(0,0,0,0.03)', 'transparent']}
        style={styles.formGradient}
      >
          <TextInput
            style={[styles.textInput, { color: colors.text, backgroundColor: colors.inputBackground }]}
          placeholder="What's on your mind today?"
            placeholderTextColor={colors.placeholder}
            multiline
            value={entryText}
            onChangeText={setEntryText}
            autoFocus
          />
      </LinearGradient>
      
      {/* Mood selector */}
      <View style={styles.moodSelector}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>How are you feeling?</Text>
        <View style={styles.moodOptions}>
          {MOOD_OPTIONS.map(mood => (
            <TouchableOpacity
              key={mood.key}
              style={[
                styles.moodOption,
                selectedMood === mood.key && { backgroundColor: `${mood.color}20` }
              ]}
              onPress={() => selectMood(mood.key)}
            >
              <mood.icon 
                size={24} 
                color={selectedMood === mood.key ? mood.color : colors.secondaryText}
              />
              <Text 
                style={[
                  styles.moodLabel, 
                  { color: selectedMood === mood.key ? mood.color : colors.secondaryText }
                ]}
              >
                {mood.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Tags selector */}
      <View style={styles.tagSelector}>
        <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>Add tags</Text>
        <View style={styles.tagOptions}>
          {JOURNAL_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagChip,
                { 
                  backgroundColor: selectedTags.includes(tag) 
                    ? `${colors.primary}20` 
                    : colors.cardAlt
                }
              ]}
              onPress={() => toggleTag(tag)}
            >
              <Text 
                style={[
                  styles.tagText, 
                  { 
                    color: selectedTags.includes(tag) 
                      ? colors.primary 
                      : colors.secondaryText 
                  }
                ]}
              >
                {tag}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.saveButton, { backgroundColor: colors.primary }]} 
        onPress={handleAddEntry}
      >
        <Save size={20} color={colors.white} />
        <Text style={styles.buttonText}>Save Entry</Text>
      </TouchableOpacity>
    </Animated.View>
  );
  
  // Render filter modal
  const renderFilterModal = () => (
    <Modal 
      visible={filterVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setFilterVisible(false)}
    >
      <BlurView intensity={30} style={styles.modalOverlay}>
        <View style={[styles.filterModal, { backgroundColor: colors.card }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filter Journal</Text>
            <TouchableOpacity onPress={() => setFilterVisible(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Mood filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.secondaryText }]}>By Mood</Text>
            <View style={styles.moodFilterOptions}>
              {MOOD_OPTIONS.map(mood => (
                <TouchableOpacity
                  key={mood.key}
                  style={[
                    styles.moodFilterOption,
                    selectedMoodFilter === mood.key && { backgroundColor: `${mood.color}20` }
                  ]}
                  onPress={() => setSelectedMoodFilter(prev => prev === mood.key ? null : mood.key)}
                >
                  <mood.icon 
                    size={20} 
                    color={selectedMoodFilter === mood.key ? mood.color : colors.secondaryText}
                  />
                  <Text 
                    style={[
                      styles.moodFilterLabel, 
                      { color: selectedMoodFilter === mood.key ? mood.color : colors.secondaryText }
                    ]}
                  >
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Tag filter */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.secondaryText }]}>By Tag</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagFilterOptions}
            >
              {JOURNAL_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagFilterChip,
                    { 
                      backgroundColor: selectedTagFilter === tag 
                        ? `${colors.primary}20` 
                        : colors.cardAlt
                    }
                  ]}
                  onPress={() => setSelectedTagFilter(prev => prev === tag ? null : tag)}
                >
                  <Text 
                    style={[
                      styles.tagFilterText, 
                      { 
                        color: selectedTagFilter === tag 
                          ? colors.primary 
                          : colors.secondaryText 
                      }
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Date range filter - simplified */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.secondaryText }]}>Time Period</Text>
            <View style={styles.dateFilterOptions}>
              <TouchableOpacity
                style={[
                  styles.dateFilterChip,
                  { 
                    backgroundColor: dateRange.start !== null && dateRange.end === null
                      ? `${colors.primary}20` 
                      : colors.cardAlt
                  }
                ]}
                onPress={() => {
                  const now = Date.now();
                  const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
                  setDateRange({ start: weekAgo, end: now });
                }}
              >
                <Text 
                  style={[
                    styles.dateFilterText, 
                    { 
                      color: dateRange.start !== null
                        ? colors.primary 
                        : colors.secondaryText 
                    }
                  ]}
                >
                  Last 7 days
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.dateFilterChip,
                  { 
                    backgroundColor: dateRange.start !== null && dateRange.end !== null
                      ? `${colors.primary}20` 
                      : colors.cardAlt
                  }
                ]}
                onPress={() => {
                  const now = Date.now();
                  const monthAgo = now - (30 * 24 * 60 * 60 * 1000);
                  setDateRange({ start: monthAgo, end: now });
                }}
              >
                <Text 
                  style={[
                    styles.dateFilterText, 
                    { 
                      color: dateRange.start !== null
                        ? colors.primary 
                        : colors.secondaryText 
                    }
                  ]}
                >
                  Last 30 days
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.filterActions}>
            <TouchableOpacity 
              style={[styles.resetButton, { borderColor: colors.border }]} 
              onPress={resetFilters}
            >
              <Text style={[styles.resetButtonText, { color: colors.secondaryText }]}>Reset</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.applyButton, { backgroundColor: colors.primary }]} 
              onPress={() => setFilterVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
  
  // Main component render
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {isWriting ? (
          renderEntryForm()
      ) : (
        <>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, { color: colors.text }]}>Journal</Text>
                <View style={styles.streakBadge}>
                  <Flame size={14} color={streak > 0 ? "#FF9800" : colors.text} />
                  <Text style={styles.streakCount}>{streak}</Text>
                </View>
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.iconButton, { backgroundColor: colors.cardAlt }]}
                  onPress={() => setFilterVisible(true)}
                >
                  <Filter size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Filter indicators */}
            {(selectedMoodFilter || selectedTagFilter || dateRange.start) && (
              <View style={styles.filterIndicators}>
                <Text style={[styles.filterIndicatorText, { color: colors.secondaryText }]}>
                  Filtered by:
                </Text>
                
                {selectedMoodFilter && (
                  <View style={[styles.filterChip, { backgroundColor: `${colors.primary}20` }]}>
                    <Text style={[styles.filterChipText, { color: colors.primary }]}>
                      {MOOD_OPTIONS.find(m => m.key === selectedMoodFilter)?.label || selectedMoodFilter}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedMoodFilter(null)}>
                      <X size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {selectedTagFilter && (
                  <View style={[styles.filterChip, { backgroundColor: `${colors.primary}20` }]}>
                    <Text style={[styles.filterChipText, { color: colors.primary }]}>
                      {selectedTagFilter}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedTagFilter(null)}>
                      <X size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                
                {dateRange.start && (
                  <View style={[styles.filterChip, { backgroundColor: `${colors.primary}20` }]}>
                    <Text style={[styles.filterChipText, { color: colors.primary }]}>
                      {dateRange.end ? 'Date range' : 'Recent'}
                    </Text>
                    <TouchableOpacity onPress={() => setDateRange({ start: null, end: null })}>
                      <X size={14} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
                
                <TouchableOpacity onPress={resetFilters}>
                  <Text style={[styles.clearFilters, { color: colors.primary }]}>Clear all</Text>
                </TouchableOpacity>
              </View>
            )}
            
          <FlatList
              data={filteredEntries}
              renderItem={({ item }) => (
                <JournalEntry
                  entry={item}
                  onDelete={() => deleteJournalEntry(item.id)}
                />
              )}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={[styles.emptyState, { backgroundColor: colors.cardAlt }]}>
                  <View style={styles.emptyAnimationContainer}>
                    <LottieView
                      source={require('@/assets/animations/empty-journal.json')}
                      autoPlay
                      loop
                      style={styles.emptyAnimation}
                    />
                  </View>
                  
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    Start Your Journal Today
                </Text>
                <Text style={[styles.emptyText, { color: colors.secondaryText }]}>
                    Journaling helps track your progress, identify triggers, and celebrate victories.
                </Text>
                  <TouchableOpacity
                    style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                    onPress={() => setIsWriting(true)}
                  >
                    <PlusCircle size={20} color={colors.white} />
                    <Text style={styles.emptyButtonText}>Write First Entry</Text>
                  </TouchableOpacity>
              </View>
            }
          />
          
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setIsWriting(true)}
          >
            <PlusCircle size={24} color={colors.white} />
          </TouchableOpacity>
            
            {/* Filter modal */}
            {filterVisible && renderFilterModal()}
        </>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streakCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 8,
    marginBottom: 8,
  },
  filterIndicatorText: {
    fontSize: 14,
    marginRight: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 4,
  },
  clearFilters: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  formContainer: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  formGradient: {
    borderRadius: 16,
    marginBottom: 24,
  },
  textInput: {
    height: 150,
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  moodSelector: {
    marginBottom: 20,
  },
  moodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  moodOption: {
    width: '18%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
  },
  moodLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  tagSelector: {
    marginBottom: 24,
  },
  tagOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginTop: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  filterModal: {
    width: width - 48,
    borderRadius: 24,
    padding: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  moodFilterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  moodFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  moodFilterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  tagFilterOptions: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  tagFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  tagFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateFilterOptions: {
    flexDirection: 'row',
  },
  dateFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  dateFilterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  resetButton: {
    flex: 1,
    padding: 14,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    flex: 2,
    padding: 14,
    borderRadius: 16,
    marginLeft: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  emptyState: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyAnimation: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  emptyAnimationContainer: {
    position: 'relative', 
    width: 150,
    height: 150,
  },
});