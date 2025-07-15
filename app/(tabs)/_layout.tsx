import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Home, BookOpen, Award, BarChart, Settings } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/utils/supabaseClient';

export default function TabLayout() {
  const { colors } = useTheme();
  const { session, loading } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      // Force refresh authentication on app startup
      console.log("Tab layout: Checking auth status...");
      const { data, error } = await supabase.auth.refreshSession();
      console.log("Auth refresh result:", { 
        success: !!data.session,
        user: data.user?.email,
        error: error?.message
      });
    };

    initializeApp();
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ size, color }) => (
            <BookOpen size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="challenges"
        options={{
          title: 'Challenges',
          tabBarIcon: ({ size, color }) => (
            <BarChart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: ({ size, color }) => (
            <Award size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}