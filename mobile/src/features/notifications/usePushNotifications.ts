import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from '../../lib/actions/endpoints';
import { useAuth } from '../auth/AuthProvider';
import { resolveNotificationHref, type NotificationDestinationData } from './notificationDestinations';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModulePromise: Promise<NotificationsModule> | null = null;
let notificationHandlerConfigured = false;

export function usePushNotifications() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.isBackendConfigured) return;
    if (!canUseNativePushNotifications()) return;

    let cancelled = false;

    async function registerCurrentDevice() {
      if (Platform.OS === 'web' || !Device.isDevice) return;

      const Notifications = await loadNotifications();
      if (cancelled) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('dare-alerts', {
          importance: Notifications.AndroidImportance.MAX,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
          name: 'DARE alerts',
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      const finalStatus = existing.status === 'granted'
        ? existing.status
        : (await Notifications.requestPermissionsAsync()).status;

      if (finalStatus !== 'granted' || cancelled) return;

      const projectId = getExpoProjectId();
      if (!projectId) return;

      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      if (cancelled) return;

      await registerPushToken({
        appVersion: Constants.expoConfig?.version,
        expoPushToken: token.data,
        platform: normalizePlatform(Platform.OS),
      });
    }

    void registerCurrentDevice().catch(() => {
      console.warn('push notification registration failed');
    });

    return () => {
      cancelled = true;
    };
  }, [auth.isBackendConfigured, auth.status]);

  useEffect(() => {
    if (!canUseNativePushNotifications()) return undefined;

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    void loadNotifications().then((Notifications) => {
      if (cancelled) return;
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as NotificationDestinationData;
        const href = resolveNotificationHref(data);
        router.push(href);
      });
    }).catch(() => {
      console.warn('push notification listener setup failed');
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [router]);
}

function canUseNativePushNotifications() {
  if (Platform.OS === 'web') return false;
  return Constants.appOwnership !== 'expo';
}

async function loadNotifications() {
  notificationsModulePromise ??= import('expo-notifications').then((Notifications) => {
    if (!notificationHandlerConfigured) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      notificationHandlerConfigured = true;
    }

    return Notifications;
  });

  return notificationsModulePromise;
}

function getExpoProjectId(): string | null {
  const constants = Constants as typeof Constants & {
    easConfig?: {
      projectId?: string;
    };
  };
  const projectId = constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  return typeof projectId === 'string' && projectId.length > 0 ? projectId : null;
}

function normalizePlatform(platform: typeof Platform.OS) {
  if (platform === 'android' || platform === 'ios' || platform === 'web') return platform;
  return 'unknown';
}
