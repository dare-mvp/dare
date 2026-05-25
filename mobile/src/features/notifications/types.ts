export type NotificationKind =
  | 'court'
  | 'wallet'
  | 'dispute'
  | 'jury'
  | 'system';

export type AppNotification = {
  body: string;
  createdLabel: string;
  id: string;
  kind: NotificationKind;
  read: boolean;
  title: string;
};
