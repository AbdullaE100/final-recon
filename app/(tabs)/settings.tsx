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
  Bug,
  CreditCard,
  Sparkles,
  LogOut,
  LogIn,
  Moon,
  Bell,
  LockKeyhole,
} from 'lucide-react-native';
import { getData, STORAGE_KEYS, storeData, removeData } from '@/utils/storage';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/context/SubscriptionContext';
import { useAuth } from '@/context/AuthContext';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { subscription, isSubscribed } = useSubscription();
  const { user, signOut } = useAuth();
  
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

  const resetOnboarding = async () => {
    Alert.alert(
      "Reset Onboarding",
      "This will reset the onboarding state so you can see the onboarding screens again. The app will restart. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Reset",
          onPress: async () => {
            // Remove the onboarding completed flag
            await removeData(STORAGE_KEYS.ONBOARDING_COMPLETED);
            // Set flag to false to make sure it's recognized as not completed
            await storeData(STORAGE_KEYS.ONBOARDING_COMPLETED, false);
            
            // Restart the app
            Alert.alert(
              "Onboarding Reset",
              "Onboarding has been reset. Please restart the app to see the onboarding screens.",
              [
                {
                  text: "OK",
                  onPress: () => {
                    // Navigate to root to trigger app flow restart
                    router.replace('/');
                  }
                }
              ]
            );
          },
          style: "destructive"
        }
      ]
    );
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out of your account?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Sign Out",
          onPress: async () => {
            try {
              await signOut();
              Alert.alert("Success", "You have been signed out.");
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            }
          }
        }
      ]
    );
  };
  
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
      
      {/* Subscription Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Premium
        </Text>
        
        <BlurView 
          intensity={80} 
          tint="dark"
          style={[styles.sectionBlur, { marginBottom: 16 }]}
        >
          <TouchableOpacity 
            style={styles.settingsRow}
            onPress={() => router.push('/subscription' as any)}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(103, 114, 255, 0.1)' }]}>
                <Sparkles size={20} color="#6772FF" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Premium
                </Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                  {isSubscribed
                    ? `Subscription active until ${new Date(subscription?.current_period_end || Date.now()).toLocaleDateString()}`
                    : 'Unlock all premium features for $3.99/month'
                  }
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.secondaryText} />
          </TouchableOpacity>
          
          {/* Add Stripe Debug Button */}
          <TouchableOpacity 
            style={styles.settingsRow}
            onPress={() => router.push('/stripe-test' as any)}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(128, 0, 128, 0.1)' }]}>
                <Bug size={20} color="#800080" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Debug Stripe
                </Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                  Test and diagnose Stripe integration issues
                </Text>
              </View>
            </View>
            <ChevronRight size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        </BlurView>
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

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Account
        </Text>
        
        <BlurView intensity={12} tint="dark" style={styles.settingsCard}>
          {user ? (
            // Signed in user view
            <>
              <View style={styles.settingsRow}>
                <View style={styles.settingsLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(46, 204, 113, 0.15)' }]}>
                    <User size={20} color="#2ecc71" />
                  </View>
                  <View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      {user.email}
                    </Text>
                    <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                      Signed in with {user.app_metadata?.provider || 'email'}
                    </Text>
                  </View>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.settingsRow}
                onPress={handleSignOut}
              >
                <View style={styles.settingsLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.15)' }]}>
                    <LogOut size={20} color="#e74c3c" />
                  </View>
                  <View>
                    <Text style={[styles.settingLabel, { color: colors.text }]}>
                      Sign Out
                    </Text>
                    <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                      Log out of your account
                    </Text>
                  </View>
                </View>
                
                <ChevronRight size={20} color={colors.secondaryText} />
              </TouchableOpacity>
            </>
          ) : (
            // Sign in options for non-logged in users
            <TouchableOpacity 
              style={styles.settingsRow}
              onPress={() => router.push('/login' as any)}
            >
              <View style={styles.settingsLeft}>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(52, 152, 219, 0.15)' }]}>
                  <LogIn size={20} color="#3498db" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: colors.text }]}>
                    Sign In
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                    Access your account and sync your data
                  </Text>
                </View>
              </View>
              
              <ChevronRight size={20} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </BlurView>
      </View>

      {/* Debug Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Debug Options
        </Text>
        
        <BlurView intensity={12} tint="dark" style={styles.settingsCard}>
          <TouchableOpacity 
            style={styles.settingsRow}
            onPress={resetOnboarding}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(231, 76, 60, 0.15)' }]}>
                <Bug size={20} color="#e74c3c" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Reset Onboarding
                </Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                  See the onboarding screens again
                </Text>
              </View>
            </View>
            
            <ChevronRight size={20} color={colors.secondaryText} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity 
            style={styles.settingsRow}
            onPress={() => router.push('/force-evolution' as any)}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(241, 196, 15, 0.15)' }]}>
                <Award size={20} color="#f1c40f" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Fix Companion Evolution
                </Text>
                <Text style={[styles.settingDescription, { color: colors.secondaryText }]}>
                  Fix issues with companion evolution
                </Text>
              </View>
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