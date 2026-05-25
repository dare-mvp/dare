import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { ConnectionBanner } from '../../src/components/ui/ConnectionBanner';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { CourtPhaseCard } from '../../src/features/court/components/CourtPhaseCard';
import { useActiveCourtSession } from '../../src/features/court/useActiveCourtSession';
import { useMe } from '../../src/features/me/useMe';
import { isUuid } from '../../src/lib/ids';
import { markDareReady, ReadyDareResponse } from '../../src/lib/actions/endpoints';
import { colors, fonts, radius, spacing } from '../../src/theme/tokens';
import { useEffect, useState } from 'react';

export default function CourtReadyScreen() {
  const router = useRouter();
  const { dareId } = useLocalSearchParams<{ dareId?: string }>();
  const { data, error, loading } = useMe();
  const court = useActiveCourtSession(dareId);
  const [submitting, setSubmitting] = useState(false);
  const [readyState, setReadyState] = useState<ReadyDareResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const session = court.session ? { ...court.session, phase: 'ready' as const } : null;
  const canReady = data.capabilities.canAcceptDare && !submitting && readyState?.phase !== 'ready_check';

  useEffect(() => {
    if (court.source !== 'server' || court.session?.phase !== 'active') return;

    router.replace({
      pathname: '/court/countdown',
      params: {
        dareId: court.session.dareId ?? dareId,
      },
    });
  }, [court.session?.dareId, court.session?.phase, court.source, dareId, router]);

  return (
    <CourtFlowFrame
      eyebrow="Court ready"
      onBack={() => router.back()}
      title="Ready-up required."
      subtitle="Both players must confirm presence before countdown starts."
    >
      {data.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing account' : 'Preview data'}
          message={loading ? 'Ready-up eligibility is loading.' : 'Live ready-up checks appear after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="Ready-up eligibility unavailable"
          message={error}
        />
      ) : null}

      {court.error ? (
        <InlineAlert
          tone="danger"
          title="Court state unavailable"
          message={court.error}
        />
      ) : null}

      {submitError ? (
        <InlineAlert
          tone="danger"
          title="Ready-up failed"
          message={submitError}
        />
      ) : null}

      {readyState?.phase === 'ready_check' ? (
        <InlineAlert
          tone="info"
          title="Ready confirmed"
          message="Waiting for the other player. This screen will move forward once the court becomes active."
        />
      ) : null}

      <ConnectionBanner state={session?.connectionState ?? 'connected'} message="Keep the app open while both players ready up." />
      {session ? (
        <CourtPhaseCard
          body="Ready-up protects both players from accidental starts and stale sessions."
          statusLabel="READY-UP"
          statusTone="warning"
          title={session.title}
        >
          <PlayerReadyRow name={session.playerA.name} ready={readyState?.playerAReady ?? session.playerA.isReady} you={session.playerA.isYou} />
          <PlayerReadyRow name={session.playerB.name} ready={readyState?.playerBReady ?? session.playerB.isReady} you={session.playerB.isYou} />
        </CourtPhaseCard>
      ) : (
        <InlineAlert
          tone={court.loading ? 'info' : 'warning'}
          title={court.loading ? 'Loading court' : 'No active ready-up'}
          message={court.loading ? 'Checking your court session.' : 'Accept a DARE before entering ready-up.'}
        />
      )}
      <InlineAlert
        tone="warning"
        title="Leaving can affect the match"
        message="If you disappear during ready-up or court play, the match may enter reconnect or forfeit review."
      />
      <ActionButton
        accessibilityLabel="Confirm ready"
        disabled={!canReady}
        icon={<CheckCircle2 color={colors.text} size={18} />}
        label={readyState?.phase === 'ready_check' ? 'Waiting opponent' : submitting ? 'Confirming' : 'Confirm ready'}
        onPress={() => {
          void handleReady();
        }}
      />
    </CourtFlowFrame>
  );

  async function handleReady() {
    if (!isUuid(dareId)) {
      router.push('/court/countdown');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const result = await markDareReady(dareId);
    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setReadyState(result.data);
    await court.refresh();

    if (result.data.phase === 'active') {
      router.replace({
        pathname: '/court/countdown',
        params: {
          courtSessionId: result.data.courtSessionId,
          dareId: result.data.dareId,
        },
      });
    }
  }
}

function PlayerReadyRow({ name, ready, you = false }: { name: string; ready: boolean; you?: boolean }) {
  return (
    <View style={styles.readyRow}>
      <View style={styles.playerCopy}>
        <Text style={styles.playerName}>{name}{you ? ' (You)' : ''}</Text>
        <Text style={styles.playerMeta}>{ready ? 'Ready confirmed' : 'Waiting for ready-up'}</Text>
      </View>
      <StatusBadge label={ready ? 'READY' : 'WAITING'} tone={ready ? 'success' : 'warning'} />
    </View>
  );
}

const styles = StyleSheet.create({
  readyRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    padding: spacing[12],
  },
  playerCopy: {
    flex: 1,
    minWidth: 0,
  },
  playerName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
  },
  playerMeta: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    marginTop: spacing[4],
  },
});
