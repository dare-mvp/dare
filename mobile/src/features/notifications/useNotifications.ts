import { useCallback, useEffect, useState } from 'react';

import {
  markAllNotificationsRead as markAllNotificationsReadAction,
  markNotificationRead as markNotificationReadAction,
} from '../../lib/actions/endpoints';
import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { formatRelativeTime } from '../../lib/format/time';
import { supabaseClient } from '../../lib/supabase/client';
import { uniqueRealtimeChannelName } from '../../lib/supabase/realtimeChannel';
import { notifications as mockNotifications } from '../../mocks/notifications';
import { useAuth } from '../auth/AuthProvider';
import { AppNotification, NotificationKind } from './types';
import type { NotificationAction } from './notificationDestinations';

type NotificationSource = 'mock' | 'server';

type NotificationRow = {
  action: unknown;
  body: string;
  created_at: string;
  id: string;
  is_read: boolean;
  title: string;
  type: string;
};

type NotificationsState = {
  error: string | null;
  items: AppNotification[];
  loading: boolean;
  markAllRead: () => Promise<void>;
  markRead: (notificationId: string) => Promise<void>;
  mutating: boolean;
  refresh: () => Promise<void>;
  source: NotificationSource;
};

export function useNotifications(): NotificationsState {
  const auth = useAuth();
  const userId = auth.user?.id ?? null;
  const [items, setItems] = useState<AppNotification[]>(() =>
    auth.status === 'authenticated' || auth.status === 'loading' ? [] : mockNotifications,
  );
  const [source, setSource] = useState<NotificationSource>(() =>
    auth.status === 'authenticated' || auth.status === 'loading' ? 'server' : 'mock',
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(auth.status === 'loading');
  const [mutating, setMutating] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (auth.status === 'loading') {
      setLoading(true);
      return;
    }

    if (auth.status !== 'authenticated' || !supabaseClient) {
      setItems(mockNotifications);
      setSource('mock');
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error: queryError } = await supabaseClient
      .from('notifications')
      .select('id,type,title,body,is_read,created_at,action')
      .order('created_at', { ascending: false })
      .limit(50);

    if (queryError) {
      setItems([]);
      setSource('server');
      setError(getLoadUserMessage('notifications'));
    } else {
      setItems(mapNotificationRows((data ?? []) as NotificationRow[]));
      setSource('server');
      setError(null);
    }

    setLoading(false);
  }, [auth.status]);

  const markRead = useCallback(async (notificationId: string) => {
    const previous = items;
    setItems((current) => current.map((notification) => (
      notification.id === notificationId ? { ...notification, read: true } : notification
    )));

    if (source === 'mock') return;

    setMutating(true);
    const result = await markNotificationReadAction(notificationId);
    if (!result.ok) {
      setItems(previous);
      setError(result.error.message);
    } else {
      setError(null);
    }
    setMutating(false);
  }, [items, source]);

  const markAllRead = useCallback(async () => {
    const previous = items;
    setItems((current) => current.map((notification) => ({ ...notification, read: true })));

    if (source === 'mock') return;

    setMutating(true);
    const result = await markAllNotificationsReadAction();
    if (!result.ok) {
      setItems(previous);
      setError(result.error.message);
    } else {
      setError(null);
    }
    setMutating(false);
  }, [items, source]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (auth.status === 'loading') {
        if (mounted) setLoading(true);
        return;
      }

      if (auth.status !== 'authenticated' || !supabaseClient) {
        if (mounted) {
          setItems(mockNotifications);
          setSource('mock');
          setError(null);
          setLoading(false);
        }
        return;
      }

      if (mounted) setLoading(true);
      const { data, error: queryError } = await supabaseClient
        .from('notifications')
        .select('id,type,title,body,is_read,created_at,action')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!mounted) return;

      if (queryError) {
        setItems([]);
        setSource('server');
        setError(getLoadUserMessage('notifications'));
      } else {
        setItems(mapNotificationRows((data ?? []) as NotificationRow[]));
        setSource('server');
        setError(null);
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [auth.status]);

  useEffect(() => {
    if (auth.status !== 'authenticated' || !userId || !supabaseClient) return undefined;

    const channel = supabaseClient
      .channel(uniqueRealtimeChannelName(`notification-inbox-${userId}`))
      .on(
        'postgres_changes',
        { event: '*', filter: `user_id=eq.${userId}`, schema: 'public', table: 'notifications' },
        () => {
          void loadNotifications();
        },
      )
      .subscribe();

    return () => {
      void supabaseClient?.removeChannel(channel);
    };
  }, [auth.status, loadNotifications, userId]);

  return {
    error,
    items,
    loading,
    markAllRead,
    markRead,
    mutating,
    refresh: loadNotifications,
    source,
  };
}

function mapNotificationRows(rows: NotificationRow[]): AppNotification[] {
  return rows.map((row) => ({
    action: mapNotificationAction(row.action),
    body: row.body,
    createdLabel: formatRelativeTime(row.created_at),
    id: row.id,
    kind: mapNotificationKind(row.type),
    read: row.is_read,
    title: row.title,
    type: row.type,
  }));
}

function mapNotificationAction(value: unknown): NotificationAction | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  return {
    dareId: optionalString(record.dareId),
    evidenceObjectId: optionalString(record.evidenceObjectId),
    juryCaseId: optionalString(record.juryCaseId),
    kycVerificationId: optionalString(record.kycVerificationId),
    transactionId: optionalString(record.transactionId),
    type: optionalString(record.type),
    withdrawalId: optionalString(record.withdrawalId),
  };
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function mapNotificationKind(type: string): NotificationKind {
  if (type.startsWith('court_') || type === 'match_result') return 'court';
  if (type.startsWith('wallet_') || type.startsWith('withdrawal_') || type === 'payout_sent') return 'wallet';
  if (type.startsWith('dispute_')) return 'dispute';
  if (type.startsWith('jury_')) return 'jury';
  return 'system';
}
