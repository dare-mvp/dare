import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  enterLiveCourt,
  getLiveCourtState,
  LiveCourtStateResponse,
  recordLiveCourtPresence,
  RecordLiveCourtPresencePayload,
} from '../../lib/actions/endpoints';
import { isUuid } from '../../lib/ids';
import type { CourtSession } from './types';

type UseLiveCourtPresenceOptions = {
  dareId?: string;
  enabled: boolean;
  nativeVideoEnabled: boolean;
  phase?: CourtSession['phase'];
  viewerRole?: CourtSession['viewerRole'];
};

type UseLiveCourtPresenceState = {
  entering: boolean;
  error: string | null;
  liveState: LiveCourtStateResponse | null;
  recordConnectionStatus: (status: RecordLiveCourtPresencePayload['connectionStatus']) => Promise<void>;
};

export function useLiveCourtPresence({
  dareId,
  enabled,
  nativeVideoEnabled,
  phase,
  viewerRole,
}: UseLiveCourtPresenceOptions): UseLiveCourtPresenceState {
  const [liveState, setLiveState] = useState<LiveCourtStateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const shouldJoin = enabled && isUuid(dareId) && isJoinablePhase(phase);
  const connectionStatusRef = useRef<RecordLiveCourtPresencePayload['connectionStatus']>('reconnecting');
  const hasEnteredRef = useRef(false);
  const mediaPayload = useMemo(() => {
    const publishMedia = viewerRole !== 'spectator';
    return {
      audioEnabled: publishMedia,
      recordingConsent: true,
      videoEnabled: publishMedia,
    };
  }, [viewerRole]);

  const recordConnectionStatus = useCallback(
    async (connectionStatus: RecordLiveCourtPresencePayload['connectionStatus']) => {
      if (!shouldJoin || !isUuid(dareId) || !hasEnteredRef.current) return;
      connectionStatusRef.current = connectionStatus;

      const result = await recordLiveCourtPresence(dareId, {
        ...mediaPayload,
        connectionStatus,
      });

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setLiveState(result.data);
      setError(null);
    },
    [dareId, mediaPayload, shouldJoin],
  );

  useEffect(() => {
    if (!shouldJoin || !isUuid(dareId)) {
      setLiveState(null);
      setError(null);
      setEntering(false);
      connectionStatusRef.current = 'reconnecting';
      hasEnteredRef.current = false;
      return undefined;
    }

    let mounted = true;
    const syncPresence = async (mode: 'enter' | 'heartbeat' | 'state') => {
      if (mode === 'enter') setEntering(true);
      const result = mode === 'enter'
        ? await enterLiveCourt(dareId, mediaPayload)
        : mode === 'heartbeat' && hasEnteredRef.current
          ? await recordLiveCourtPresence(dareId, {
            ...mediaPayload,
            connectionStatus: connectionStatusRef.current,
          })
          : await getLiveCourtState(dareId);

      if (!mounted) return;
      setEntering(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      if (mode === 'enter') hasEnteredRef.current = true;
      setLiveState(result.data);
      setError(null);
    };

    void syncPresence(nativeVideoEnabled ? 'enter' : 'state');
    const interval = setInterval(() => {
      void syncPresence(nativeVideoEnabled ? 'heartbeat' : 'state');
    }, 15_000);

    return () => {
      mounted = false;
      clearInterval(interval);
      if (hasEnteredRef.current) {
        connectionStatusRef.current = 'left';
        void recordLiveCourtPresence(dareId, {
          ...mediaPayload,
          connectionStatus: 'left',
        });
      }
      hasEnteredRef.current = false;
    };
  }, [dareId, mediaPayload, nativeVideoEnabled, shouldJoin]);

  return { entering, error, liveState, recordConnectionStatus };
}

function isJoinablePhase(phase?: CourtSession['phase']) {
  return phase === 'ready' || phase === 'countdown' || phase === 'active' || phase === 'awaiting_result';
}
