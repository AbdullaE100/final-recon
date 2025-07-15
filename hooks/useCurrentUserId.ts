import { useState, useEffect } from 'react';
import { getData, STORAGE_KEYS } from '@/utils/storage';

/**
 * Hook to get the current user ID from storage
 * Returns a default value if not found
 */
export const useCurrentUserId = (): string => {
  const [userId, setUserId] = useState<string>('DEFAULT_USER_ID');
  
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        // Try to load device ID from storage
        const deviceId = await getData<string>(STORAGE_KEYS.DEVICE_ID, '');
        if (deviceId) {
          setUserId(deviceId);
        }
      } catch (error) {
        console.error('Error loading user ID:', error);
      }
    };
    
    fetchUserId();
  }, []);
  
  return userId;
};

export default useCurrentUserId; 