import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useState } from 'react';
import { formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { JournalEntry as JournalEntryType } from '@/types/gamification';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface JournalEntryProps {
  entry: JournalEntryType;
  onDelete: () => void;
}

export default function JournalEntry({ entry, onDelete }: JournalEntryProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  const toggleExpand = () => setExpanded(!expanded);
  
  const relativeTime = formatRelativeTime(entry.timestamp);
  const fullDate = formatDate(entry.timestamp);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.text }]}>
          {relativeTime}
        </Text>
        <TouchableOpacity
          onPress={toggleExpand}
          style={styles.expandButton}
        >
          {expanded ? (
            <ChevronUp size={20} color={colors.primary} />
          ) : (
            <ChevronDown size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
      
      <Text 
        style={[styles.content, { color: colors.text }]}
        numberOfLines={expanded ? undefined : 3}
      >
        {entry.content}
      </Text>
      
      {expanded && (
        <Animated.View 
          style={styles.footer}
          entering={FadeIn}
          exiting={FadeOut}
        >
          <Text style={[styles.fullDate, { color: colors.secondaryText }]}>
            {fullDate}
          </Text>
          
          <TouchableOpacity 
            onPress={onDelete}
            style={[styles.deleteButton, { backgroundColor: colors.errorLight }]}
          >
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.deleteText, { color: colors.error }]}>
              Delete
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  date: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
  },
  expandButton: {
    padding: 4,
  },
  content: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  fullDate: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  deleteText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    marginLeft: 4,
  }
});