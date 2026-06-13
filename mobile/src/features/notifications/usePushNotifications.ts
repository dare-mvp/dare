import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from '../../lib/actions/endpoints';
import { useAuth } from '../auth/AuthProvider';

type NotificationAction = {
  dareId?: unknown;
  evidenceObjectId?: unknown;
  juryCaseId?: unknown;
  kycVerificationId?: unknown;
  transactionId?: unknown;
  type?: unknown;
  withdrawalId?: unknown;
};

type NotificationData = {
  action?: NotificationAction | null;
  notificationId?: unknown;
  type?: unknown;
};

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
    if (!canUseNativePushNotifications()) return undefined;

    let subscription: { remove: () => void } | null = null;
    let cancelled = false;

    void loadNotifications().then((Notifications) => {
      if (cancelled) return;
      subscription = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as NotificationData;
        const href = notificationHref(data);
        router.push(href);
      });
    }).catch((error) => {
      console.warn('push notification listener setup failed', error);
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

function notificationHref(data: NotificationData) {
  const action = data.action;
  const notificationType = typeof data.type === 'string' ? data.type : null;
  const actionType = typeof action?.type === 'string' ? action.type : null;
  const dareId = typeof action?.dareId === 'string' ? action.dareId : null;
  const evidenceObjectId = typeof action?.evidenceObjectId === 'string' ? action.evidenceObjectId : null;
  const juryCaseId = typeof action?.juryCaseId === 'string' ? action.juryCaseId : null;
  const transactionId = typeof action?.transactionId === 'string' ? action.transactionId : null;

  if (
    ['court_ready', 'court_starting', 'dare_accepted', 'ready_check'].includes(notificationType ?? '') &&
    dareId
  ) {
    return {
      pathname: '/court/ready',
      params: { dareId },
    } as const;
  }

  if (['match_result', 'result_claimed', 'result_disputed'].includes(notificationType ?? '') && dareId) {
    return {
      pathname: '/court/result',
      params: { dareId },
    } as const;
  }

  if (['settlement_pending', 'payout_sent', 'dare_settled'].includes(notificationType ?? '') && dareId) {
    return {
      pathname: '/court/settlement-status',
      params: { dareId },
    } as const;
  }

  if (notificationType?.startsWith('wallet_') || notificationType?.startsWith('withdrawal_')) {
    if (transactionId) {
      return {
        pathname: '/wallet/transaction/[id]',
        params: { id: transactionId },
      } as const;
    }
    return '/(tabs)/wallet';
  }

  if (notificationType?.startsWith('kyc_') || actionType === 'kyc') {
    return '/kyc-status';
  }

  if (notificationType?.startsWith('dispute_') && dareId) {
    return {
      pathname: '/disputes/status',
      params: {
        dareId,
        ...(juryCaseId ? { juryCaseId } : {}),
      },
    } as const;
  }

  if (notificationType === 'evidence_uploaded' && dareId) {
    return {
      pathname: '/disputes/status',
      params: {
        dareId,
        ...(evidenceObjectId ? { evidenceObjectId } : {}),
        ...(juryCaseId ? { juryCaseId } : {}),
      },
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
