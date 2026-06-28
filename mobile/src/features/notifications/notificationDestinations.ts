import type { Href } from 'expo-router';

export type NotificationAction = {
  dareId?: string;
  evidenceObjectId?: string;
  juryCaseId?: string;
  kycVerificationId?: string;
  transactionId?: string;
  type?: string;
  withdrawalId?: string;
};

export type NotificationDestinationData = {
  action?: NotificationAction | Record<string, unknown> | null;
  notificationId?: unknown;
  type?: unknown;
};

export function resolveNotificationHref(data: NotificationDestinationData): Href {
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
    };
  }

  if (['match_result', 'result_claimed', 'result_disputed'].includes(notificationType ?? '') && dareId) {
    return {
      pathname: '/court/result',
      params: { dareId },
    };
  }

  if (['settlement_pending', 'payout_sent', 'dare_settled'].includes(notificationType ?? '') && dareId) {
    return {
      pathname: '/court/settlement-status',
      params: { dareId },
    };
  }

  if (notificationType?.startsWith('wallet_') || notificationType?.startsWith('withdrawal_')) {
    if (transactionId) {
      return {
        pathname: '/wallet/transaction/[id]',
        params: { id: transactionId },
      };
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
    };
  }

  if (notificationType === 'evidence_uploaded' && dareId) {
    return {
      pathname: '/disputes/status',
      params: {
        dareId,
        ...(evidenceObjectId ? { evidenceObjectId } : {}),
        ...(juryCaseId ? { juryCaseId } : {}),
      },
    };
  }

  if (actionType === 'jury_case') {
    return {
      pathname: '/jury/assignment',
      params: {
        ...(dareId ? { dareId } : {}),
        ...(juryCaseId ? { juryCaseId } : {}),
      },
    };
  }

  if (actionType === 'dare' && dareId) {
    return {
      pathname: '/dare/[id]',
      params: { id: dareId },
    };
  }

  if (actionType === 'responsible_gaming') {
    return '/responsible-gaming';
  }

  return '/notifications';
}

export function hasNotificationDestination(data: NotificationDestinationData) {
  return resolveNotificationHref(data) !== '/notifications';
}
