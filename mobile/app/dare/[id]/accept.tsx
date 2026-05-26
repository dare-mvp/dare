import { useLocalSearchParams, useRouter } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../src/components/ui/ActionButton';
import { EscrowBreakdown } from '../../../src/components/ui/EscrowBreakdown';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { InlineAlert } from '../../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { TrustBadge } from '../../../src/components/ui/TrustBadge';
import { DareFlowFrame } from '../../../src/features/dares/components/DareFlowFrame';
import { useDareDetail } from '../../../src/features/feed/useDareDetail';
import { useMe } from '../../../src/features/me/useMe';
import { acceptDare } from '../../../src/lib/actions/endpoints';
import { colors, fonts, radius, spacing, typography } from '../../../src/theme/tokens';
import { useState } from 'react';

const platformFeeRate = 0.05;

export default function AcceptDareScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error: meError, loading: meLoading } = useMe();
  const { dare, error: detailError, loading: detailLoading, source } = useDareDetail(id);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!dare) {
    return (
      <DareFlowFrame
        eyebrow="Accept DARE"
        onBack={() => router.back()}
        title="DARE not found."
        subtitle="This challenge is not available right now."
      >
        {detailLoading ? (
          <InlineAlert
            tone="info"
            title="Loading DARE"
            message="Fetching the latest acceptance details."
          />
        ) : (
          <ErrorState
            body={detailError ?? 'Return to the feed and choose another open DARE.'}
            onRetry={() => router.replace('/(tabs)')}
            retryLabel="Back to feed"
            title="Unable to load DARE"
          />
        )}
      </DareFlowFrame>
    );
  }

  const platformFeeKobo = Math.round(dare.stakeKobo * platformFeeRate);
  const isOpen = dare.status === 'open';
  const canAccept = isOpen && data.capabilities.canAcceptDare && !submitting;

  return (
    <DareFlowFrame
      eyebrow="Accept DARE"
      onBack={() => router.back()}
      title="Accept review."
      subtitle="Accepting locks your stake and opens ready-up after confirmation."
    >
      {(source === 'mock' || data.source === 'mock') && !meError ? (
        <InlineAlert
          tone="info"
          title={meLoading || detailLoading ? 'Syncing DARE' : 'Preview data'}
          message={meLoading || detailLoading ? 'Acceptance eligibility is loading.' : 'Live DARE details and escrow checks appear after sign-in and sync.'}
        />
      ) : null}

      {meError ? (
        <InlineAlert
          tone="danger"
          title="Acceptance eligibility unavailable"
          message={meError}
        />
      ) : null}

      {detailError && source === 'server' ? (
        <InlineAlert
          tone="danger"
          title="DARE detail unavailable"
          message={detailError}
        />
      ) : null}

      {submitError ? (
        <InlineAlert
          tone="danger"
          title="Accept failed"
          message={submitError}
        />
      ) : null}

      <View style={styles.challengeCard}>
        <View style={styles.cardHeader}>
          <StatusBadge label={dare.status.toUpperCase()} tone={isOpen ? 'success' : 'warning'} />
          <Text style={styles.category}>{dare.category.toUpperCase()}</Text>
        </View>
        <Text style={styles.title}>{dare.title}</Text>
        <View style={styles.issuerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{dare.playerA.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.issuerCopy}>
            <Text style={styles.issuerLabel}>Issuer</Text>
            <Text style={styles.issuerName}>{dare.playerA.name}</Text>
          </View>
          <TrustBadge score={dare.playerA.trustScore} tier={dare.playerA.tier} />
        </View>
      </View>

      <EscrowBreakdown platformFeeKobo={platformFeeKobo} stakeKobo={dare.stakeKobo} />

      <View style={styles.checkPanel}>
        <Text style={styles.panelTitle}>Acceptance checks</Text>
        <CheckLine label="Escrow" value="Stake and fee reserved after confirmation" />
        <CheckLine label="KYC" value="Tier and limits checked before ready-up" />
        <CheckLine label="Rules" value={`${dare.resolution} resolution with dispute window`} />
      </View>

      <InlineAlert
        tone="warning"
        title="Accept only clear rules"
        message="Do not accept if the win condition, timing, or dispute path is unclear."
      />

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Confirm accept DARE"
          disabled={!canAccept}
          label={submitting ? 'Accepting' : 'Confirm accept'}
          onPress={() => {
            void handleAcceptDare();
          }}
        />
        <ActionButton
          accessibilityLabel="Return to DARE detail"
          label="Back to detail"
          onPress={() => router.back()}
          variant="secondary"
        />
      </View>
    </DareFlowFrame>
  );

  async function handleAcceptDare() {
    const currentDare = dare;
    if (!currentDare) return;

    if (!isUuid(currentDare.id)) {
      router.push(`/dare/${currentDare.id}/accept-receipt`);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const result = await acceptDare(currentDare.id);
    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: `/dare/${currentDare.id}/accept-receipt`,
      params: {
        courtSessionId: result.data.courtSessionId,
        reference: result.data.challengerEscrowHoldId,
        stakeAmount: String(result.data.stakeAmount),
        status: result.data.status,
      },
    });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function CheckLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.checkLine}>
      <ShieldCheck color={colors.success} size={16} />
      <View style={styles.checkCopy}>
        <Text style={styles.checkLabel}>{label}</Text>
        <Text style={styles.checkValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  challengeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[14],
    padding: spacing[16],
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  issuerRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    paddingTop: spacing[12],
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    fontWeight: '900',
  },
  issuerCopy: {
    flex: 1,
    minWidth: 0,
  },
  issuerLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  issuerName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
  },
  checkPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  panelTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  checkLine: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    paddingTop: spacing[10],
  },
  checkCopy: {
    flex: 1,
    minWidth: 0,
  },
  checkLabel: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  checkValue: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing[4],
  },
  actions: {
    gap: spacing[10],
  },
});
