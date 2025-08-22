import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getData, storeData, STORAGE_KEYS } from './storage';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Gentle reminder messages that are vague and non-embarrassing
const GENTLE_REMINDERS = [
  "Time for a quick check-in with yourself",
  "How are you feeling right now?",
  "Take a moment to breathe and reflect",
  "You're doing great - keep going",
  "Remember your goals for today",
  "A gentle reminder to stay mindful",
  "How's your day going so far?",
  "Time for a positive moment",
  "You've got this - stay strong",
  "Take a moment to appreciate your progress",
  "How are you taking care of yourself today?",
  "Remember why you started this journey",
  "You're building something amazing",
  "Stay focused on what matters most",
  "Your future self will thank you",
  "Keep moving forward, one step at a time",
  "You have the power to choose",
  "Every moment is a new opportunity",
  "Stay committed to your growth",
  "You're stronger than you think"
];

// Different types of reminders for different times
const MORNING_REMINDERS = [
  "Start your day with intention",
  "Good morning! How do you want to feel today?",
  "Today is a fresh start",
  "Set your intentions for the day ahead",
  "Morning check-in: How are you feeling?"
];

const EVENING_REMINDERS = [
  "How was your day?",
  "Time to reflect on your progress",
  "End your day with gratitude",
  "What went well today?",
  "Rest well and recharge"
];

const WEEKEND_REMINDERS = [
  "Weekend vibes - how are you doing?",
  "Take time for yourself this weekend",
  "Weekend check-in: How's your energy?",
  "Enjoy your weekend mindfully",
  "Weekend reflection time"
];

interface NotificationSettings {
  enabled: boolean;
  morningReminders: boolean;
  eveningReminders: boolean;
  weekendReminders: boolean;
  customTimes: string[]; // HH:mm format
  frequency: 'daily' | 'twice_daily' | 'weekly' | 'custom';
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  morningReminders: true,
  eveningReminders: true,
  weekendReminders: true,
  customTimes: ['09:00', '18:00'],
  frequency: 'weekly'
};

class NotificationService {
  private static instance: NotificationService;
  private settings: NotificationSettings = DEFAULT_SETTINGS;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
        return;
      }

      // Load settings
      await this.loadSettings();
      
      // Set up notification channels for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('gentle-reminders', {
          name: 'Gentle Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      console.log('Notification service initialized');
    } catch (error) {
      console.error('Error initializing notification service:', error);
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const savedSettings = await getData<NotificationSettings>(
        STORAGE_KEYS.NOTIFICATION_SETTINGS,
        DEFAULT_SETTINGS
      );
      this.settings = { ...DEFAULT_SETTINGS, ...savedSettings };
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  }

  async saveSettings(settings: Partial<NotificationSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings };
      await storeData(STORAGE_KEYS.NOTIFICATION_SETTINGS, this.settings);
      
      // Reschedule notifications with new settings
      if (this.settings.enabled) {
        await this.scheduleReminders();
      } else {
        await this.cancelAllReminders();
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  }

  async getSettings(): Promise<NotificationSettings> {
    await this.loadSettings();
    return this.settings;
  }

  private getRandomMessage(type: 'general' | 'morning' | 'evening' | 'weekend'): string {
    let messages: string[];
    
    switch (type) {
      case 'morning':
        messages = MORNING_REMINDERS;
        break;
      case 'evening':
        messages = EVENING_REMINDERS;
        break;
      case 'weekend':
        messages = WEEKEND_REMINDERS;
        break;
      default:
        messages = GENTLE_REMINDERS;
    }
    
    return messages[Math.floor(Math.random() * messages.length)];
  }

  private isWeekend(): boolean {
    const day = new Date().getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }

  async scheduleReminders(): Promise<void> {
    try {
      // Cancel existing reminders first
      await this.cancelAllReminders();

      if (!this.settings.enabled) return;

      const now = new Date();
      const isWeekend = this.isWeekend();

      switch (this.settings.frequency) {
        case 'daily':
          await this.scheduleDailyReminder();
          break;
        case 'twice_daily':
          await this.scheduleTwiceDailyReminders();
          break;
        case 'weekly':
          await this.scheduleWeeklyReminders();
          break;
        case 'custom':
          await this.scheduleCustomTimeReminders();
          break;
      }

      console.log('Reminders scheduled successfully');
    } catch (error) {
      console.error('Error scheduling reminders:', error);
    }
  }

  private async scheduleDailyReminder(): Promise<void> {
    const message = this.getRandomMessage('general');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pledge',
        body: message,
        data: { type: 'gentle-reminder' },
      },
      trigger: {
        hour: 10,
        minute: 0,
        repeats: true,
      } as any,
    });
  }

  private async scheduleTwiceDailyReminders(): Promise<void> {
    // Morning reminder
    const morningMessage = this.getRandomMessage('morning');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pledge',
        body: morningMessage,
        data: { type: 'morning-reminder' },
      },
      trigger: {
        hour: 9,
        minute: 0,
        repeats: true,
      } as any,
    });

    // Evening reminder
    const eveningMessage = this.getRandomMessage('evening');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pledge',
        body: eveningMessage,
        data: { type: 'evening-reminder' },
      },
      trigger: {
        hour: 18,
        minute: 0,
        repeats: true,
      } as any,
    });
  }

  private async scheduleWeeklyReminders(): Promise<void> {
    // Schedule for Tuesday and Friday at 10 AM
    const tuesdayTrigger = {
      hour: 10,
      minute: 0,
      weekday: 2, // Tuesday
      repeats: true,
    } as any;

    const fridayTrigger = {
      hour: 10,
      minute: 0,
      weekday: 5, // Friday
      repeats: true,
    } as any;

    const message = this.getRandomMessage('general');
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pledge',
        body: message,
        data: { type: 'weekly-reminder' },
      },
      trigger: tuesdayTrigger,
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pledge',
        body: message,
        data: { type: 'weekly-reminder' },
      },
      trigger: fridayTrigger,
    });
  }

  private async scheduleCustomTimeReminders(): Promise<void> {
    for (const timeString of this.settings.customTimes) {
      const [hour, minute] = timeString.split(':').map(Number);
      
      const message = this.getRandomMessage('general');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pledge',
          body: message,
          data: { type: 'custom-reminder' },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        } as any,
      });
    }
  }

  async cancelAllReminders(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All reminders cancelled');
    } catch (error) {
      console.error('Error cancelling reminders:', error);
    }
  }

  async sendImmediateReminder(): Promise<void> {
    try {
      const message = this.getRandomMessage('general');
      
          await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Pledge',
        body: message,
        data: { type: 'immediate-reminder' },
      },
      trigger: null, // Send immediately
    });
    } catch (error) {
      console.error('Error sending immediate reminder:', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }
}

export default NotificationService;
export type { NotificationSettings }; 