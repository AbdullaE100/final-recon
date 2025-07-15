import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  User, 
  Award,
  ChevronRight,
  Edit,

  CreditCard,


  Moon,
  Bell,
  LockKeyhole,
  Trash2,
  AlertTriangle,
  Activity,
  RefreshCw,
} from 'lucide-react-native';
import { getData, STORAGE_KEYS, storeData, removeData, clearAllData } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { useStreak } from '@/context/StreakContext';



export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetCalendar } = useStreak();


  
  const [username, setUsername] = useState<string>('');
  const [pledge, setPledge] = useState<string>('');
  
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Load username
        interface UserPreferences {
          username?: string;
          pledge?: string;
          [key: string]: any;
        }
        
        const userPreferences = await getData<UserPreferences>(STORAGE_KEYS.USER_PREFERENCES, {});
        if (userPreferences && userPreferences.username) {
          setUsername(userPreferences.username);
        }
        if (userPreferences && userPreferences.pledge) {
          setPledge(userPreferences.pledge);
        }
      } catch (error) {
        console.error('Error loading user data in settings:', error);
      }
    };
    
    loadUserData();
  }, []);




  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ 
        paddingTop: insets.top + 20, 
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 20
      }}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>
      
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Profile
        </Text>
        
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.15)', 'rgba(99, 102, 241, 0.05)']}
          style={styles.userCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.userAvatarContainer}>
            <User size={24} color={colors.primary} />
          </View>
          
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }]}>
              {username || 'User'}
            </Text>
          </View>
        </LinearGradient>
      </View>
      

      
      {/* Pledge Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          My Pledge
        </Text>
        
        <BlurView intensity={12} tint="dark" style={styles.settingsCard}>
          <TouchableOpacity 
            style={styles.settingsRow}
            onPress={() => router.push('/my-pledge' as any)}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(52, 152, 219, 0.15)' }]}>
                <Edit size={20} color="#3498db" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  My Pledge
                </Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                  {pledge || "Set your commitment statement"}
                </Text>
              </View>
            </View>
            
            <ChevronRight size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        </BlurView>
      </View>
      
      {/* Badges Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Badges
        </Text>
        
        <BlurView intensity={12} tint="dark" style={styles.settingsCard}>
          <TouchableOpacity 
            style={styles.settingsRow}
            onPress={() => router.push('/badge-manager' as any)}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(241, 196, 15, 0.15)' }]}>
                <Award size={20} color="#f1c40f" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Badge Cabinet
                </Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                  View your achievements
                </Text>
              </View>
            </View>
            
            <ChevronRight size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Danger Zone */} 
      <View style={styles.section}> 
        <Text style={[styles.sectionTitle, { color: colors.text }]}> 
          Danger Zone 
        </Text> 
         
        <BlurView intensity={12} tint="dark" style={styles.settingsCard}> 
          <TouchableOpacity  
            style={styles.settingsRow} 
            onPress={() => 
              Alert.alert( 
                'Reset All Data', 
                'Are you sure you want to reset all your data? This action cannot be undone and will log you out.', 
                [ 
                  { 
                    text: 'Cancel', 
                    style: 'cancel', 
                  }, 
                  { 
                    text: 'Reset', 
                    onPress: async () => { 
                      await clearAllData(); 
                      router.replace('/onboarding'); 
                    }, 
                    style: 'destructive', 
                  }, 
                ], 
                { cancelable: true } 
              ) 
            } 
          > 
            <View style={styles.settingsLeft}> 
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.15)' }]}> 
                <Trash2 size={20} color="#e74c3c" /> 
              </View> 
              <Text style={[styles.settingLabel, { color: colors.text }]}> 
                Reset All Data 
              </Text> 
            </View> 
            <ChevronRight size={20} color={colors.secondaryText} /> 
          </TouchableOpacity> 
        </BlurView> 
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  userAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: '600',
  },
  settingsCard: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sectionBlur: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
});