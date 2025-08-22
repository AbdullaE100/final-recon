import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import NotificationService, { NotificationSettings } from '@/utils/notificationService';
import { Ionicons } from '@expo/vector-icons';

const NotificationSettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    morningReminders: true,
    eveningReminders: true,
    weekendReminders: true,
    customTimes: ['09:00', '18:00'],
    frequency: 'twice_daily',
  });

  const notificationService = NotificationService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await notificationService.getSettings();
      setSettings(savedSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: any) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await notificationService.saveSettings(newSettings);
    } catch (error) {
      console.error('Error updating notification setting:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    if (!enabled) {
      Alert.alert(
        'Disable Notifications',
        'Are you sure you want to disable gentle reminders? You can always re-enable them later.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: () => updateSetting('enabled', false) },
        ]
      );
    } else {
      await updateSetting('enabled', true);
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.sendImmediateReminder();
      Alert.alert('Test Notification', 'A gentle reminder has been sent!');
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
      padding: 20,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 15,
    },
    settingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingLabel: {
      fontSize: 16,
      color: colors.text,
      flex: 1,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.secondary,
      marginTop: 5,
    },
    frequencyButton: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 20,
      marginRight: 10,
      marginBottom: 10,
    },
    frequencyButtonActive: {
      backgroundColor: colors.primary,
    },
    frequencyButtonInactive: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    frequencyButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    frequencyButtonTextActive: {
      color: colors.white,
    },
    frequencyButtonTextInactive: {
      color: colors.text,
    },
    testButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 25,
      alignItems: 'center',
      marginTop: 20,
    },
    testButtonText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    infoText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginTop: 10,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Main Toggle */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Gentle Reminders</Text>
              <Text style={styles.settingDescription}>
                Receive supportive, non-embarrassing reminders to stay on track
              </Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
              thumbColor={settings.enabled ? colors.switchThumb : colors.secondaryText}
            />
          </View>
        </View>

        {settings.enabled && (
          <>
            {/* Frequency Settings */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminder Frequency</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    settings.frequency === 'daily'
                      ? styles.frequencyButtonActive
                      : styles.frequencyButtonInactive,
                  ]}
                  onPress={() => updateSetting('frequency', 'daily')}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      settings.frequency === 'daily'
                        ? styles.frequencyButtonTextActive
                        : styles.frequencyButtonTextInactive,
                    ]}
                  >
                    Daily
                  </Text>
                </TouchableOpacity>
                                 <TouchableOpacity
                   style={[
                     styles.frequencyButton,
                     settings.frequency === 'twice_daily'
                       ? styles.frequencyButtonActive
                       : styles.frequencyButtonInactive,
                   ]}
                   onPress={() => updateSetting('frequency', 'twice_daily')}
                 >
                   <Text
                     style={[
                       styles.frequencyButtonText,
                       settings.frequency === 'twice_daily'
                         ? styles.frequencyButtonTextActive
                         : styles.frequencyButtonTextInactive,
                     ]}
                   >
                     Twice Daily
                   </Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[
                     styles.frequencyButton,
                     settings.frequency === 'weekly'
                       ? styles.frequencyButtonActive
                       : styles.frequencyButtonInactive,
                   ]}
                   onPress={() => updateSetting('frequency', 'weekly')}
                 >
                   <Text
                     style={[
                       styles.frequencyButtonText,
                       settings.frequency === 'weekly'
                         ? styles.frequencyButtonTextActive
                         : styles.frequencyButtonTextInactive,
                     ]}
                   >
                     Weekly
                   </Text>
                 </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.frequencyButton,
                    settings.frequency === 'custom'
                      ? styles.frequencyButtonActive
                      : styles.frequencyButtonInactive,
                  ]}
                  onPress={() => updateSetting('frequency', 'custom')}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      settings.frequency === 'custom'
                        ? styles.frequencyButtonTextActive
                        : styles.frequencyButtonTextInactive,
                    ]}
                  >
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reminder Types */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminder Types</Text>
              
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Morning Check-ins</Text>
                  <Text style={styles.settingDescription}>
                    Gentle morning reminders to start your day mindfully
                  </Text>
                </View>
                <Switch
                  value={settings.morningReminders}
                  onValueChange={(value) => updateSetting('morningReminders', value)}
                  trackColor={{ false: colors.surface, true: colors.primary }}
                  thumbColor={settings.morningReminders ? colors.onPrimary : colors.textSecondary}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Evening Reflections</Text>
                  <Text style={styles.settingDescription}>
                    Evening reminders to reflect on your progress
                  </Text>
                </View>
                <Switch
                  value={settings.eveningReminders}
                  onValueChange={(value) => updateSetting('eveningReminders', value)}
                  trackColor={{ false: colors.surface, true: colors.primary }}
                  thumbColor={settings.eveningReminders ? colors.onPrimary : colors.textSecondary}
                />
              </View>

              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Weekend Support</Text>
                  <Text style={styles.settingDescription}>
                    Special weekend reminders for extra support
                  </Text>
                </View>
                <Switch
                  value={settings.weekendReminders}
                  onValueChange={(value) => updateSetting('weekendReminders', value)}
                  trackColor={{ false: colors.surface, true: colors.primary }}
                  thumbColor={settings.weekendReminders ? colors.onPrimary : colors.textSecondary}
                />
              </View>
            </View>

            {/* Test Notification */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Notifications</Text>
              <Text style={styles.infoText}>
                Send a test notification to see how gentle reminders will appear on your device.
              </Text>
              <TouchableOpacity style={styles.testButton} onPress={testNotification}>
                <Text style={styles.testButtonText}>Send Test Reminder</Text>
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About Gentle Reminders</Text>
              <Text style={styles.infoText}>
                These reminders are designed to be supportive and non-embarrassing. They use vague, 
                positive language that won't reveal the nature of your journey to others who might see 
                your notifications.
              </Text>
              <Text style={styles.infoText}>
                Examples: "Time for a quick check-in with yourself", "How are you feeling right now?", 
                "Take a moment to breathe and reflect"
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default NotificationSettingsScreen; 