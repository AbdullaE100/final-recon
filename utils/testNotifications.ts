import NotificationService from './notificationService';
import { Alert } from 'react-native';

/**
 * Test utility for notification system
 */
export class NotificationTester {
  private static notificationService = NotificationService.getInstance();

  /**
   * Send a test notification immediately
   */
  static async sendTestNotification(): Promise<void> {
    try {
      await this.notificationService.sendImmediateReminder();
      Alert.alert('✅ Success', 'Test notification sent! Check your device.');
    } catch (error) {
      console.error('Test notification failed:', error);
      Alert.alert('❌ Error', 'Failed to send test notification');
    }
  }

  /**
   * Schedule a test notification for 5 seconds from now
   */
  static async scheduleTestNotification(): Promise<void> {
    try {
      const { scheduleNotificationAsync } = await import('expo-notifications');
      
      await scheduleNotificationAsync({
        content: {
          title: 'Pledge',
          body: 'This is a test notification scheduled for 5 seconds from now',
          data: { type: 'test-notification' },
        },
        trigger: {
          seconds: 5,
        } as any,
      });
      
      Alert.alert('✅ Scheduled', 'Test notification will appear in 5 seconds');
    } catch (error) {
      console.error('Schedule test failed:', error);
      Alert.alert('❌ Error', 'Failed to schedule test notification');
    }
  }

  /**
   * Get current notification settings
   */
  static async getSettings(): Promise<void> {
    try {
      const settings = await this.notificationService.getSettings();
      console.log('Current notification settings:', settings);
      Alert.alert('📋 Settings', JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error('Get settings failed:', error);
      Alert.alert('❌ Error', 'Failed to get notification settings');
    }
  }

  /**
   * Get all scheduled notifications
   */
  static async getScheduledNotifications(): Promise<void> {
    try {
      const notifications = await this.notificationService.getScheduledNotifications();
      console.log('Scheduled notifications:', notifications);
      Alert.alert('📅 Scheduled', `${notifications.length} notifications scheduled`);
    } catch (error) {
      console.error('Get scheduled failed:', error);
      Alert.alert('❌ Error', 'Failed to get scheduled notifications');
    }
  }

  /**
   * Cancel all notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await this.notificationService.cancelAllReminders();
      Alert.alert('🗑️ Cancelled', 'All notifications cancelled');
    } catch (error) {
      console.error('Cancel failed:', error);
      Alert.alert('❌ Error', 'Failed to cancel notifications');
    }
  }

  /**
   * Test different reminder types
   */
  static async testAllReminderTypes(): Promise<void> {
    try {
      const { scheduleNotificationAsync } = await import('expo-notifications');
      
      // Test morning reminder
      await scheduleNotificationAsync({
        content: {
          title: 'Pledge',
          body: 'Start your day with intention',
          data: { type: 'morning-reminder' },
        },
        trigger: { seconds: 2 } as any,
      });

      // Test evening reminder
      await scheduleNotificationAsync({
        content: {
          title: 'Pledge',
          body: 'How was your day?',
          data: { type: 'evening-reminder' },
        },
        trigger: { seconds: 4 } as any,
      });

      // Test general reminder
      await scheduleNotificationAsync({
        content: {
          title: 'Pledge',
          body: 'Time for a quick check-in with yourself',
          data: { type: 'gentle-reminder' },
        },
        trigger: { seconds: 6 } as any,
      });

      Alert.alert('✅ Test Suite', '3 test notifications scheduled (2s, 4s, 6s)');
    } catch (error) {
      console.error('Test suite failed:', error);
      Alert.alert('❌ Error', 'Failed to run test suite');
    }
  }
}

// Quick test functions for easy access
export const testNotification = () => NotificationTester.sendTestNotification();
export const testScheduled = () => NotificationTester.scheduleTestNotification();
export const testAll = () => NotificationTester.testAllReminderTypes();
export const getSettings = () => NotificationTester.getSettings();
export const getScheduled = () => NotificationTester.getScheduledNotifications();
export const cancelAll = () => NotificationTester.cancelAllNotifications(); 