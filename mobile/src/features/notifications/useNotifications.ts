import { useCallback, useEffect, useState } from 'react';

import {
  markAllNotificationsRead as markAllNotificationsReadAction,
  markNotificationRead as markNotificationReadAction,
} from '../../lib/actions/endpoints';
import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { formatRelativeTime } from '../../lib/format/time';
import { supabaseClient } from '../../lib/supabase/client';
import { notifications as mockNotifications } from '../../mocks/notifications';
import { useAuth } from '../auth/AuthProvider';
import { AppNotification, NotificationKind } from './types';

type NotificationSource = 'mock' | 'server';

type NotificationRow = {
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
  const [items, setItems] = useState<AppNotification[]>(mockNotifications);
  const [source, setSource] = useState<NotificationSource>('mock');
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
      .select('id,type,title,body,is_read,created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (queryError) {
      setItems(mockNotifications);
      setSource('mock');
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
        .select('id,type,title,body,is_read,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!mounted) return;

      if (queryError) {
        setItems(mockNotifications);
        setSource('mock');
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
    body: row.body,
    createdLabel: formatRelativeTime(row.created_at),
    id: row.id,
    kind: mapNotificationKind(row.type),
    read: row.is_read,
    title: row.title,
  }));
}

function mapNotificationKind(type: string): NotificationKind {
  if (type.startsWith('court_') || type === 'match_result') return 'court';
  if (type.startsWith('wallet_') || type.startsWith('withdrawal_') || type === 'payout_sent') return 'wallet';
  if (type.startsWith('dispute_')) return 'dispute';
  if (type.startsWith('jury_')) return 'jury';
  return 'system';
}
