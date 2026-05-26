import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from '../../lib/actions/endpoints';
import { useAuth } from '../auth/AuthProvider';

type NotificationAction = {
  dareId?: unknown;
  juryCaseId?: unknown;
  type?: unknown;
};

type NotificationData = {
  action?: NotificationAction | null;
  notificationId?: unknown;
  type?: unknown;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status !== 'authenticated' || !auth.isBackendConfigured) return;

    let cancelled = false;

    async function registerCurrentDevice() {
      if (Platform.OS === 'web' || !Device.isDevice) return;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('dare-alerts', {
          importance: Notifications.AndroidImportance.MAX,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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

    void registerCurrentDevice().catch((error) => {
      console.warn('push notification registration failed', error);
    });

    return () => {
      cancelled = true;
    };
  }, [auth.isBackendConfigured, auth.status]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      const href = notificationHref(data);
      router.push(href);
    });

    return () => {
      subscription.remove();
    };
  }, [router]);
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

function notificationHref(data: NotificationData) {
  const action = data.action;
  const notificationType = typeof data.type === 'string' ? data.type : null;
  const actionType = typeof action?.type === 'string' ? action.type : null;
  const dareId = typeof action?.dareId === 'string' ? action.dareId : null;
  const juryCaseId = typeof action?.juryCaseId === 'string' ? action.juryCaseId : null;

  if (notificationType === 'court_starting' && dareId) {
    return {
      pathname: '/court/ready',
      params: { dareId },
    } as const;
  }

  if (actionType === 'jury_case') {
    return {
      pathname: '/jury/assignment',
      params: {
        ...(dareId ? { dareId } : {}),
        ...(juryCaseId ? { juryCaseId } : {}),
      },
    } as const;
  }

  if (actionType === 'dare' && dareId) {
    return {
      pathname: '/dare/[id]',
      params: { id: dareId },
    } as const;
  }

  if (actionType === 'responsible_gaming') {
    return '/responsible-gaming';
  }

  return '/notifications';
}
