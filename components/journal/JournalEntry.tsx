import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable, Modal } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { JournalEntry as JournalEntryType } from '@/types/gamification';
import { ChevronDown, ChevronUp, Trash2, Tag, ThumbsUp, Clock, Smile, Meh, Frown, Mic, AlertCircle } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

interface JournalEntryProps {
  entry: JournalEntryType;
  onDelete: () => void;
}

export default function JournalEntry({ entry, onDelete }: JournalEntryProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
    
    // Haptic feedback
    Haptics.impactAsync(
      expanded 
        ? Haptics.ImpactFeedbackStyle.Light 
        : Haptics.ImpactFeedbackStyle.Medium
    );
  };
  
  const handleDelete = () => {
    setShowConfirmDelete(false);
    onDelete();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };
  
  const relativeTime = formatRelativeTime(entry.timestamp);
  const fullDate = formatDate(entry.timestamp);
  
  const getMoodData = () => {
    switch(entry.mood) {
      case 'great': return { Icon: Smile, color: '#4CAF50', name: 'Great' };
      case 'good': return { Icon: Smile, color: '#8BC34A', name: 'Good' };
      case 'neutral': return { Icon: Meh, color: '#FFC107', name: 'Neutral' };
      case 'bad': return { Icon: Meh, color: '#FF9800', name: 'Bad' };
      case 'awful': return { Icon: Frown, color: '#F44336', name: 'Awful' };
      default: return { Icon: null, color: '#FFFFFF', name: '' };
    }
  };

  const Mood = getMoodData();
  const MoodIcon = Mood.Icon;
  
  // Get background colors based on mood
  const getMoodGradient = () => {
    switch(entry.mood) {
      case 'great': 
        return ['#1F2937', '#0D1B2A'] as const;
      case 'good': 
        return ['#1F2937', '#0D1B2A'] as const;
      case 'neutral': 
        return ['#1F2937', '#0D1B2A'] as const;
      case 'bad': 
        return ['#1F2937', '#0D1B2A'] as const;
      case 'awful': 
        return ['#1F2937', '#0D1B2A'] as const;
      default:
        return ['#1F2937', '#0D1B2A'] as const;
    }
  };

  return (
    <Animated.View 
      style={styles.container}
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
    >
      <LinearGradient colors={getMoodGradient()} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
        <Pressable 
        style={styles.pressableContainer}
          onPress={toggleExpand}
        android_ripple={{ color: 'rgba(255, 255, 255, 0.1)' }}
        >
      <View style={styles.header}>
            <View style={styles.headerLeft}>
            {MoodIcon && <MoodIcon size={20} color={Mood.color} />}
            <View style={{ marginLeft: MoodIcon ? 8 : 0 }}>
              <Text style={styles.date}>
                {fullDate}
              </Text>
              <Text style={styles.relativeTime}>
                {relativeTime}{Mood.name && ` · Feeling ${Mood.name}`}
              </Text>
            </View>
            </View>
          <ChevronDown size={20} color="rgba(255, 255, 255, 0.6)" style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
      </View>
      
      <Text 
          style={styles.content}
        numberOfLines={expanded ? undefined : 3}
      >
        {entry.content}
      </Text>
          
        {expanded ? (
          <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.footer}>
            <View style={styles.tagsContainer}>
              {entry.tags && entry.tags.length > 0 && (
                <>
                  <Tag size={16} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 6 }} />
                  {entry.tags?.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
                </>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowConfirmDelete(true)} style={styles.deleteButton}>
              <Trash2 size={16} color="#F43F5E" />
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          entry.tags && entry.tags.length > 0 && (
            <View style={[styles.tagsContainer, { marginTop: 12 }]}>
              <Tag size={16} color="rgba(255, 255, 255, 0.6)" style={{ marginRight: 6 }} />
              {entry.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
              </View>
              ))}
              {entry.tags.length > 3 && <Text style={{ color: "rgba(255, 255, 255, 0.6)" }}>...</Text>}
            </View>
          )
        )}
      </Pressable>

      <Modal
        visible={showConfirmDelete}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmDelete(false)}
      >
        <BlurView intensity={30} tint="dark" style={styles.confirmOverlay}>
          <View style={styles.confirmDialog}>
            <LinearGradient colors={['#1F2937', '#111827']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />
            <AlertCircle size={24} color="#F43F5E" style={{ marginBottom: 16 }} />
            <Text style={styles.confirmTitle}>Delete Entry?</Text>
            <Text style={styles.confirmText}>
              This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, { borderColor: 'rgba(255, 255, 255, 0.2)' }]}
                onPress={() => setShowConfirmDelete(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: '#F43F5E', borderColor: '#F43F5E' }]}
                onPress={handleDelete}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Delete</Text>
          </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pressableContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  relativeTime: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    marginBottom: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
  },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366F1',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
  },
  deleteText: {
    marginLeft: 6,
    fontWeight: '600',
    color: '#F43F5E',
  },
  // Confirmation Modal Styles
  confirmOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  confirmDialog: {
    width: '80%',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#FFFFFF',
  },
  confirmText: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  confirmButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 6,
  },
});