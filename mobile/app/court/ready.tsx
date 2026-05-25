import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { ConnectionBanner } from '../../src/components/ui/ConnectionBanner';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { CourtPhaseCard } from '../../src/features/court/components/CourtPhaseCard';
import { useMe } from '../../src/features/me/useMe';
import { isUuid } from '../../src/lib/ids';
import { markDareReady } from '../../src/lib/actions/endpoints';
import { activeCourtSession } from '../../src/mocks/court';
import { colors, fonts, radius, spacing } from '../../src/theme/tokens';
import { useState } from 'react';

export default function CourtReadyScreen() {
  const router = useRouter();
  const { dareId } = useLocalSearchParams<{ dareId?: string }>();
  const { data, error, loading } = useMe();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const session = { ...activeCourtSession, phase: 'ready' as const };
  const canReady = data.capabilities.canAcceptDare && !submitting;

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

      {submitError ? (
        <InlineAlert
          tone="danger"
          title="Ready-up failed"
          message={submitError}
        />
      ) : null}

      <ConnectionBanner state="connected" message="Keep the app open while both players ready up." />
      <CourtPhaseCard
        body="Ready-up protects both players from accidental starts and stale sessions."
        statusLabel="READY-UP"
        statusTone="warning"
        title={session.title}
      >
        <PlayerReadyRow name={session.playerA.name} ready={session.playerA.isReady} you />
        <PlayerReadyRow name={session.playerB.name} ready={session.playerB.isReady} />
      </CourtPhaseCard>
      <InlineAlert
        tone="warning"
        title="Leaving can affect the match"
        message="If you disappear during ready-up or court play, the match may enter reconnect or forfeit review."
      />
      <ActionButton
        accessibilityLabel="Confirm ready"
        disabled={!canReady}
        icon={<CheckCircle2 color={colors.text} size={18} />}
        label={submitting ? 'Confirming' : 'Confirm ready'}
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
    router.push({
      pathname: '/court/countdown',
      params: {
        courtSessionId: result.data.courtSessionId,
        dareId: result.data.dareId,
      },
    });
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
