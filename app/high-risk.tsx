import React, { useState, useEffect, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  Phone,
  Heart,
  Wind,
  Eye,
  PenSquare,
  Sparkles,
  ChevronDown,
  MessageSquare,
} from 'lucide-react-native';
import BoxBreathing from '@/components/breathing/BoxBreathing';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Reusable component for expandable sections
const CollapsibleSection = ({ title, icon, children }: { title: string; icon: React.ElementType; children: ReactNode }) => {
  const { colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen(!isOpen);
  };

  const IconComponent = icon;

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.sectionHeader} onPress={toggleOpen}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <IconComponent size={22} color={colors.primary} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <ChevronDown size={24} color={colors.text + '80'} style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }} />
      </TouchableOpacity>
      {isOpen && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
};

const GroundingTechnique = () => {
  const { colors } = useTheme();
  const steps = [
    { icon: '👁️', text: 'Acknowledge 5 things you see around you.' },
    { icon: '🖐️', text: 'Acknowledge 4 things you can touch around you.' },
    { icon: '👂', text: 'Acknowledge 3 things you can hear.' },
    { icon: '👃', text: 'Acknowledge 2 things you can smell.' },
    { icon: '👅', text: 'Acknowledge 1 thing you can taste.' },
  ];
  return (
    <View>
      {steps.map((step, index) => (
        <View key={index} style={styles.groundingStep}>
          <Text style={styles.groundingIcon}>{step.icon}</Text>
          <Text style={[styles.groundingText, { color: colors.text }]}>{step.text}</Text>
        </View>
      ))}
    </View>
  );
}

// Main High Risk Screen Component
export default function HighRiskScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Replace with a real support contact number, potentially from user settings
  const supportContact = '1-800-273-8255'; 

  const handleCallSupport = () => {
    Linking.openURL(`tel:${supportContact}`).catch(() => {
      Alert.alert('Error', 'Unable to open phone app.');
    });
  };
  
  const handleCallEmergency = () => {
    Linking.openURL('tel:911').catch(() => {
      Alert.alert('Error', 'Unable to open phone app.');
    });
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.card]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 40,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Shield size={40} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>You've Got This</Text>
          <Text style={[styles.headerSubtitle, { color: colors.text + '80' }]}>
            This feeling is temporary. Use these tools to navigate through it.
          </Text>
        </View>

        {/* Immediate Help Section */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border, padding: 20, marginBottom: 20 }]}>
          <Text style={[styles.immediateHelpTitle, { color: colors.text }]}>Immediate Help</Text>
          <Text style={[styles.immediateHelpSubtitle, { color: colors.text + '80' }]}>
            If you're in crisis, please reach out. You are not alone.
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={handleCallSupport}
          >
            <Phone size={20} color={'#FFFFFF'} />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Call My Support Contact</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.error }]}
            onPress={handleCallEmergency}
          >
            <Heart size={20} color={'#FFFFFF'} />
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Call Emergency Services</Text>
          </TouchableOpacity>
        </View>

        {/* Guided Exercises */}
        <CollapsibleSection title="Calming Exercises" icon={Wind}>
          <Text style={[styles.sectionDescription, { color: colors.text + '80' }]}>
            Focus on your breath to calm your mind and body. Follow the animation.
          </Text>
          <BoxBreathing />
        </CollapsibleSection>
        
        <CollapsibleSection title="Grounding Techniques" icon={Eye}>
          <Text style={[styles.sectionDescription, { color: colors.text + '80' }]}>
            Use your senses to connect with the present moment.
          </Text>
          <GroundingTechnique />
        </CollapsibleSection>

        {/* Reasons & Reflections */}
        <CollapsibleSection title="My Reasons for Recovery" icon={Sparkles}>
          <Text style={[styles.sectionDescription, { color: colors.text + '80' }]}>
            Remind yourself why you started this journey. You've come so far.
          </Text>
          <View style={[styles.reasonBubble, { backgroundColor: colors.background }]}>
            <Text style={[styles.reasonText, { color: colors.text }]}>"To be a present father to my children."</Text>
          </View>
          <View style={[styles.reasonBubble, { backgroundColor: colors.background }]}>
            <Text style={[styles.reasonText, { color: colors.text }]}>"To regain my health and energy."</Text>
          </View>
          <TouchableOpacity style={[styles.subtleButton, { backgroundColor: colors.background, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={[styles.subtleButtonText, { color: colors.text }]}>Manage My Reasons</Text>
          </TouchableOpacity>
        </CollapsibleSection>

        {/* Connect & Share */}
        <CollapsibleSection title="Connect & Share" icon={MessageSquare}>
          <TouchableOpacity
              style={[styles.subtleButton, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => router.push('/(tabs)/journal')}
            >
              <PenSquare size={20} color={colors.primary} />
              <Text style={[styles.subtleButtonText, { color: colors.text }]}>Write in Journal</Text>
            </TouchableOpacity>
        </CollapsibleSection>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: '90%',
  },
  section: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  sectionContent: {
    padding: 20,
    paddingTop: 10,
  },
  immediateHelpTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  immediateHelpSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  subtleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  subtleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  sectionDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  groundingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  groundingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  groundingText: {
    fontSize: 16,
    flex: 1,
  },
  reasonBubble: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  reasonText: {
    fontSize: 16,
    fontStyle: 'italic',
  },
}); 