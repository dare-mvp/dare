import { AppNotification } from '../features/notifications/types';

export const notifications: AppNotification[] = [
  {
    body: 'Tomi is ready. Enter court before the ready-up window closes.',
    createdLabel: '2 min ago',
    id: 'ntf-1',
    kind: 'court',
    read: false,
    title: 'Court ready-up started',
  },
  {
    body: 'Your NGN 12,000 deposit has been confirmed and added to available balance.',
    createdLabel: '18 min ago',
    id: 'ntf-2',
    kind: 'wallet',
    read: false,
    title: 'Deposit confirmed',
  },
  {
    body: 'A disputed fintech trivia result needs a blind jury vote.',
    createdLabel: '1 hr ago',
    id: 'ntf-3',
    kind: 'jury',
    read: true,
    title: 'New jury assignment',
  },
  {
    body: 'Evidence was received for Premier League quiz in court mode.',
    createdLabel: 'Yesterday',
    id: 'ntf-4',
    kind: 'dispute',
    read: true,
    title: 'Dispute evidence uploaded',
  },
  {
    body: 'Your weekly stake limit remains unchanged. Pending increases require cooling-off.',
    createdLabel: 'Yesterday',
    id: 'ntf-5',
    kind: 'system',
    read: true,
    title: 'Limit status unchanged',
  },
];
