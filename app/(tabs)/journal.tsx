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
  ScrollView,
  Keyboard
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
  BookOpen
} from 'lucide-react-native';
import JournalEntry from '@/components/journal/JournalEntry';
import { formatDate } from '@/utils/dateUtils';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { JournalEntry as JournalEntryType } from '@/types/gamification';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

// Predefined tags
const JOURNAL_TAGS = [
  'Reflection', 
  'Challenge', 
  'Trigger', 
  'Success', 
  'Motivation', 
  'Learning',
  'Feelings',
  'Goal'
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
    const hasValidContent = entryText.trim().length > 0 || selectedMood;
    
    if (hasValidContent) {
      // Create entry with mood and tags
      const entryOptions = {
        mood: selectedMood || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      };
      
      addJournalEntry(entryText, entryOptions);
      
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
    
    // Dismiss keyboard when mood is selected
    Keyboard.dismiss();
    
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
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
            placeholderTextColor={colors.secondaryText}
            multiline
            value={entryText}
            onChangeText={setEntryText}
            autoFocus
          />
          
          {/* Mood selector */}
          <View style={styles.moodSelector}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>How are you feeling?</Text>
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
                    size={20} 
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
          
          {/* Tags */}
          <View style={styles.tagsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Add tags (optional)</Text>
            <View style={styles.tagsList}>
              {JOURNAL_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tagOption,
                    { 
                      backgroundColor: selectedTags.includes(tag) 
                        ? `${colors.primary}20` 
                        : colors.inputBackground
                    }
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text 
                    style={[
                      styles.tagLabel, 
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
          
          {/* Action buttons */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={[
                styles.actionButton, 
                styles.saveButton, 
                { 
                  backgroundColor: colors.primary,
                  opacity: !entryText.trim() && !selectedMood ? 0.5 : 1
                }
              ]}
              onPress={handleAddEntry}
              disabled={!entryText.trim() && !selectedMood}
            >
              <Text style={styles.saveButtonText}>
                Save Entry
              </Text>
            </TouchableOpacity>
          </View>
      </LinearGradient>
    </Animated.View>
    </KeyboardAvoidingView>
  );
  
  // Main journal screen
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="auto" />
      
      {!isWriting ? (
        <>
          <View style={styles.header}>
            <LinearGradient
              colors={['rgba(33, 150, 243, 0.05)', 'transparent']}
              style={styles.headerGradient}
            >
              <View style={styles.headerTitleRow}>
                <View style={styles.headerTitleContainer}>
                  <BookOpen size={24} color={colors.primary} style={styles.headerIcon} />
                  <Text style={[styles.headerTitle, { color: colors.text }]}>Journal</Text>
                </View>
                
                <View style={styles.headerRight}>
                  <TouchableOpacity
                    style={[styles.filterButton, { backgroundColor: colors.background }]}
                    onPress={() => setFilterVisible(true)}
                  >
                    <Filter size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.journalDescription, { color: colors.secondaryText }]}>
                Track your journey, reflect on your progress
              </Text>
            </LinearGradient>
          </View>
          
          {/* Journal entries list */}
          {filteredEntries.length > 0 ? (
            <FlatList
              data={filteredEntries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <JournalEntry
                  entry={item}
                  onDelete={() => deleteJournalEntry(item.id)}
                />
              )}
              contentContainerStyle={styles.entriesList}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Calendar size={64} color={colors.secondaryText} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Journal Entries Yet
              </Text>
              <Text style={[styles.emptyDescription, { color: colors.secondaryText }]}>
                Start journaling to track your progress and emotions
              </Text>
              
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => setIsWriting(true)}
              >
                <PlusCircle size={20} color="#FFFFFF" />
                <Text style={styles.emptyButtonText}>Create First Entry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* New entry button */}
          {filteredEntries.length > 0 && (
            <TouchableOpacity 
              style={[styles.newEntryButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsWriting(true)}
              activeOpacity={0.8}
            >
              <View style={styles.newEntryButtonInner}>
                <PlusCircle size={24} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}

          {/* Filter modal */}
          <Modal
            visible={filterVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setFilterVisible(false)}
          >
            {renderFilterModal()}
          </Modal>
        </>
      ) : (
        // Journal entry form
        renderEntryForm()
      )}
    </SafeAreaView>
  );
  
  // Render filter modal
  function renderFilterModal() {
    return (
      <BlurView 
        style={styles.modalOverlay}
        intensity={Platform.OS === 'ios' ? 10 : 20}
        tint="dark"
      >
        <View style={[styles.filterModal, { backgroundColor: colors.card }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filter Journal</Text>
            <TouchableOpacity onPress={() => setFilterVisible(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.resetButton, { 
              borderColor: colors.border,
              backgroundColor: colors.background
            }]}
            onPress={resetFilters}
          >
            <Text style={[styles.resetButtonText, { color: colors.text }]}>Reset Filters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.applyButton, { backgroundColor: colors.primary }]}
            onPress={() => setFilterVisible(false)}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    );
  }
}

// Update styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 16,
  },
  headerGradient: {
    paddingVertical: 16,
    borderRadius: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journalDescription: {
    fontSize: 16,
    opacity: 0.8,
    marginTop: 4,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  entriesList: {
    paddingBottom: 100,
  },
  emptyState: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyStateIcon: {
    marginBottom: 24,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginHorizontal: 40,
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  newEntryButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  newEntryButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 16,
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
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  audioPreviewText: {
    marginLeft: 8,
    flex: 1,
    fontSize: 14,
  },
  removeAudioButton: {
    padding: 4,
  },
  recordButton: {
    flex: 1,
    marginRight: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 32,
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
  resetButton: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  applyButton: {
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  }
});