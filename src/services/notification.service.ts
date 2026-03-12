/**
 * Notification Service
 * Handles Expo push notifications
 * NOTE: Notifications don't work in Expo Go (SDK 53+), requires development build
 */

import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';
import AuthService from './auth.service';

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

const canUseNativeNotifications = Platform.OS !== 'web';
const canUseExpoNotifications = canUseNativeNotifications && !isExpoGo;

// Lazy load notifications module
let Notifications: any = null;
let Device: any = null;
let Haptics: any = null;

if (canUseExpoNotifications) {
  try {
    Notifications = require('expo-notifications');
  } catch (error) {
    console.log('Local notifications module not available:', error);
  }

  try {
    Device = require('expo-device');
  } catch (error) {
    console.log('Device module not available:', error);
  }
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
}

if (canUseNativeNotifications) {
  try {
    Haptics = require('expo-haptics');
  } catch (error) {
    console.log('Haptics module not available:', error);
  }
}

class NotificationService {
  private expoPushToken: string | null = null;
  private hasCheckedLocalPermission = false;
  private hasLocalPermission = false;
  private hasConfiguredAndroidChannel = false;

  private async ensureAndroidChannel() {
    if (Platform.OS !== 'android' || !Notifications || this.hasConfiguredAndroidChannel) return;
    try {
      await Notifications.setNotificationChannelAsync('orders', {
        name: 'Orders',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
      });
      this.hasConfiguredAndroidChannel = true;
    } catch (error) {
      console.warn('Failed to configure Android notification channel:', error);
    }
  }

  private async ensureLocalPermission() {
    if (!Notifications) return false;
    if (this.hasCheckedLocalPermission) return this.hasLocalPermission;

    this.hasCheckedLocalPermission = true;

    try {
      const existing = await Notifications.getPermissionsAsync();
      let finalStatus = existing.status;
      if (finalStatus !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        finalStatus = requested.status;
      }
      this.hasLocalPermission = finalStatus === 'granted';
      return this.hasLocalPermission;
    } catch (error) {
      console.warn('Failed to check notification permissions:', error);
      this.hasLocalPermission = false;
      return false;
    }
  }

  private async triggerHapticsFallback() {
    if (!Haptics) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // no-op
    }
  }

  private triggerVibrationFallback() {
    if (Platform.OS === 'web') return;
    try {
      Vibration.vibrate(120);
    } catch {
      // no-op
    }
  }

  /**
   * In-app alert for real-time order notifications.
   * Tries local notification with sound first, then falls back to haptics.
   */
  async playInAppAlert(title: string, body: string) {
    if (!Notifications) {
      await this.triggerHapticsFallback();
      this.triggerVibrationFallback();
      return;
    }

    try {
      const permitted = await this.ensureLocalPermission();
      if (!permitted) {
        await this.triggerHapticsFallback();
        this.triggerVibrationFallback();
        return;
      }
      await this.ensureAndroidChannel();

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          ...(Platform.OS === 'android' ? { channelId: 'orders' } : {}),
        },
        trigger: null,
      });
    } catch (error) {
      console.warn('Failed to play in-app notification alert:', error);
      await this.triggerHapticsFallback();
      this.triggerVibrationFallback();
    }
  }

  /**
   * Register for push notifications
   */
  async registerForPushNotifications() {
    // Skip if in Expo Go (remote push not supported there)
    if (!canUseExpoNotifications || !Notifications || !Device) {
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
        await this.ensureAndroidChannel();
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
    if (!Notifications) {
      await this.triggerHapticsFallback();
      this.triggerVibrationFallback();
      return;
    }

    const permitted = await this.ensureLocalPermission();
    if (!permitted) {
      await this.triggerHapticsFallback();
      this.triggerVibrationFallback();
      return;
    }

    await this.playInAppAlert(title, body);
  }

  /**
   * Add listener for received notifications
   */
  addNotificationReceivedListener(callback: (notification: any) => void) {
    if (!Notifications) {
      return null;
    }
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add listener for notification responses (user tapped notification)
   */
  addNotificationResponseReceivedListener(callback: (response: any) => void) {
    if (!Notifications) {
      return null;
    }
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Get last notification response (useful on app startup)
   */
  async getLastNotificationResponse() {
    if (!Notifications) {
      return null;
    }
    return await Notifications.getLastNotificationResponseAsync();
  }

  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications() {
    if (!Notifications) {
      return;
    }
    await Notifications.dismissAllNotificationsAsync();
  }
}

export default new NotificationService();
