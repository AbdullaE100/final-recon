import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { storeData, getData, STORAGE_KEYS } from '@/utils/storage';

interface ThemeColors {
  background: string;
  card: string;
  cardAlt: string;
  text: string;
  secondaryText: string;
  border: string;
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  errorLight: string;
  progressTrack: string;
  progressTrunk: string;
  progressLeaves: string;
  progressGround: string;
  switchTrackOff: string;
  switchThumb: string;
  white: string;
  placeholder: string;
  inputBackground: string;
  gradientStart: string;
  gradientEnd: string;
}

interface ThemeContextType {
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const darkColors: ThemeColors = {
  background: '#121212',
  card: '#1E1E1E',
  cardAlt: '#2A2A2A',
  text: '#FFFFFF',
  secondaryText: '#B0B0B0',
  border: '#3A3A3A',
  primary: '#6366F1',
  secondary: '#22D3EE',
  accent: '#F472B6',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.15)',
  progressTrack: '#2A2A2A',
  progressTrunk: '#8B5A2B',
  progressLeaves: '#3F9142',
  progressGround: '#3A3A3A',
  switchTrackOff: '#3A3A3A',
  switchThumb: '#F3F4F6',
  white: '#FFFFFF',
  placeholder: '#6B7280',
  inputBackground: '#2A2A2A',
  gradientStart: '#6366F1',
  gradientEnd: '#F472B6',
};

// Light mode colors kept for reference but not used
const lightColors: ThemeColors = {
  background: '#F9FAFB',
  card: '#FFFFFF',
  cardAlt: '#F3F4F6',
  text: '#1F2937',
  secondaryText: '#6B7280',
  border: '#E5E7EB',
  primary: '#6366F1',
  secondary: '#0EA5E9',
  accent: '#EC4899',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: 'rgba(239, 68, 68, 0.1)',
  progressTrack: '#E5E7EB',
  progressTrunk: '#8B5A2B',
  progressLeaves: '#4ADE80',
  progressGround: '#E5E7EB',
  switchTrackOff: '#D1D5DB',
  switchThumb: '#FFFFFF',
  white: '#FFFFFF',
  placeholder: '#9CA3AF',
  inputBackground: '#F3F4F6',
  gradientStart: '#6366F1',
  gradientEnd: '#EC4899',
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  colors: darkColors,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Always use dark mode
  const [isDark] = useState(true);
  
  // Save dark mode preference to storage on initial load
  useEffect(() => {
    const saveDarkModePreference = async () => {
      await storeData(STORAGE_KEYS.SETTINGS, { darkMode: true });
    };
    
    saveDarkModePreference();
  }, []);
  
  // Toggle function kept for interface compatibility but does nothing
  const toggleTheme = () => {
    // No-op function - dark mode is always enabled
    console.log('Dark mode is always enabled');
  };
  
  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors: darkColors, // Always use dark colors
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);