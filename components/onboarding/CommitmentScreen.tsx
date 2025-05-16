import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import SignatureScreen from 'react-native-signature-canvas';

interface CommitmentScreenProps {
  onSign: () => void;
}

const commitment = [
  "I commit to my personal journey of growth and self-improvement.",
  "I will take responsibility for my actions and decisions.",
  "I will be patient with myself and celebrate small victories.",
  "I am worth this effort, and I deserve the freedom that awaits.",
];

const CommitmentScreen: React.FC<CommitmentScreenProps> = ({ onSign }) => {
  const { colors } = useTheme();
  const [signature, setSignature] = useState<string | null>(null);
  const [hasSigned, setHasSigned] = useState(false);
  const fadeOutAnim = useRef(new Animated.Value(1)).current;
  const signatureRef = useRef<any>(null);
  
  // Handle signature completion - fixed to correctly save signature data
  const handleSignature = (signatureBase64: string) => {
    console.log('Signature captured');
    setSignature(signatureBase64);
  };
  
  // Handle clear button
  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setSignature(null);
  };
  
  // Handle signature empty check
  const handleEmpty = () => {
    console.log('Signature is empty');
    setSignature(null);
    Alert.alert("Signature Required", "Please sign to continue");
  };
  
  // Handle signature end
  const handleEnd = () => {
    signatureRef.current?.readSignature();
  };
  
  const handleCommit = () => {
    if (!signature) {
      Alert.alert("Signature Required", "Please sign to continue");
      return;
    }
    
    setHasSigned(true);
    
    // Animate fade out before navigation
    Animated.timing(fadeOutAnim, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      onSign();
    });
  };
  
  // Style for signature box
  const signatureStyle = `
    .m-signature-pad {
      box-shadow: none; 
      border: none;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body, html {
      background-color: ${colors.card};
    }
  `;
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: colors.background, opacity: fadeOutAnim }
      ]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Your Commitment
        </Text>
        
        <View style={[styles.commitmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {commitment.map((line, index) => (
            <Text
              key={index}
              style={[
                styles.commitmentText,
                { color: colors.text, marginBottom: index < commitment.length - 1 ? 10 : 0 }
              ]}
            >
              {line}
            </Text>
          ))}
        </View>
        
        <Text style={[styles.instructionText, { color: colors.secondaryText }]}>
          Sign below to commit to your journey
        </Text>
        
        <View style={[styles.signatureContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={handleEmpty}
            onEnd={handleEnd}
            webStyle={signatureStyle}
            descriptionText=""
            bgWidth={Platform.OS === 'web' ? 500 : (width * 0.9) - 30}
            bgHeight={150}
            minWidth={2}
            maxWidth={4}
            penColor={colors.primary}
            backgroundColor={colors.card}
            dotSize={1}
            imageType="image/png"
            dataURL={signature || undefined}
            androidHardwareAccelerationDisabled={false}
          />
          
          {!hasSigned && (
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: colors.cardAlt }]}
              onPress={handleClear}
            >
              <Text style={[styles.clearButtonText, { color: colors.text }]}>
                Clear
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.buttonSection}>
          <Text style={[styles.signatureStatus, { color: signature ? colors.primary : colors.secondaryText }]}>
            {signature ? "Signature captured ✓" : "Please sign above"}
          </Text>
          
          <TouchableOpacity
            style={[
              styles.commitButton, 
              { 
                backgroundColor: signature ? colors.accent : colors.cardAlt,
                opacity: signature ? 1 : 0.7,
              }
            ]}
            onPress={handleCommit}
            disabled={!signature || hasSigned}
          >
            <Text style={[styles.commitButtonText, { color: colors.white }]}>
              I Commit
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  commitmentCard: {
    width: '100%',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  commitmentText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    lineHeight: 24,
  },
  instructionText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    marginBottom: 15,
  },
  signatureContainer: {
    width: '100%',
    borderRadius: 15,
    borderWidth: 1,
    padding: 15,
    marginBottom: 15,
    height: 180,
    position: 'relative',
  },
  clearButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    zIndex: 10,
  },
  clearButtonText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 5,
  },
  signatureStatus: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    marginBottom: 10,
  },
  commitButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: width * 0.7,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  commitButtonText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
});

export default CommitmentScreen; 