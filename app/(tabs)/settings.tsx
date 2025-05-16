import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useGamification } from '@/context/GamificationContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Bell, Shield, Lock, CircleHelp as HelpCircle, Trash2, RefreshCw, ExternalLink, Info, Sparkles, Award } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import useAchievementNotification from '@/hooks/useAchievementNotification';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { resetData, exportData, importData } = useGamification();
  const router = useRouter();
  const { showAchievement } = useAchievementNotification();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [privacyModeEnabled, setPrivacyModeEnabled] = useState(true);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  
  const confirmReset = () => {
    showAchievement({
      title: "Reset Progress",
      description: "Are you sure you want to reset all your progress? This action cannot be undone.",
      buttonText: "Cancel"
    });
    
    // Since we need a destructive action button, we'll still use Alert for this specific case
    // The achievement notification doesn't support multiple buttons with different actions
    Alert.alert(
      "Reset Progress",
      "Are you sure you want to reset all your progress? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Reset", 
          onPress: resetData,
          style: "destructive"
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy & Security</Text>
          
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Bell size={22} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Discreet Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
              thumbColor={colors.switchThumb}
            />
          </View>
          
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Shield size={22} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Privacy Mode</Text>
            </View>
            <Switch
              value={privacyModeEnabled}
              onValueChange={setPrivacyModeEnabled}
              trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
              thumbColor={colors.switchThumb}
            />
          </View>
          
          <View style={[styles.settingItem, { backgroundColor: colors.card }]}>
            <View style={styles.settingInfo}>
              <Lock size={22} color={colors.primary} />
              <Text style={[styles.settingText, { color: colors.text }]}>Data Encryption</Text>
            </View>
            <Switch
              value={encryptionEnabled}
              onValueChange={setEncryptionEnabled}
              trackColor={{ false: colors.switchTrackOff, true: colors.primary }}
              thumbColor={colors.switchThumb}
            />
          </View>
          
          <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
            All data is stored locally on your device and never sent to external servers.
          </Text>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Data Management</Text>
          
          <TouchableOpacity 
            style={[styles.buttonItem, { backgroundColor: colors.card }]}
            onPress={exportData}
          >
            <View style={styles.buttonContent}>
              <ExternalLink size={22} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Export Data</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.buttonItem, { backgroundColor: colors.card }]}
            onPress={importData}
          >
            <View style={styles.buttonContent}>
              <RefreshCw size={22} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Import Data</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.buttonItem, { backgroundColor: colors.error, opacity: 0.8 }]}
            onPress={confirmReset}
          >
            <View style={styles.buttonContent}>
              <Trash2 size={22} color={colors.white} />
              <Text style={[styles.buttonText, { color: colors.white }]}>Reset All Progress</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Features</Text>
          
          <TouchableOpacity 
            style={[styles.buttonItem, { backgroundColor: colors.card }]}
            onPress={() => router.push('/my-pledge')}
          >
            <View style={styles.buttonContent}>
              <Lock size={22} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.text }]}>My Sacred Commitment</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.buttonItem, { backgroundColor: colors.card }]}
            onPress={() => router.push('/companions-demo')}
          >
            <View style={styles.buttonContent}>
              <Sparkles size={22} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Companion Gallery</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.buttonItem, { backgroundColor: colors.card }]}
            onPress={() => router.push('/badge-manager')}
          >
            <View style={styles.buttonContent}>
              <Award size={22} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Badge Manager</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Support</Text>
          
          <TouchableOpacity style={[styles.buttonItem, { backgroundColor: colors.card }]}>
            <View style={styles.buttonContent}>
              <HelpCircle size={22} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.text }]}>Help & Resources</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.buttonItem, { backgroundColor: colors.card }]}>
            <View style={styles.buttonContent}>
              <Info size={22} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.text }]}>About ClearMind</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.version, { color: colors.secondaryText }]}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 18,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    marginLeft: 12,
  },
  settingDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  buttonItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 16,
    marginLeft: 12,
  },
  version: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  }
});