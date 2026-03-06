/**
 * Notification Service
 * Handles Expo push notifications
 * NOTE: Notifications don't work in Expo Go (SDK 53+), requires development build
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AuthService from './auth.service';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy load notifications only when not in Expo Go
let Notifications: any = null;
let Device: any = null;

// Only import if not in Expo Go
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');
    
    // Configure how notifications are handled when app is in foreground
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
    }
  } catch (error) {
    console.log('Notifications not available in Expo Go');
  }
}

class NotificationService {
  private expoPushToken: string | null = null;

  /**
   * Register for push notifications
   */
  async registerForPushNotifications() {
    // Skip if in Expo Go
    if (isExpoGo || !Notifications || !Device) {
      console.log('Push notifications require a development build (not available in Expo Go)');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Ask for permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // Get the token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // Update this with your Expo project ID
      });

      this.expoPushToken = token.data;
      console.log('Expo Push Token:', this.expoPushToken);

      // Register token with backend
      if (this.expoPushToken) {
        await AuthService.registerPushToken(this.expoPushToken);
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('orders', {
          name: 'Orders',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
      return null;
    }
  }

  /**
   * Schedule a local notification (for testing)
   */
  async scheduleLocalNotification(title: string, body: string) {
    if (isExpoGo || !Notifications) {
      console.log('Notifications not available in Expo Go');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
  }

  /**
   * Add listener for received notifications
   */
  addNotificationReceivedListener(callback: (notification: any) => void) {
    if (isExpoGo || !Notifications) {
      console.log('Notifications not available in Expo Go');
      return null;
    }
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add listener for notification responses (user tapped notification)
   */
  addNotificationResponseReceivedListener(callback: (response: any) => void) {
    if (isExpoGo || !Notifications) {
      console.log('Notifications not available in Expo Go');
      return null;
    }
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Get last notification response (useful on app startup)
   */
  async getLastNotificationResponse() {
    if (isExpoGo || !Notifications) {
      return null;
    }
    return await Notifications.getLastNotificationResponseAsync();
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications() {
    if (isExpoGo || !Notifications) {
      return;
    }
    await Notifications.dismissAllNotificationsAsync();
  }
}

export default new NotificationService();
