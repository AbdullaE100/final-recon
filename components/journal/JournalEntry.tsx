import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Pressable } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { JournalEntry as JournalEntryType } from '@/types/gamification';
import { ChevronDown, ChevronUp, Trash2, Tag, ThumbsUp, Clock, Smile, Meh, Frown, Mic } from 'lucide-react-native';
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
  
  // Get background color based on mood
  const getMoodGradient = () => {
    switch(entry.mood) {
      case 'great': 
        return ['rgba(76, 175, 80, 0.12)', 'rgba(76, 175, 80, 0.03)'] as const;
      case 'good': 
        return ['rgba(139, 195, 74, 0.12)', 'rgba(139, 195, 74, 0.03)'] as const;
      case 'neutral': 
        return ['rgba(255, 193, 7, 0.12)', 'rgba(255, 193, 7, 0.03)'] as const;
      case 'bad': 
        return ['rgba(255, 152, 0, 0.12)', 'rgba(255, 152, 0, 0.03)'] as const;
      case 'awful': 
        return ['rgba(244, 67, 54, 0.12)', 'rgba(244, 67, 54, 0.03)'] as const;
      default:
        return ['rgba(33, 150, 243, 0.08)', 'rgba(33, 150, 243, 0.02)'] as const;
    }
  };

  return (
    <Animated.View 
      style={[styles.container]}
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
    >
      <LinearGradient
        colors={getMoodGradient()}
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
                    style={[styles.tag, { backgroundColor: `${colors.primary}15` }]}
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
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gradientContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.05)',
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
  audioIndicator: {
    backgroundColor: 'rgba(0, 120, 255, 0.1)',
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  expandButton: {
    padding: 4,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  audioPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
  },
  audioPreviewText: {
    fontSize: 13,
    marginLeft: 6,
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