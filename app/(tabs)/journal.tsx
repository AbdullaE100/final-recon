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
import { generateWeeklyDigest, WeeklyDigestData } from '@/utils/journalInsights';

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
  const { addJournalEntry, journalEntries, deleteJournalEntry, streak, persistentStreak, streakStartDates, relapseDates } = useGamification();
  
  // State for journal writing
  const [isWriting, setIsWriting] = useState(false);
  const [entryText, setEntryText] = useState('');
  const [selectedMood, setSelectedMood] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  
  // State for weekly digest
  const [showDigest, setShowDigest] = useState(false);
  const [digestData, setDigestData] = useState<WeeklyDigestData | null>(null);
  const [isDigestLoading, setIsDigestLoading] = useState(true);
  const [entriesNeeded, setEntriesNeeded] = useState(3);
  
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
    filterEntries();
    findOnThisDayEntry();
  }, [selectedMoodFilter, selectedTagFilter, dateRange, journalEntries]);
  
  // Initial loading
  useEffect(() => {
    const init = async () => {
    setIsLoading(false);
    setFilteredEntries(journalEntries);
      findOnThisDayEntry();
      
      const digest = await generateWeeklyDigest(journalEntries);
      setDigestData(digest);
      
      if (!digest) {
        const needed = 3 - journalEntries.filter(e => new Date(e.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length;
        setEntriesNeeded(needed > 0 ? needed : 0);
      }
      
      setIsDigestLoading(false);
    }
    init();
  }, [journalEntries]);
  
  const findOnThisDayEntry = () => {
    const today = new Date();
    const pastEntries = journalEntries.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      // Exclude entries from today
      if (isSameDay(today, entryDate)) {
        return false;
      }
      return entryDate.getDate() === today.getDate() && entryDate.getMonth() === today.getMonth();
    });

    if (pastEntries.length > 0) {
      // Find the most recent one from a past year
      pastEntries.sort((a, b) => b.timestamp - a.timestamp);
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
  
  // Handle filter selection
  const handleFilterPress = (type: 'mood' | 'tag') => {
    // If the same filter type is already selected, clear it
    if ((type === 'mood' && selectedMoodFilter) || (type === 'tag' && selectedTagFilter)) {
      if (type === 'mood') {
        setSelectedMoodFilter(null);
      } else {
        setSelectedTagFilter(null);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    
    // Otherwise show the filter modal
    setFilterType(type);
    setFilterVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handleSelectFilter = (value: string) => {
    if (filterType === 'mood') {
      // Toggle off if selecting the same mood filter
      setSelectedMoodFilter(prevMood => prevMood === value ? null : value);
    } else if (filterType === 'tag') {
      // Toggle off if selecting the same tag filter
      setSelectedTagFilter(prevTag => prevTag === value ? null : value);
    }
    setFilterVisible(false);
    setFilterType(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  // Check if a date is within the current streak
  const isStreakDay = (date: Date | null) => {
    if (!date) return false;
    
    // Normalize date for comparison
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    // Get today's date normalized
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // If we have a persistent streak, calculate the start date
    if (persistentStreak > 0) {
      // Get the streak data from context/storage
      const calculatedStartTime = today.getTime() - ((persistentStreak - 1) * 24 * 60 * 60 * 1000);
      const calculatedStart = new Date(calculatedStartTime);
      calculatedStart.setHours(0, 0, 0, 0);
      
      // If the date is between the calculated start date and today (inclusive), it's a streak day
      return normalizedDate >= calculatedStart && normalizedDate <= today;
    }
    
    // If no active streak, check historical streaks
    for (let i = 0; i < streakStartDates.length; i++) {
      const startDate = new Date(streakStartDates[i]);
      startDate.setHours(0, 0, 0, 0);
      
      // Find the next relapse or start date after this start date
      const nextRelapse = relapseDates
        .find(d => {
          const rd = new Date(d);
          rd.setHours(0, 0, 0, 0);
          return rd > startDate;
        });
      
      const nextStart = streakStartDates
        .find(d => {
          const sd = new Date(d);
          sd.setHours(0, 0, 0, 0);
          return sd > startDate && !isSameDay(sd, startDate);
        });
      
      // Determine the end date of this streak
      let streakEnd = today;
      if (nextRelapse && (!nextStart || nextRelapse < nextStart)) {
        streakEnd = new Date(nextRelapse);
      } else if (nextStart && (!nextRelapse || nextStart < nextRelapse)) {
        streakEnd = new Date(nextStart);
      }
      
      streakEnd.setHours(0, 0, 0, 0);
      
      // Check if the date falls within this streak period
      if (normalizedDate >= startDate && normalizedDate <= streakEnd) {
        return true;
      }
    }
    
    return false;
  };
  
  // Render a loading state
  if (isLoading) {
  return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
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
  
  // Render "On This Day" memory
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
      <SafeAreaView style={{ flex: 1 }}>
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
      </SafeAreaView>
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
            
            <ScrollView style={styles.filterContent}>
              {filterType === 'mood' && (
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    ]}
                    onPress={() => {
                      setSelectedMoodFilter(null);
                      setFilterVisible(false);
                      setFilterType(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <X size={24} color="#FFFFFF" />
                      <Text style={[styles.filterOptionText, { color: '#FFFFFF' }]}>
                        Clear Filter
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {MOOD_OPTIONS.map((mood) => {
                    const MoodIcon = mood.icon;
                    const isSelected = selectedMoodFilter === mood.key;
                    
                    return (
                      <TouchableOpacity
                        key={mood.key}
                        style={[
                          styles.filterOption,
                          { 
                            backgroundColor: isSelected ? `${mood.color}30` : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isSelected ? mood.color : 'rgba(255, 255, 255, 0.1)'
                          }
                        ]}
                        onPress={() => handleSelectFilter(mood.key)}
                        activeOpacity={0.7}
                      >
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <MoodIcon size={24} color={mood.color} />
                          <Text style={[styles.filterOptionText, { color: isSelected ? mood.color : '#FFFFFF' }]}>
                            {mood.label}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedFilterIndicator}>
                            <Text style={styles.selectedFilterText}>Selected</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              
              {filterType === 'tag' && (
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      { 
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                      }
                    ]}
                    onPress={() => {
                      setSelectedTagFilter(null);
                      setFilterVisible(false);
                      setFilterType(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <X size={24} color="#FFFFFF" />
                      <Text style={[styles.filterOptionText, { color: '#FFFFFF' }]}>
                        Clear Filter
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {JOURNAL_TAGS.map((tag) => {
                    const isSelected = selectedTagFilter === tag;
                    
                    return (
                      <TouchableOpacity
                        key={tag}
                        style={[
                          styles.filterOption,
                          { 
                            backgroundColor: isSelected ? '#6366F130' : 'rgba(255, 255, 255, 0.05)',
                            borderColor: isSelected ? '#6366F1' : 'rgba(255, 255, 255, 0.1)'
                          }
                        ]}
                        onPress={() => handleSelectFilter(tag)}
                        activeOpacity={0.7}
                      >
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Tag size={20} color={isSelected ? '#6366F1' : '#FFFFFF'} />
                          <Text style={[styles.filterOptionText, { color: isSelected ? '#6366F1' : '#FFFFFF' }]}>
                            {tag}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={styles.selectedFilterIndicator}>
                            <Text style={styles.selectedFilterText}>Selected</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
  
  // Main journal screen
  const renderJournalList = () => {
  return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <LinearGradient colors={['#121212', '#000000']} style={StyleSheet.absoluteFillObject} />

        {isWriting ? (
          renderEntryForm()
        ) : (
          <View style={{flex: 1}}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Journal</Text>
              {isDigestLoading ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : digestData ? (
                <TouchableOpacity onPress={() => setShowDigest(true)} style={styles.digestButton}>
                  <Text style={styles.digestButtonText}>Weekly Digest</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.digestButtonDisabled}>
                  <Text style={styles.digestButtonTextDisabled}>Weekly Digest</Text>
                  <Text style={styles.digestSubTextDisabled}>
                    {entriesNeeded > 0 ? `${entriesNeeded} more entries this week` : `Come back next week`}
                  </Text>
                </View>
              )}
            </View>

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
            <TouchableOpacity style={styles.addEntryButton} onPress={() => setIsWriting(true)}>
              <LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.gradientButton}>
                <PlusCircle size={24} color={'white'} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
        </View>
    );
  };

  if (showDigest && digestData) {
    return <WeeklyDigest onBack={() => setShowDigest(false)} digestData={digestData} />;
  }

  return renderJournalList();
}

// Update styles
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
  },
  digestButtonDisabled: {
    alignItems: 'flex-end',
  },
  digestButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  digestButtonTextDisabled: {
    color: '#A1A1AA',
    fontWeight: 'bold',
    fontSize: 16,
  },
  digestSubTextDisabled: {
    color: '#71717A',
    fontSize: 12,
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
  addEntryButton: {
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
  gradientButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onThisDayContainer: {
    marginHorizontal: 0,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  onThisDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 15,
  },
  onThisDayTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onThisDayContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingBottom: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  onThisDayLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  emptyJournalContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyBlurContainer: {
    width: '100%',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyJournalText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    marginTop: Platform.OS === 'ios' ? 0 : 40,
  },
  headerButton: {
    padding: 12,
    borderRadius: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  formScrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 24,
  },
  input: {
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#FFFFFF',
  },
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  moodButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    flex: 1,
  },
  moodLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
  },
  tagSelector: {
    marginBottom: 24,
  },
  tagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tagTitle: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '700',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  saveButtonContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    backgroundColor: 'transparent',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  filterModal: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  filterContent: {
    padding: 20,
  },
  filterOptions: {
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  filterOptionText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedFilterIndicator: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});