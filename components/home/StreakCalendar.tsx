import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useStreak } from '../../context/StreakContext';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format, isSameDay, startOfToday, isAfter } from 'date-fns';

enum DayStatus {
  Clean,
  Relapse,
  Future,
  None,
}

interface CalendarDay {
  date: Date;
  day: number;
  status: DayStatus;
  isToday: boolean;
}

const DATE_FORMAT = 'yyyy-MM-dd';

const StreakCalendar = () => {
  const { colors } = useTheme();
  const { calendarHistory, recordRelapse, setStreakStartDate } = useStreak();
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDayStatus = (dayDate: Date): DayStatus => {
    const today = startOfToday();
    
    // Clear future dates check
    if (isAfter(dayDate, today)) {
      return DayStatus.Future;
    }

    const dayStr = format(dayDate, DATE_FORMAT);
    const historyStatus = calendarHistory[dayStr];

    if (historyStatus === 'clean') {
      return DayStatus.Clean;
    }
    if (historyStatus === 'relapse') {
      return DayStatus.Relapse;
    }

    // No entry in calendar history means it's not tracked
    return DayStatus.None;
  };

  const changeMonth = (amount: number) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + amount);
      return newDate;
    });
  };

  const generateCalendarDays = (date: Date): (CalendarDay | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const today = new Date();

    const days: (CalendarDay | null)[] = [];

    for (let i = 0; i < firstDayOfMonth.getDay(); i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const dayDate = new Date(year, month, day);
      const status = getDayStatus(dayDate);

      days.push({
        date: dayDate,
        day,
        status,
        isToday: isSameDay(dayDate, today),
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Recovery Calendar</Text>
      </View>

      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navigationButton}>
            <ChevronLeft size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.monthYearText, { color: colors.text }]}>
            {monthName} {year}
          </Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navigationButton}>
            <ChevronRight size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekdayHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={[styles.weekdayText, { color: colors.text }]}>{day}</Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            if (!day) {
              return <View key={index} style={styles.dayCell} />;
            }

            const dayContainerStyle: ViewStyle[] = [styles.dayCellInner];
            let textColor = day.status === DayStatus.Future ? 'grey' : colors.text;

            switch (day.status) {
              case DayStatus.Relapse:
                dayContainerStyle.push(styles.relapseDay);
                textColor = '#ffffff';
                break;
              case DayStatus.Clean:
                dayContainerStyle.push(styles.streakDay);
                textColor = '#ffffff';
                break;
              case DayStatus.None:
                // Untracked days
                dayContainerStyle.push({ backgroundColor: 'transparent' });
                textColor = colors.text;
                break;
            }

            if (day.isToday) {
              dayContainerStyle.push(styles.todayCell);
            }

            return (
              <View key={index} style={styles.dayCell}>
                <TouchableOpacity 
                  style={dayContainerStyle}
                  onPress={() => {
                    // Don't allow interaction with future days
                    if (day.status === DayStatus.Future) return;
                    
                    // Toggle between clean and relapse
                    if (day.status === DayStatus.Clean) {
                      recordRelapse(day.date);
                    } else {
                      // If it's not clean (either relapse or none), set it to clean
                      // This will update the streak start date if needed
                      setStreakStartDate(day.date);
                    }
                  }}
                >
                  <Text style={[styles.dayText, { color: textColor }]}>
                    {day.day}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4ade80' }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Clean Day</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Relapse Day</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  calendarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navigationButton: {
    padding: 8,
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekdayHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayCellInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: '#87CEEB',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  streakDay: {
    backgroundColor: '#4ade80', // Green
    borderColor: '#38a169', // Darker green border
  },
  relapseDay: {
    backgroundColor: '#ef4444', // Red
    borderColor: '#c53030', // Darker red border
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
  },
});

export default StreakCalendar; 