import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { ActionButton } from '../../../src/components/ui/ActionButton';
import { EscrowBreakdown } from '../../../src/components/ui/EscrowBreakdown';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { InlineAlert } from '../../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { TrustBadge } from '../../../src/components/ui/TrustBadge';
import { DareFlowFrame } from '../../../src/features/dares/components/DareFlowFrame';
import { formatDareTypeLabel, formatFundingModelLabel } from '../../../src/features/create/createLabels';
import { CheckLine, acceptDareStyles as styles } from '../../../src/features/feed/components/AcceptDareParts';
import { useDareDetail } from '../../../src/features/feed/useDareDetail';
import { formatNgnFromKobo } from '../../../src/features/me/format';
import { useMe } from '../../../src/features/me/useMe';
import { acceptDareWithQuote, getAcceptQuote, type AcceptQuoteResponse } from '../../../src/lib/actions/endpoints';
import type { ActionErrorCode } from '../../../src/lib/actions/types';
import { ACTIVE_COURT_COMMITMENT_MESSAGE } from '../../../src/lib/errors/userMessages';
import { colors } from '../../../src/theme/tokens';

export default function AcceptDareScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error: meError, loading: meLoading } = useMe();
  const { dare, error: detailError, loading: detailLoading, source } = useDareDetail(id);
  const [quote, setQuote] = useState<AcceptQuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitErrorCode, setSubmitErrorCode] = useState<ActionErrorCode | null>(null);

  useEffect(() => {
    if (!dare?.id || !isUuid(dare.id)) {
      setQuote(null);
      setQuoteError(null);
      setQuoteLoading(false);
      return undefined;
    }

    let mounted = true;
    setQuoteLoading(true);
    setQuoteError(null);
    setSubmitError(null);
    setSubmitErrorCode(null);

    void getAcceptQuote(dare.id).then((result) => {
      if (!mounted) return;
      if (result.ok) {
        setQuote(result.data);
        setQuoteError(null);
      } else {
        setQuote(null);
        setQuoteError(result.error.message);
      }
      setQuoteLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [dare?.id]);

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

  const isBackendDare = isUuid(dare.id);
  const dareType = quote?.dareType ?? dare.dareType ?? 'skill';
  const isTask = dareType === 'task';
  const fundingModelValue = quote?.fundingModel ?? dare.fundingModel;
  const fundingModel = formatFundingModelLabel(fundingModelValue, dareType);
  const rewardKobo = quote?.rewardAmount ?? dare.rewardKobo ?? 0;
  const challengerStakeKobo = quote?.challengerStakeAmount ?? (isTask ? 0 : dare.stakeKobo);
  const totalDueKobo = quote?.totalDueAmount ?? challengerStakeKobo;
  const isOpen = dare.status === 'open';
  const quoteReady = !isBackendDare || Boolean(quote);
  const quoteAllowsAccept = !isBackendDare || quote?.canAccept === true;
  const canAccept = isOpen && data.capabilities.canAcceptDare && quoteReady && quoteAllowsAccept && !submitting;
  const acceptBlockedMessage = getAcceptBlockedMessage(quote);
  const showGoToCourtAction = quote?.reasonCode === 'ACTIVE_COURT_COMMITMENT' ||
    submitErrorCode === 'ACTIVE_COURT_COMMITMENT';

  return (
    <DareFlowFrame
      eyebrow="Accept DARE"
      onBack={() => router.back()}
      title="Accept review."
      subtitle={isTask ? 'Task-Based acceptance reserves your performer slot without locking a performer stake.' : 'Accepting locks your challenger stake and opens ready-up after confirmation.'}
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

      {quoteError ? (
        <InlineAlert
          tone="danger"
          title="Accept quote unavailable"
          message={quoteError}
        />
      ) : null}

      {submitError ? (
        <InlineAlert
          tone="danger"
          title="Accept failed"
          message={submitError}
        />
      ) : null}

      {acceptBlockedMessage ? (
        <InlineAlert
          tone="info"
          title={acceptBlockedMessage.title}
          message={acceptBlockedMessage.message}
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

      <EscrowBreakdown
        platformFeeKobo={0}
        stakeKobo={challengerStakeKobo}
        stakeLabel={quote?.copy.escrowLabel ?? (isTask ? 'Performer money locked' : 'Challenger stake')}
        title={quote?.copy.title ?? (isTask ? 'Task-Based acceptance' : 'Challenger escrow')}
        totalKobo={totalDueKobo}
        totalLabel={isTask ? 'Total to lock from you' : 'Total to lock'}
      />

      <View style={styles.checkPanel}>
        <Text style={styles.panelTitle}>Acceptance checks</Text>
        <CheckLine label="DARE type" value={formatDareTypeLabel(dareType)} />
        <CheckLine label="Funding" value={fundingModel} />
        <CheckLine
          label="Escrow"
          value={quote?.copy.primary ?? (isTask
            ? `Performer money is not locked. The Darer reward is ${formatNgnFromKobo(rewardKobo)}.`
            : 'Challenger stake is reserved after confirmation')}
        />
        <CheckLine label={isTask ? 'Reward' : 'Stake'} value={isTask ? formatNgnFromKobo(rewardKobo) : formatNgnFromKobo(dare.stakeKobo)} />
        <CheckLine label="Resolution" value={`${dare.resolution} with dispute window`} />
        <CheckLine label="KYC" value="Tier and limits checked before ready-up" />
      </View>

      <InlineAlert
        tone="warning"
        title="Accept only clear rules"
        message={quote?.copy.confirmation ?? 'Do not accept if the win condition, timing, or dispute path is unclear.'}
      />

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Confirm accept DARE"
          disabled={!canAccept}
          label={submitting ? 'Accepting' : quoteLoading ? 'Loading quote' : acceptBlockedMessage ? 'Cannot accept' : 'Confirm accept'}
          onPress={() => {
            void handleAcceptDare();
          }}
        />
        {showGoToCourtAction ? (
          <ActionButton
            accessibilityLabel="Go to your current Court"
            label="Go to Court"
            onPress={() => router.push('/(tabs)/court')}
            variant="secondary"
          />
        ) : null}
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

    if (!quote) {
      setSubmitError('Acceptance details are still loading. Try again in a moment.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitErrorCode(null);

    const result = await acceptDareWithQuote(currentDare.id, quote);
    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitErrorCode(result.error.code);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: `/dare/${currentDare.id}/accept-receipt`,
      params: {
        courtSessionId: result.data.courtSessionId,
        dareType: result.data.dareType,
        reference: result.data.challengerEscrowHoldId ?? result.data.courtSessionId,
        rewardAmount: String(result.data.rewardAmount),
        settlementPlatformFeeAmount: String(result.data.quote.settlementPlatformFeeAmount),
        stakeAmount: String(result.data.quote.challengerStakeAmount),
        status: result.data.status,
        totalDueAmount: String(result.data.quote.totalDueAmount),
      },
    });
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getAcceptBlockedMessage(quote: AcceptQuoteResponse | null) {
  if (!quote || quote.canAccept) return null;

  if (quote.reasonCode === 'SELF_CHALLENGE') {
    return {
      title: 'Created by you',
      message: 'You cannot accept your own DARE. Share it or wait for another eligible player to accept.',
    };
  }

  if (quote.reasonCode === 'TARGETED_TO_ANOTHER_USER') {
    return {
      title: 'Reserved DARE',
      message: 'This DARE is reserved for another player.',
    };
  }

  if (quote.reasonCode === 'ACTIVE_COURT_COMMITMENT') {
    return {
      title: 'Court already active',
      message: ACTIVE_COURT_COMMITMENT_MESSAGE,
    };
  }

  return {
    title: 'Not open',
    message: 'This DARE is not accepting players right now.',
  };
}
