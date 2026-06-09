import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { LiveCourtStateResponse, RecordLiveCourtPresencePayload } from '../../../lib/actions/endpoints';
import { backendConfig } from '../../../lib/config/env';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { canUseNativeLiveKit } from '../liveKitRuntime';

type LiveKitNativeModule = typeof import('@livekit/react-native');
type LiveKitClientModule = typeof import('livekit-client');

type LoadedLiveKit = {
  client: LiveKitClientModule;
  native: LiveKitNativeModule;
};

type CourtLiveKitRoomProps = {
  liveState: LiveCourtStateResponse | null;
  onConnectionStatus?: (status: RecordLiveCourtPresencePayload['connectionStatus']) => void;
};

let liveKitGlobalsRegistered = false;

export function CourtLiveKitRoom({ liveState, onConnectionStatus }: CourtLiveKitRoomProps) {
  const [loaded, setLoaded] = useState<LoadedLiveKit | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const serverUrl = backendConfig.liveKitWsUrl;
  const token = liveState?.providerToken ?? null;
  const canAttemptLiveKit = liveState?.provider === 'livekit' && Boolean(token);
  const shouldPublishMedia = liveState?.viewerRole !== 'spectator';
  const disabledReason = getDisabledReason(liveState, serverUrl);
  const shouldLoad = canAttemptLiveKit && !disabledReason;

  useEffect(() => {
    if (!shouldLoad) return undefined;

    let mounted = true;
    setLoadError(null);

    Promise.all([import('@livekit/react-native'), import('livekit-client')])
      .then(([native, client]) => {
        if (!liveKitGlobalsRegistered) {
          native.registerGlobals();
          liveKitGlobalsRegistered = true;
        }
        if (mounted) setLoaded({ client, native });
      })
      .catch(() => {
        if (mounted) setLoadError('Live video is unavailable in this build.');
      });

    return () => {
      mounted = false;
    };
  }, [shouldLoad]);

  useEffect(() => {
    if (!shouldLoad || !loaded) return undefined;

    let mounted = true;
    loaded.native.AudioSession.startAudioSession().catch(() => {
      if (mounted) setLoadError('Audio session could not start.');
    });

    return () => {
      mounted = false;
      loaded.native.AudioSession.stopAudioSession().catch(() => undefined);
    };
  }, [loaded, shouldLoad]);

  const roomOptions = useMemo(
    () => ({
      adaptiveStream: { pixelDensity: 'screen' as const },
      dynacast: true,
    }),
    [],
  );

  if (!canAttemptLiveKit) return null;
  if (disabledReason) return <LiveKitFallback message={disabledReason} />;
  if (loadError) return <LiveKitFallback message={loadError} />;
  if (!loaded || !serverUrl || !token) return <LiveKitLoading />;

  const LiveKitRoom = loaded.native.LiveKitRoom;

  return (
    <View style={styles.liveKitShell}>
      <LiveKitRoom
        audio={shouldPublishMedia}
        connect
        onConnected={() => onConnectionStatus?.('joined')}
        onDisconnected={() => onConnectionStatus?.('left')}
        onError={() => onConnectionStatus?.('reconnecting')}
        options={roomOptions}
        serverUrl={serverUrl}
        token={token}
        video={shouldPublishMedia}
      >
        <LiveKitTrackGrid client={loaded.client} native={loaded.native} />
      </LiveKitRoom>
    </View>
  );
}

function LiveKitTrackGrid({
  client,
  native,
}: {
  client: LiveKitClientModule;
  native: LiveKitNativeModule;
}) {
  const VideoTrack = native.VideoTrack;
  const tracks = native.useTracks([client.Track.Source.Camera], { onlySubscribed: false });
  const visibleTracks = tracks.slice(0, 2);

  return (
    <View style={styles.trackGrid} accessibilityLabel="LiveKit Court video tracks">
      {[0, 1].map((index) => {
        const track = visibleTracks[index];
        return (
          <View key={index} style={styles.trackTile}>
            {track && native.isTrackReference(track) ? (
              <VideoTrack objectFit="cover" trackRef={track} style={styles.trackVideo} />
            ) : (
              <Text style={styles.trackPlaceholder}>Waiting for camera</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function LiveKitLoading() {
  return (
    <View style={styles.fallback}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.fallbackText}>Starting LiveKit room...</Text>
    </View>
  );
}

function LiveKitFallback({ message }: { message: string }) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackText}>{message}</Text>
    </View>
  );
}

function getDisabledReason(liveState: LiveCourtStateResponse | null, serverUrl: string | null) {
  if (!liveState) return null;
  if (liveState.provider !== 'livekit') return null;
  if (!canUseNativeLiveKit()) return 'LiveKit needs a development or standalone build. Preview video remains available here.';
  if (!serverUrl) return 'LiveKit Cloud URL is not configured for this build.';
  if (!liveState.providerToken) return 'LiveKit room token is pending.';
  if (liveState.roomStatus === 'cancelled' || liveState.roomStatus === 'ended') return 'LiveKit room is closed.';
  return null;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    backgroundColor: colors.black,
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    gap: spacing[8],
    minHeight: 112,
    justifyContent: 'center',
    padding: spacing[12],
  },
  fallbackText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    textAlign: 'center',
  },
  liveKitShell: {
    borderColor: colors.border,
    borderRadius: radius.control,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trackGrid: {
    flexDirection: 'row',
    gap: spacing[4],
    minHeight: 160,
  },
  trackPlaceholder: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  trackTile: {
    alignItems: 'center',
    backgroundColor: colors.black,
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  trackVideo: {
    height: '100%',
    width: '100%',
  },
});
