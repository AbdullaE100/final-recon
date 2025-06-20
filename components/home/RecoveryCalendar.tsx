import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useTheme } from '@/context/ThemeContext';
import { useStreak } from '@/context/StreakContext';
import { format, startOfDay } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';

// Define custom colors for the calendar
const customCalendarColors = {
  clean: '#34D399', // A vibrant, encouraging green
  relapse: '#F87171', // A softer, less alarming red
  startDay: '#818CF8', // A distinct but harmonious start day color
};

const CalendarLegend = () => {
  const { colors } = useTheme();
  return (
    <View style={styles.legendContainer}>
      <View style={styles.legendItem}>
        <View style={[styles.legendIndicator, { backgroundColor: customCalendarColors.clean }]} />
        <Text style={[styles.legendText, { color: colors.secondaryText }]}>Clean Day</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendIndicator, { backgroundColor: customCalendarColors.relapse }]} />
        <Text style={[styles.legendText, { color: colors.secondaryText }]}>Relapse</Text>
      </View>
      <View style={styles.legendItem}>
        <View style={[styles.legendIndicator, { backgroundColor: customCalendarColors.startDay }]} />
        <Text style={[styles.legendText, { color: colors.secondaryText }]}>Start Day</Text>
      </View>
    </View>
  );
};

const RecoveryCalendar = () => {
  const { colors } = useTheme();
  const { streakStartDate, calendarHistory } = useStreak();

  const markedDates = useMemo(() => {
    let marked: { [key: string]: any } = {};

    for (const dateString in calendarHistory) {
      if (Object.prototype.hasOwnProperty.call(calendarHistory, dateString)) {
        const status = calendarHistory[dateString];
        marked[dateString] = {
          customStyles: {
            container: {
              backgroundColor: status === 'clean' ? customCalendarColors.clean : customCalendarColors.relapse,
              borderRadius: 12,
            },
            text: {
              color: colors.white,
              fontWeight: 'bold',
            },
          },
        };
      }
    }

    if (streakStartDate) {
      const startDateString = format(startOfDay(streakStartDate), 'yyyy-MM-dd');
      marked[startDateString] = {
        ...marked[startDateString],
        customStyles: {
          ...marked[startDateString]?.customStyles,
          container: {
            backgroundColor: customCalendarColors.startDay,
            borderRadius: 12,
          },
          text: {
            color: colors.white,
            fontWeight: 'bold',
          },
        },
      };
    }

    return marked;
  }, [streakStartDate, calendarHistory, colors]);

  return (
    <LinearGradient
      colors={[colors.card, '#1A1A1A']}
      style={styles.card}
    >
      <Text style={[styles.title, { color: colors.text }]}>Recovery Calendar</Text>
      
      <Calendar
        current={format(new Date(), 'yyyy-MM-dd')}
        markedDates={markedDates}
        markingType={'custom'}
        theme={{
          calendarBackground: 'transparent',
          monthTextColor: colors.text,
          dayTextColor: colors.text,
          textDisabledColor: colors.border,
          arrowColor: colors.primary,
          todayTextColor: colors.primary,
          textSectionTitleColor: colors.secondaryText,
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
        }}
        style={{
          borderRadius: 12,
        }}
      />
      <CalendarLegend />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
  },
});

export default RecoveryCalendar; 