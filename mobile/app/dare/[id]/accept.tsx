import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ActionButton } from '../../../src/components/ui/ActionButton';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { InlineAlert } from '../../../src/components/ui/InlineAlert';
import { DareFlowFrame } from '../../../src/features/dares/components/DareFlowFrame';
import { getAcceptBlockedMessage } from '../../../src/features/feed/acceptBlockedMessage';
import {
  getAcceptTrustWarnings,
  hasBlockingAcceptWarning,
  requiresAcceptRiskAcknowledgement,
} from '../../../src/features/feed/acceptTrustWarnings';
import {
  AcceptChallengeCard,
  AcceptanceChecksPanel,
  acceptDareStyles as styles,
} from '../../../src/features/feed/components/AcceptDareParts';
import { AcceptTrustWarningPanel } from '../../../src/features/feed/components/AcceptTrustWarningPanel';
import { useDareDetail } from '../../../src/features/feed/useDareDetail';
import { useMe } from '../../../src/features/me/useMe';
import { MoneyPreviewPanel } from '../../../src/features/money/components/MoneyPreviewPanel';
import { getAcceptMoneyPreview } from '../../../src/features/money/moneyPreview';
import { acceptDareWithQuote, getAcceptQuote, type AcceptQuoteResponse } from '../../../src/lib/actions/endpoints';
import type { ActionErrorCode } from '../../../src/lib/actions/types';
import { isUuid } from '../../../src/lib/ids';
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
  const [riskAcknowledgedKey, setRiskAcknowledgedKey] = useState<string | null>(null);

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
    setRiskAcknowledgedKey(null);

    void getAcceptQuote(dare.id).then((result) => {
      if (!mounted) return;
      if (result.ok) {
        if (result.data.dareId === dare.id) {
          setQuote(result.data);
          setQuoteError(null);
        } else {
          setQuote(null);
          setQuoteError('The accept quote did not match this DARE. Refresh before accepting.');
        }
      } else {
        setQuote(null);
        setQuoteError(result.error.message);
      }
      setQuoteLoading(false);
    }).catch(() => {
      if (!mounted) return;
      setQuote(null);
      setQuoteError('Acceptance details could not load. Check your connection and try again.');
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
  const currentQuote = quote?.dareId === dare.id ? quote : null;
  const dareType = currentQuote?.dareType ?? dare.dareType ?? 'skill';
  const isTask = dareType === 'task';
  const fundingModelValue = currentQuote?.fundingModel ?? dare.fundingModel;
  const rewardKobo = currentQuote?.rewardAmount ?? dare.rewardKobo ?? 0;
  const challengerStakeKobo = currentQuote?.challengerStakeAmount ?? (isTask ? 0 : dare.stakeKobo);
  const totalDueKobo = currentQuote?.totalDueAmount ?? challengerStakeKobo;
  const settlementPlatformFeeKobo = currentQuote?.settlementPlatformFeeAmount ?? 0;
  const winnerPayoutKobo = currentQuote?.winnerPayoutAmount ?? Math.max(0, (isTask ? rewardKobo : dare.stakeKobo * 2) - settlementPlatformFeeKobo);
  const isOpen = dare.status === 'open';
  const quoteReady = !isBackendDare || Boolean(currentQuote);
  const quoteAllowsAccept = !isBackendDare || currentQuote?.canAccept === true;
  const trustWarnings = getAcceptTrustWarnings({ dare, quote: currentQuote });
  const hasBlockingRisk = hasBlockingAcceptWarning(trustWarnings);
  const riskAcknowledgementKey = getRiskAcknowledgementKey(trustWarnings);
  const riskAcknowledgementRequired = requiresAcceptRiskAcknowledgement(trustWarnings);
  const riskAcknowledged = riskAcknowledgementRequired && riskAcknowledgedKey === riskAcknowledgementKey;
  const moneyPreview = getAcceptMoneyPreview({
    dareType,
    issuerEscrowKobo: currentQuote?.issuerEscrowAmount ?? (isTask ? rewardKobo : dare.stakeKobo),
    platformFeeKobo: settlementPlatformFeeKobo,
    rewardKobo,
    source: currentQuote ? 'server' : 'estimated',
    totalDueKobo,
    winnerPayoutKobo,
  });
  const canAccept = isOpen &&
    data.capabilities.canAcceptDare &&
    quoteReady &&
    quoteAllowsAccept &&
    !hasBlockingRisk &&
    (!riskAcknowledgementRequired || riskAcknowledged) &&
    !submitting;
  const acceptBlockedMessage = getAcceptBlockedMessage(currentQuote);
  const showGoToCourtAction = currentQuote?.reasonCode === 'ACTIVE_COURT_COMMITMENT' ||
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

      <AcceptChallengeCard dare={dare} isOpen={isOpen} />

      <MoneyPreviewPanel preview={moneyPreview} />

      <AcceptanceChecksPanel
        dare={dare}
        dareType={dareType}
        fundingModel={fundingModelValue}
        quotePrimary={currentQuote?.copy.primary}
        rewardKobo={rewardKobo}
      />

      <InlineAlert
        tone="warning"
        title="Accept only clear rules"
        message={currentQuote?.copy.confirmation ?? 'Do not accept if the win condition, timing, or dispute path is unclear.'}
      />

      <AcceptTrustWarningPanel
        acknowledged={riskAcknowledged}
        onAcknowledge={() => setRiskAcknowledgedKey(riskAcknowledgementKey)}
        warnings={trustWarnings}
      />

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Confirm accept DARE"
          disabled={!canAccept}
          label={submitting
            ? 'Accepting'
            : quoteLoading
            ? 'Loading quote'
            : acceptBlockedMessage || hasBlockingRisk
            ? 'Cannot accept'
            : riskAcknowledgementRequired && !riskAcknowledged
            ? 'Acknowledge risk first'
            : 'Confirm accept'}
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

    if (!currentQuote) {
      setSubmitError('Acceptance details are still loading. Try again in a moment.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitErrorCode(null);

    const result = await acceptDareWithQuote(currentDare.id, currentQuote);
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

function getRiskAcknowledgementKey(warnings: ReturnType<typeof getAcceptTrustWarnings>) {
  return warnings
    .filter((warning) => warning.acknowledgementRequired && !warning.blocking)
    .map((warning) => warning.code)
    .sort()
    .join('|');
}
