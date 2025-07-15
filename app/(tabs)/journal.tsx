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
import { isSameDay } from 'date-fns';
import JournalPrompts from '@/components/journal/JournalPrompts';
import WeeklyDigest from '@/components/journal/WeeklyDigest';

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
  const gamification = useGamification();
  
  // State for journal writing
  const [isWriting, setIsWriting] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  
  // State for weekly digest
  const [showDigest, setShowDigest] = useState(false);
  
  // State for filtering
  const [filterVisible, setFilterVisible] = useState(false);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntryType[]>([]);
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string | null>(null);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{start: number | null; end: number | null}>({
    start: null,
    end: null
  });
  
  const [onThisDayEntry, setOnThisDayEntry] = useState<JournalEntryType | null>(null);
  
  // Animation values
  const entryAnimation = useRef(new Animated.Value(0)).current;
  
  // Loading state for the first render
  const [isLoading, setIsLoading] = useState(true);
  
  // Add new state for filter modal
  const [filterType, setFilterType] = useState<'mood' | 'tag' | null>(null);
  
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
    if (gamification?.journalEntries) {
    filterEntries();
    findOnThisDayEntry();
    }
  }, [selectedMoodFilter, selectedTagFilter, dateRange, gamification?.journalEntries]);
  
  // Initial loading
  useEffect(() => {
    const init = async () => {
    setIsLoading(false);
      if (gamification?.journalEntries) {
        setFilteredEntries(gamification.journalEntries);
      findOnThisDayEntry();
      }
    }
    init();
  }, [gamification?.journalEntries]);
  
  // Ensure gamification context is available
  if (!gamification) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  const { addJournalEntry, journalEntries, deleteJournalEntry, streak, lastCheckIn, dailyCheckedIn } = gamification;
  
  const findOnThisDayEntry = () => {
    const today = new Date();
    const pastEntries = journalEntries.filter((entry: JournalEntryType) => {
      const entryDate = new Date(entry.timestamp);
      // Exclude entries from today
      if (isSameDay(today, entryDate)) {
        return false;
      }
      return entryDate.getDate() === today.getDate() && entryDate.getMonth() === today.getMonth();
    });

    if (pastEntries.length > 0) {
      // Find the most recent one from a past year
      pastEntries.sort((a: JournalEntryType, b: JournalEntryType) => b.timestamp - a.timestamp);
      setOnThisDayEntry(pastEntries[0]);
    } else {
      setOnThisDayEntry(null);
    }
  };
  
  // Filter entries based on filters
  const filterEntries = () => {
    let filtered = [...journalEntries];
    
    // Filter by mood
    if (selectedMoodFilter) {
      filtered = filtered.filter((entry: JournalEntryType) => 
        entry.mood === selectedMoodFilter
      );
    }
    
    // Filter by tag
    if (selectedTagFilter) {
      filtered = filtered.filter((entry: JournalEntryType) => 
        entry.tags?.includes(selectedTagFilter)
      );
    }
    
    // Filter by date range
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((entry: JournalEntryType) => 
        entry.timestamp >= dateRange.start! && entry.timestamp <= dateRange.end!
      );
    }
    
    setFilteredEntries(filtered);
  };
  
  // Handle adding entry
  const handleAddEntry = () => {
    const hasValidContent = entryText.trim().length > 0 || selectedMood;
    
    if (hasValidContent) {
      // Create entry with mood, tags, and prompt
      const entryOptions = {
        mood: selectedMood || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        prompt: selectedPrompt || undefined,
      };
      
      addJournalEntry(entryText, entryOptions);
      
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Reset form
      setEntryText('');
      setSelectedMood('');
      setSelectedTags([]);
      setSelectedPrompt('');
      setIsWriting(false);
    }
  };

  const handleCancel = () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setEntryText('');
    setSelectedMood('');
    setSelectedTags([]);
    setSelectedPrompt('');
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
    setSelectedMood(mood);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const resetFilters = () => {
    setSelectedMoodFilter(null);
    setSelectedTagFilter(null);
    setDateRange({ start: null, end: null });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handleFilterPress = (type: 'mood' | 'tag') => {
    setFilterType(type);
    setFilterVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handleSelectFilter = (value: string) => {
    if (filterType === 'mood') {
      setSelectedMoodFilter(value);
    } else if (filterType === 'tag') {
      setSelectedTagFilter(value);
    }
    setFilterVisible(false);
    setFilterType(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Check if a date is within the current streak
  const isStreakDay = (date: Date | null) => {
    if (!date || !gamification) return false; // Ensure gamification context is available
    
    // We'll rely on the simple 'streak' value from gamification context for daily check-in visualization.
    const checkinDate = new Date(lastCheckIn || 0);
    return isSameDay(date, checkinDate) && dailyCheckedIn;
  };

  const renderOnThisDay = () => {
    if (!onThisDayEntry) return null;
    
    const date = new Date(onThisDayEntry.timestamp);
    const yearsAgo = new Date().getFullYear() - date.getFullYear();
    
    return (
      <View style={styles.onThisDayContainer}>
        <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <View style={styles.onThisDayHeader}>
          <Calendar size={24} color="#EC4899" />
          <Text style={styles.onThisDayTitle}>
            {yearsAgo === 1 ? '1 year ago today' : `${yearsAgo} years ago today`}
          </Text>
        </View>
        <Text style={styles.onThisDayContent} numberOfLines={3}>
          {onThisDayEntry.content}
        </Text>
        <TouchableOpacity 
          style={{ paddingHorizontal: 15, paddingBottom: 15, flexDirection: 'row', alignItems: 'center' }}
          onPress={() => {
            // Scroll to this entry in the list
            const index = filteredEntries.findIndex(e => e.id === onThisDayEntry?.id);
            if (index >= 0) {
              // TODO: Implement scrolling to the specific entry
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
          }}
        >
          <Text style={styles.onThisDayLink}>View full entry</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Render entry form
  const renderEntryForm = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.formContainer}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      <LinearGradient colors={['#121212', '#000000']} style={StyleSheet.absoluteFillObject} />
        <View style={[styles.formHeader, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleCancel}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.formTitle, { color: '#FFFFFF' }]}>New Journal Entry</Text>
          <TouchableOpacity 
            style={[styles.headerButton, { opacity: entryText.trim().length > 0 || selectedMood ? 1 : 0.5 }]} 
            onPress={handleAddEntry}
            disabled={!entryText.trim().length && !selectedMood}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Save size={24} color="#6366F1" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.formScrollView} 
          contentContainerStyle={{ paddingVertical: 20 }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <JournalPrompts onSelectPrompt={setSelectedPrompt} selectedPrompt={selectedPrompt} />
          
          <BlurView intensity={10} tint="dark" style={[styles.inputContainer, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <TextInput
              style={[styles.input, { color: '#FFFFFF', backgroundColor: 'transparent' }]}
              placeholder="What's on your mind?"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              multiline
              value={entryText}
              onChangeText={setEntryText}
              autoFocus
            />
          </BlurView>
          
          <Text style={styles.sectionTitle}>How are you feeling?</Text>
          <View style={styles.moodSelector}>
            {MOOD_OPTIONS.map((mood) => {
              const MoodIcon = mood.icon;
              const isSelected = selectedMood === mood.key;
              
              return (
                <TouchableOpacity
                  key={mood.key}
                  style={[
                    styles.moodButton,
                    { 
                      backgroundColor: isSelected ? `${mood.color}30` : 'rgba(255, 255, 255, 0.05)',
                      borderWidth: 1,
                      borderColor: isSelected ? mood.color : 'transparent'
                    }
                  ]}
                  onPress={() => selectMood(mood.key)}
                  activeOpacity={0.7}
                >
                  <MoodIcon size={24} color={mood.color} />
                  <Text style={[styles.moodLabel, { color: isSelected ? mood.color : '#AAAAAA' }]}>
                    {mood.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          <View style={styles.tagSelector}>
            <View style={styles.tagHeader}>
              <Tag size={20} color="#6366F1" />
              <Text style={[styles.tagTitle, { color: '#FFFFFF' }]}>Tags</Text>
            </View>
            
            <View style={styles.tagContainer}>
              {JOURNAL_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.tag,
                    { 
                      backgroundColor: selectedTags.includes(tag) ? '#6366F130' : 'rgba(255, 255, 255, 0.05)',
                      borderColor: selectedTags.includes(tag) ? '#6366F1' : 'rgba(255, 255, 255, 0.1)'
                    }
                  ]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text 
                    style={{ 
                      color: selectedTags.includes(tag) ? '#6366F1' : '#AAAAAA',
                      fontWeight: '600'
                    }}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, { opacity: entryText.trim().length > 0 || selectedMood ? 1 : 0.5 }]}
            onPress={handleAddEntry}
            disabled={!entryText.trim().length && !selectedMood}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.saveButtonGradient}>
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
    </KeyboardAvoidingView>
  );
  
  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={filterVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setFilterVisible(false);
        setFilterType(null);
      }}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => {
          setFilterVisible(false);
          setFilterType(null);
        }}
      >
        <BlurView intensity={30} tint="dark" style={styles.filterModalContainer}>
          <View style={styles.filterModal}>
            <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>
                {filterType === 'mood' ? 'Filter by Mood' : 'Filter by Tag'}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setFilterVisible(false);
                  setFilterType(null);
                }}
                style={styles.closeButton}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.filterOptionsContainer}>
              {filterType === 'mood' && MOOD_OPTIONS.map(mood => (
                      <TouchableOpacity
                        key={mood.key}
                  style={[styles.filterOption, selectedMoodFilter === mood.key && styles.selectedFilterOption]}
                        onPress={() => handleSelectFilter(mood.key)}
                >
                  <Text style={styles.filterOptionText}>{mood.label}</Text>
                      </TouchableOpacity>
              ))}
              {filterType === 'tag' && JOURNAL_TAGS.map(tag => (
                      <TouchableOpacity
                        key={tag}
                  style={[styles.filterOption, selectedTagFilter === tag && styles.selectedFilterOption]}
                        onPress={() => handleSelectFilter(tag)}
                >
                  <Text style={styles.filterOptionText}>{tag}</Text>
                      </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
  
  const renderJournalList = () => {
  return (
      <View style={{ flex: 1 }}>
            {/* Tabs for filtering */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tab, !selectedMoodFilter && !selectedTagFilter && styles.activeTab]} 
                onPress={resetFilters}
              >
                <BookOpen size={20} color={!selectedMoodFilter && !selectedTagFilter ? '#FFFFFF' : '#AAAAAA'} />
                <Text style={[styles.tabText, !selectedMoodFilter && !selectedTagFilter && styles.activeTabText]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, selectedMoodFilter && styles.activeTab]} 
                onPress={() => handleFilterPress('mood')}
              >
                <Smile size={20} color={selectedMoodFilter ? '#FFFFFF' : '#AAAAAA'} />
                <Text style={[styles.tabText, selectedMoodFilter && styles.activeTabText]}>By Mood</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, selectedTagFilter && styles.activeTab]} 
                onPress={() => handleFilterPress('tag')}
              >
                <Tag size={20} color={selectedTagFilter ? '#FFFFFF' : '#AAAAAA'} />
                <Text style={[styles.tabText, selectedTagFilter && styles.activeTabText]}>By Tag</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              ListHeaderComponent={renderOnThisDay}
              data={filteredEntries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <JournalEntry entry={item} onDelete={() => deleteJournalEntry(item.id)} />}
              contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 16 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyJournalContainer}>
                  <BlurView intensity={20} tint="dark" style={styles.emptyBlurContainer}>
                    <BookOpen size={40} color="rgba(255, 255, 255, 0.5)" />
                    <Text style={styles.emptyJournalText}>
                      Your journal is a safe space. Start writing.
                    </Text>
                  </BlurView>
                </View>
              }
            />
        <TouchableOpacity 
          style={styles.addEntryButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setIsWriting(true);
          }}
        >
                <PlusCircle size={24} color={'white'} />
            </TouchableOpacity>
        </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A0A0A', '#1A1A1A', '#0A0A0A']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {showDigest ? (
          <WeeklyDigest onBack={() => setShowDigest(false)} />
        ) : isWriting ? (
          renderEntryForm()
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Journal</Text>
              <TouchableOpacity
                onPress={() => setShowDigest(true)}
                style={styles.digestButton}
              >
                <BookOpen size={24} color={colors.text} />
                <Text style={styles.digestButtonText}>Weekly Pulse</Text>
              </TouchableOpacity>
            </View>
            {renderJournalList()}
          </View>
        )}

        {filterVisible && renderFilterModal()}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  digestButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  digestButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#6366F1',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  onThisDayContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    marginHorizontal: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  onThisDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  onThisDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EC4899',
    marginLeft: 10,
  },
  onThisDayContent: {
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 10,
    lineHeight: 22,
  },
  onThisDayLink: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  emptyJournalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 200,
  },
  emptyBlurContainer: {
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
  },
  emptyJournalText: {
    marginTop: 15,
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
  },
  addEntryButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  formContainer: {
    flex: 1,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  formScrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputContainer: {
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    minHeight: 120,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  moodSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: '48%',
  },
  moodLabel: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '600',
  },
  tagSelector: {
    marginBottom: 20,
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tagTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 10,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
  },
  saveButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#000000',
  },
  saveButton: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '90%',
    maxHeight: '80%',
  },
  filterModal: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 5,
  },
  filterOptionsContainer: {
    paddingBottom: 10,
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedFilterOption: {
    backgroundColor: '#6366F1',
  },
  filterOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});