import React, { useState, useCallback } from 'react';
import AchievementNotification from '@/components/AchievementNotification';

export interface AchievementProps {
  title: string;
  description: string;
  buttonText?: string;
}

export default function useAchievementNotification() {
  const [visible, setVisible] = useState(false);
  const [achievementProps, setAchievementProps] = useState<AchievementProps>({
    title: '',
    description: '',
    buttonText: 'Incredible!'
  });
  
  // Safer implementation with error handling
  const showAchievement = useCallback((props: AchievementProps) => {
    try {
      if (visible) {
        // If there's already a notification visible, close it first
        // to prevent overlap issues that could crash the app
        setVisible(false);
        
        // Wait a bit before showing new notification
        setTimeout(() => {
          setAchievementProps(props);
          setVisible(true);
        }, 300);
      } else {
        setAchievementProps(props);
        setVisible(true);
      }
    } catch (error) {
      console.error('Error showing achievement notification:', error);
    }
  }, [visible]);
  
  const hideAchievement = useCallback(() => {
    try {
      setVisible(false);
    } catch (error) {
      console.error('Error hiding achievement notification:', error);
    }
  }, []);
  
  const AchievementNotificationComponent = useCallback(() => {
    try {
      return (
        <AchievementNotification
          visible={visible}
          title={achievementProps.title}
          description={achievementProps.description}
          buttonText={achievementProps.buttonText || 'Incredible!'}
          onClose={hideAchievement}
        />
      );
    } catch (error) {
      console.error('Error rendering achievement notification:', error);
      return null; // Return null instead of crashing
    }
  }, [visible, achievementProps, hideAchievement]);
  
  return {
    showAchievement,
    hideAchievement,
    AchievementNotificationComponent
  };
} 