import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { JournalEntry as JournalEntryType } from '@/types/gamification';
import { ChevronDown, ChevronUp, Trash2, Tag, ThumbsUp, Clock, Smile, Meh, Frown } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface JournalEntryProps {
  entry: JournalEntryType;
  onDelete: () => void;
}

export default function JournalEntry({ entry, onDelete }: JournalEntryProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => {
    setExpanded(!expanded);
    
    // Haptic feedback
    Haptics.impactAsync(
      expanded 
        ? Haptics.ImpactFeedbackStyle.Light 
        : Haptics.ImpactFeedbackStyle.Medium
    );
  };
  
  const relativeTime = formatRelativeTime(entry.timestamp);
  const fullDate = formatDate(entry.timestamp);
  
  // Get mood icon based on mood value
  const getMoodIcon = () => {
    switch(entry.mood) {
      case 'great':
      case 'good':
        return <Smile size={16} color="#4CAF50" />;
      case 'neutral':
        return <Meh size={16} color="#FFC107" />;
      case 'bad':
      case 'awful':
        return <Frown size={16} color="#F44336" />;
      default:
        return null;
    }
  };
  
  // Get a nice display name for mood
  const getMoodName = () => {
    switch(entry.mood) {
      case 'great': return 'Great';
      case 'good': return 'Good';
      case 'neutral': return 'Neutral';
      case 'bad': return 'Bad';
      case 'awful': return 'Awful';
      default: return '';
    }
  };

  return (
    <Animated.View 
      style={[styles.container]}
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
    >
      <LinearGradient
        colors={[
          entry.mood === 'great' ? 'rgba(76, 175, 80, 0.08)' : 
          entry.mood === 'good' ? 'rgba(139, 195, 74, 0.08)' :
          entry.mood === 'neutral' ? 'rgba(255, 193, 7, 0.08)' :
          entry.mood === 'bad' ? 'rgba(255, 152, 0, 0.08)' :
          entry.mood === 'awful' ? 'rgba(244, 67, 54, 0.08)' :
          'rgba(0, 0, 0, 0.04)',
          'rgba(0, 0, 0, 0.01)'
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientContainer, { backgroundColor: colors.card }]}
      >
        <Pressable 
          style={[styles.contentContainer, { backgroundColor: colors.card }]}
          onPress={toggleExpand}
          android_ripple={{ color: 'rgba(0, 0, 0, 0.05)', borderless: false }}
        >
      <View style={styles.header}>
            <View style={styles.headerLeft}>
              {entry.mood && getMoodIcon()}
        <Text style={[styles.date, { color: colors.text }]}>
                {relativeTime} {entry.mood && `· Feeling ${getMoodName()}`}
        </Text>
            </View>
            
        <TouchableOpacity
          onPress={toggleExpand}
          style={styles.expandButton}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
        >
          {expanded ? (
                <ChevronUp size={18} color={colors.primary} />
          ) : (
                <ChevronDown size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      
      <Text 
        style={[styles.content, { color: colors.text }]}
        numberOfLines={expanded ? undefined : 3}
      >
        {entry.content}
      </Text>
          
          {entry.tags && entry.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <Tag size={14} color={colors.secondaryText} style={styles.tagIcon} />
              <View style={styles.tagsList}>
                {entry.tags.map((tag, index) => (
                  <View 
                    key={tag} 
                    style={[styles.tag, { backgroundColor: `${colors.primary}10` }]}
                  >
                    <Text style={[styles.tagText, { color: colors.primary }]}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
      
      {expanded && (
        <Animated.View 
          style={styles.footer}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
        >
              <View style={styles.footerDate}>
                <Clock size={14} color={colors.secondaryText} />
          <Text style={[styles.fullDate, { color: colors.secondaryText }]}>
            {fullDate}
          </Text>
              </View>
          
          <TouchableOpacity 
            onPress={onDelete}
                style={[styles.deleteButton, { backgroundColor: `${colors.error}15` }]}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
        </Pressable>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3.84,
    elevation: 2,
  },
  gradientContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  contentContainer: {
    padding: 16,
    borderRadius: 16,
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
    fontWeight: '500',
    marginLeft: 6,
  },
  expandButton: {
    padding: 4,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  tagIcon: {
    marginRight: 6,
  },
  tagsList: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  footerDate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullDate: {
    fontSize: 12,
    marginLeft: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  }
});