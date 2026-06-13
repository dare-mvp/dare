import { useCallback, useEffect, useRef, useState } from 'react';

import { sendCourtMessage } from '../../lib/actions/endpoints';
import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { isUuid } from '../../lib/ids';
import { supabaseClient } from '../../lib/supabase/client';
import { uniqueRealtimeChannelName } from '../../lib/supabase/realtimeChannel';
import { useAuth } from '../auth/AuthProvider';

export type ChatMessage = {
  createdAt: string;
  id: string;
  isOwn: boolean;
  message: string;
  userId: string;
  usernameSnapshot: string | null;
};

type CourtChatState = {
  error: string | null;
  loading: boolean;
  messages: ChatMessage[];
  send: (text: string) => Promise<void>;
  sendError: string | null;
  sending: boolean;
  source: 'mock' | 'server';
};

type ChatRow = {
  created_at: string;
  id: string;
  message: string;
  user_id: string | null;
  username_snapshot: string | null;
};

export function useCourtChat(dareId?: string): CourtChatState {
  const auth = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [source, setSource] = useState<'mock' | 'server'>('mock');
  const sentIdsRef = useRef<Set<string>>(new Set());
  const pendingOwnMessageRef = useRef<{ message: string; tempId: string } | null>(
    null,
  );
  const userId = auth.user?.id ?? null;

  useEffect(() => {
    if (!supabaseClient || auth.status !== 'authenticated' || !isUuid(dareId)) {
      setMessages([]);
      setError(null);
      setSendError(null);
      setSource('mock');
      setLoading(false);
      pendingOwnMessageRef.current = null;
      sentIdsRef.current.clear();
      return;
    }

    let mounted = true;
    setLoading(true);
    setSource('server');

    supabaseClient
      .from('court_chat_messages')
      .select('id,user_id,username_snapshot,message,created_at')
      .eq('dare_id', dareId)
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data, error: queryError }) => {
        if (!mounted) return;
        if (queryError) {
          setError(getLoadUserMessage('court messages'));
        } else {
          setMessages(mapRows((data ?? []) as ChatRow[], userId));
          setSource('server');
          setError(null);
        }
        setLoading(false);
      });

    const channel = supabaseClient
      .channel(uniqueRealtimeChannelName(`court-chat-${dareId}`))
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: `dare_id=eq.${dareId}`,
          schema: 'public',
          table: 'court_chat_messages',
        },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as ChatRow;
          const pendingOwnMessage = pendingOwnMessageRef.current;
          if (row.user_id === userId && pendingOwnMessage && pendingOwnMessage.message === row.message) {
            pendingOwnMessageRef.current = null;
            setMessages((prev) =>
              prev.map((message) =>
                message.id === pendingOwnMessage.tempId
                  ? mapRow(row, userId)
                  : message,
              ),
            );
            return;
          }

          if (sentIdsRef.current.has(row.id)) {
            sentIdsRef.current.delete(row.id);
            return;
          }
          setMessages((prev) => [...prev, mapRow(row, userId)]);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabaseClient?.removeChannel(channel);
    };
  }, [auth.status, dareId, userId]);

  const send = useCallback(async (text: string) => {
    if (!isUuid(dareId) || auth.status !== 'authenticated') return;

    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) return;

    const tempId = `temp-${Date.now()}`;
    const tempMessage: ChatMessage = {
      createdAt: new Date().toISOString(),
      id: tempId,
      isOwn: true,
      message: trimmed,
      userId: userId ?? '',
      usernameSnapshot: null,
    };

    setSending(true);
    setSendError(null);
    pendingOwnMessageRef.current = { message: trimmed, tempId };
    setMessages((prev) => [...prev, tempMessage]);

    const result = await sendCourtMessage(dareId, { message: trimmed });

    if (!result.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setSendError(result.error.message);
      pendingOwnMessageRef.current = null;
      setSending(false);
      return;
    }

    sentIdsRef.current.add(result.data.messageId);
    pendingOwnMessageRef.current = null;
    setMessages((prev) =>
      prev.some((m) => m.id === result.data.messageId)
        ? prev
        : prev.map((m) =>
          m.id === tempId
            ? {
              ...m,
              id: result.data.messageId,
              usernameSnapshot: result.data.usernameSnapshot,
            }
            : m,
        ),
    );
    setSending(false);
  }, [auth.status, dareId, userId]);

  return { error, loading, messages, send, sendError, sending, source };
}

function mapRows(rows: ChatRow[], userId: string | null): ChatMessage[] {
  return rows.map((row) => mapRow(row, userId));
}

function mapRow(row: ChatRow, userId: string | null): ChatMessage {
  return {
    createdAt: row.created_at,
    id: row.id,
    isOwn: row.user_id === userId,
    message: row.message,
    userId: row.user_id ?? '',
    usernameSnapshot: row.username_snapshot,
  };
}
