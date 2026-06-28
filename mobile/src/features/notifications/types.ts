export type NotificationKind =
  | 'court'
  | 'wallet'
  | 'dispute'
  | 'jury'
  | 'system';

export type AppNotification = {
  action?: {
    dareId?: string;
    evidenceObjectId?: string;
    juryCaseId?: string;
    kycVerificationId?: string;
    transactionId?: string;
    type?: string;
    withdrawalId?: string;
  } | null;
  body: string;
  createdLabel: string;
  id: string;
  kind: NotificationKind;
  read: boolean;
  title: string;
  type: string;
};
