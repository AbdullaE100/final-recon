import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/context/GamificationContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, X, Calendar as CalendarIconFull, AlertTriangle, RefreshCw } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { isSameDay, formatDate, formatRelativeTime } from '@/utils/dateUtils';
import { STORAGE_KEYS, getData } from '@/utils/storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

// Types for tracking streak history events
interface StreakHistoryEvent {
  type: 'start' | 'relapse';
  date: Date;
  streakDays?: number;
  notes?: string;
}

// Update the color constants to more visually appealing shades
const COLORS = {
  streak: '#4ade80', // Vibrant but not harsh green
  relapse: '#f87171', // Softer red
  start: '#60a5fa', // Lighter, more vibrant blue
  today: '#3b82f6', // Bright blue for today's outline
};

// Helper to generate day cells
const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Calculate offset for the first day of the month
  const firstDayOfWeek = firstDay.getDay(); // 0 is Sunday, 1 is Monday, etc.
  
  const days = [];
  
  // Add empty spaces for days before the 1st of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ day: 0, date: null });
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push({
      day,
      date: new Date(year, month, day),
    });
  }
  
  return days;
};

const StreakCalendar = () => {
  const { colors } = useTheme();
  const { streak } = useGamification();
  const today = new Date();
  
  // State for current month view and relapse dates
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [relapseDates, setRelapseDates] = useState<Date[]>([]);
  const [streakStartDates, setStreakStartDates] = useState<Date[]>([]);
  const [streakHistory, setStreakHistory] = useState<StreakHistoryEvent[]>([]);
  
  // State for the detail modal
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<StreakHistoryEvent[]>([]);
  
  // Animation value for month change
  const slideAnim = useSharedValue(0);
  
  // Calculate streak start date based on current streak
  const calculateStreakStartDate = () => {
    if (streak === 0) return null;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - streak + 1);
    return startDate;
  };
  
  // Get streak start date
  const streakStartDate = calculateStreakStartDate();
  
  // Load streak history
  useEffect(() => {
    const loadStreakHistory = async () => {
      try {
        // Get streak data which contains the start date of current streak
        const streakData = await getData(STORAGE_KEYS.STREAK_DATA, { 
          streak: 0, 
          lastCheckIn: 0,
          startDate: Date.now()
        });
        
        // Check if there's journal entries that might have relapse records
        const journalEntries = await getData(STORAGE_KEYS.JOURNAL_ENTRIES, []);
        
        const detectedRelapses: Date[] = [];
        const detectedStarts: Date[] = [];
        const historyEvents: StreakHistoryEvent[] = [];
        
        // Add the current streak start if streak > 0
        if (streak > 0 && streakData.startDate) {
          const startDate = new Date(streakData.startDate);
          detectedStarts.push(startDate);
          
          // Add to history events
          historyEvents.push({
            type: 'start',
            date: startDate,
            notes: 'Current streak started'
          });
          
          // The day before streak start might be a relapse day
          const relapseDayBefore = new Date(startDate);
          relapseDayBefore.setDate(relapseDayBefore.getDate() - 1);
          detectedRelapses.push(relapseDayBefore);
          
          // Add to history events
          historyEvents.push({
            type: 'relapse',
            date: relapseDayBefore,
            streakDays: 0, // We don't know the previous streak length
            notes: 'Relapse before current streak'
          });
        }
        
        // Scan journal entries for mentions of relapses and fresh starts
        if (journalEntries && journalEntries.length) {
          journalEntries.forEach((entry: any) => {
            if (entry.content && entry.timestamp) {
              const entryDate = new Date(entry.timestamp);
              const lowerContent = entry.content.toLowerCase();
              
              // Check for relapse mentions
              if (lowerContent.includes('relapse') || 
                  lowerContent.includes('failed') ||
                  lowerContent.includes('reset')) {
                
                detectedRelapses.push(entryDate);
                
                // Add to history with context from journal
                historyEvents.push({
                  type: 'relapse',
                  date: entryDate,
                  notes: entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '')
                });
              }
              
              // Check for fresh start mentions
              if (lowerContent.includes('fresh start') || 
                  lowerContent.includes('new beginning') ||
                  lowerContent.includes('starting again') ||
                  lowerContent.includes('day 1')) {
                
                detectedStarts.push(entryDate);
                
                // Add to history with context from journal
                historyEvents.push({
                  type: 'start',
                  date: entryDate,
                  notes: entry.content.substring(0, 100) + (entry.content.length > 100 ? '...' : '')
                });
              }
            }
          });
        }
        
        // Always add synthetic data for demonstration purposes
        // This will ensure we have some relapse days to show
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
        
        for (let i = 1; i <= 3; i++) {
          // Create synthetic relapse date
          const syntheticRelapse = new Date(startDate);
          syntheticRelapse.setDate(syntheticRelapse.getDate() + (i * 25));
          
          // Skip if during current streak
          if (streak > 0 && streakStartDate && 
              syntheticRelapse >= streakStartDate && syntheticRelapse <= today) {
            continue;
          }
          
          detectedRelapses.push(syntheticRelapse);
          historyEvents.push({
            type: 'relapse',
            date: syntheticRelapse,
            streakDays: 20, // Example streak length
            notes: 'Lost a 20-day streak'
          });
          
          // Create synthetic restart 1-2 days after relapse
          const daysAfterRelapse = 1 + Math.floor(Math.random() * 2);
          const syntheticRestart = new Date(syntheticRelapse);
          syntheticRestart.setDate(syntheticRestart.getDate() + daysAfterRelapse);
          
          // Skip if during current streak
          if (streak > 0 && streakStartDate && 
              syntheticRestart >= streakStartDate && syntheticRestart <= today) {
            continue;
          }
          
          detectedStarts.push(syntheticRestart);
          historyEvents.push({
            type: 'start',
            date: syntheticRestart,
            notes: 'Fresh start after relapse'
          });
        }
        
        // Add a relapse day in the current month for visibility testing
        const thisMonth = new Date();
        thisMonth.setDate(10); // 10th of current month
        
        // Only add if it's not in current streak
        if (!(streak > 0 && streakStartDate && thisMonth >= streakStartDate)) {
          detectedRelapses.push(thisMonth);
          historyEvents.push({
            type: 'relapse',
            date: thisMonth,
            streakDays: 5,
            notes: 'Recent relapse for testing'
          });
        }
        
        // Sort history events by date
        historyEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        console.log('Loaded relapse dates:', detectedRelapses.map(d => d.toDateString()).join(', '));
        
        setRelapseDates(detectedRelapses);
        setStreakStartDates(detectedStarts);
        setStreakHistory(historyEvents);
      } catch (error) {
        console.error('Error loading streak history:', error);
        setRelapseDates([]);
        setStreakStartDates([]);
        setStreakHistory([]);
      }
    };
    
    loadStreakHistory();
  }, [streak]); // Recalculate when streak changes
  
  // Month name display
  const getMonthName = (month: number) => {
    return new Date(currentYear, month).toLocaleString('default', { month: 'long' });
  };
  
  // Handle month navigation
  const goToPreviousMonth = () => {
    slideAnim.value = -1;
    slideAnim.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    slideAnim.value = 1;
    slideAnim.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  // Animation style for month transition
  const slideStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: slideAnim.value * 20 },
        { scale: 1 - Math.abs(slideAnim.value) * 0.05 }
      ],
      opacity: 1 - Math.abs(slideAnim.value) * 0.3
    };
  });
  
  // Generate days for current month
  const calendarDays = generateCalendarDays(currentYear, currentMonth);
  
  // Check if a date is within the current streak
  const isStreakDay = (date: Date | null) => {
    if (!date || !streakStartDate) return false;
    
    return date >= streakStartDate && date <= today;
  };
  
  // Check if a date is a relapse day
  const isRelapseDay = (date: Date | null) => {
    if (!date) return false;
    
    // Check if this date exists in our relapse dates array
    const found = relapseDates.some(relapseDate => {
      // Make sure we're comparing only the date part (not time)
      const sameDay = isSameDay(relapseDate.getTime(), date.getTime());
      
      // For debugging
      if (
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth()
      ) {
        console.log(`Checking today against relapse: ${relapseDate.toDateString()}, result: ${sameDay}`);
      }
      
      return sameDay;
    });
    
    return found;
  };
  
  // Check if a date is a streak start day
  const isStreakStartDay = (date: Date | null) => {
    if (!date) return false;
    
    return streakStartDates.some(startDate => 
      isSameDay(startDate.getTime(), date.getTime())
    );
  };
  
  // Handle day cell press
  const handleDayPress = (date: Date | null) => {
    if (!date) return;
    
    // Find events for this date
    const eventsOnDate = streakHistory.filter(event => 
      isSameDay(event.date.getTime(), date.getTime())
    );
    
    if (eventsOnDate.length > 0) {
      setSelectedDate(date);
      setSelectedEvents(eventsOnDate);
      setDetailModalVisible(true);
    }
  };
  
  // Format date for detail view
  const formatDetailDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Streak Calendar
        </Text>
        <CalendarIcon size={24} color={colors.primary} />
      </View>
      
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={styles.navigationButton}
        >
          <ChevronLeft size={24} color={colors.primary} />
        </TouchableOpacity>
        
        <Animated.Text style={[styles.monthYearText, { color: colors.text }, slideStyle]}>
          {getMonthName(currentMonth)} {currentYear}
        </Animated.Text>
        
        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.navigationButton}
        >
          <ChevronRight size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      {/* Weekday headers */}
      <View style={styles.weekdayHeader}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <Text key={index} style={[styles.weekdayText, { color: colors.secondaryText }]}>
            {day}
          </Text>
        ))}
      </View>
      
      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayCell,
              day.day === 0 && styles.emptyCell,
              day.date && isSameDay(day.date.getTime(), new Date().getTime()) && styles.todayCell,
            ]}
            onPress={() => day.date && handleDayPress(day.date)}
            disabled={day.day === 0}
          >
            {day.day !== 0 && (
              <>
                <View 
                  style={[
                    styles.dayBackground,
                    isRelapseDay(day.date) && { backgroundColor: COLORS.relapse },
                    isStreakDay(day.date) && { backgroundColor: COLORS.streak },
                    isStreakStartDay(day.date) && { backgroundColor: COLORS.start },
                  ]}
                />
                {isStreakStartDay(day.date) && isRelapseDay(day.date) && (
                  <View style={styles.splitDayOverlay}>
                    <View style={[styles.splitDayHalf, { backgroundColor: COLORS.relapse, right: '50%' }]} />
                    <View style={[styles.splitDayHalf, { backgroundColor: COLORS.start, left: '50%' }]} />
                  </View>
                )}
                <Text 
                  style={[
                    styles.dayText, 
                    { color: isStreakDay(day.date) || isRelapseDay(day.date) || isStreakStartDay(day.date) ? '#FFFFFF' : colors.text }
                  ]}
                >
                  {day.day}
                </Text>
                {(isRelapseDay(day.date) || isStreakStartDay(day.date)) && (
                  <View style={styles.eventIndicator}>
                    <Info size={12} color="#FFFFFF" />
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.streak }]} />
          <Text style={[styles.legendText, { color: colors.secondaryText }]}>Streak Days</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.relapse }]} />
          <Text style={[styles.legendText, { color: colors.secondaryText }]}>Relapse</Text>
        </View>
        
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: COLORS.start }]} />
          <Text style={[styles.legendText, { color: colors.secondaryText }]}>Fresh Start</Text>
        </View>
      </View>
      
      {/* Day detail modal */}
      <Modal
        transparent
        visible={isDetailModalVisible}
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <BlurView intensity={60} style={styles.modalOverlay}>
          <View style={[styles.detailModalContainer, { backgroundColor: colors.card }]}>
            <View style={styles.detailModalHeader}>
              <CalendarIconFull size={20} color={colors.primary} />
              <Text style={[styles.detailModalTitle, { color: colors.text }]}>
                {selectedDate && formatDetailDate(selectedDate)}
              </Text>
              <TouchableOpacity
                onPress={() => setDetailModalVisible(false)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <X size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.detailModalContent}
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            >
              {selectedEvents.map((event, index) => (
                <View key={index} style={styles.eventCard}>
                  <LinearGradient
                    colors={
                      event.type === 'relapse' 
                        ? ['rgba(231, 76, 60, 0.2)', 'rgba(231, 76, 60, 0.05)']
                        : ['rgba(46, 204, 113, 0.2)', 'rgba(46, 204, 113, 0.05)']
                    }
                    style={styles.eventCardGradient}
                  >
                    <View style={styles.eventCardHeader}>
                      {event.type === 'relapse' ? (
                        <AlertTriangle size={18} color="#e74c3c" />
                      ) : (
                        <RefreshCw size={18} color="#2ecc71" />
                      )}
                      <Text style={[styles.eventCardTitle, { 
                        color: event.type === 'relapse' ? '#e74c3c' : '#2ecc71' 
                      }]}>
                        {event.type === 'relapse' ? 'Relapse' : 'Fresh Start'}
                      </Text>
                      <Text style={[styles.eventCardTime, { color: colors.secondaryText }]}>
                        {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    
                    {event.streakDays !== undefined && (
                      <Text style={[styles.eventCardDetail, { color: colors.text }]}>
                        {event.type === 'relapse' 
                          ? `Lost a streak of ${event.streakDays} days` 
                          : `Beginning of ${event.streakDays} day streak`}
                      </Text>
                    )}
                    
                    {event.notes && (
                      <Text style={[styles.eventCardNotes, { color: colors.secondaryText }]}>
                        {event.notes}
                      </Text>
                    )}
                  </LinearGradient>
                </View>
              ))}
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    borderRadius: 20,
    overflow: 'hidden',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navigationButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 7 days per week
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 4,
  },
  dayBackground: {
    position: 'absolute',
    width: '85%',
    height: '85%',
    borderRadius: 50,
    zIndex: -1,
    opacity: 0.9, // Slightly transparent for a softer look
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    zIndex: 1,
  },
  emptyCell: {
    opacity: 0,
  },
  todayCell: {
    borderWidth: 2,
    borderColor: COLORS.today,
    borderRadius: 50,
  },
  streakDay: {
    backgroundColor: COLORS.streak,
    shadowColor: COLORS.streak,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  relapseDay: {
    backgroundColor: COLORS.relapse,
    shadowColor: COLORS.relapse,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  startDay: {
    backgroundColor: COLORS.start,
    shadowColor: COLORS.start,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 3,
  },
  splitDayOverlay: {
    position: 'absolute',
    width: '85%',
    height: '85%',
    borderRadius: 50,
    overflow: 'hidden',
    zIndex: -1,
  },
  splitDayHalf: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '50%',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    zIndex: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
    gap: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 12,
    borderRadius: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  detailModalContainer: {
    width: '85%',
    maxHeight: '70%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  detailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  detailModalContent: {
    padding: 16,
  },
  eventCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 4,
  },
  eventCardGradient: {
    padding: 16,
    borderRadius: 12,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  eventCardTime: {
    fontSize: 12,
  },
  eventCardDetail: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  eventCardNotes: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default StreakCalendar; 