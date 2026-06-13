import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ConnectionBanner } from '../../src/components/ui/ConnectionBanner';
import { CourtArena } from '../../src/features/court/components/CourtArena';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { CourtLiveRoomPanel } from '../../src/features/court/components/CourtLiveRoomPanel';
import { CourtPlayActions } from '../../src/features/court/components/CourtPlayActions';
import { CourtPlayAlerts } from '../../src/features/court/components/CourtPlayAlerts';
import { CourtResolutionPanel } from '../../src/features/court/components/CourtResolutionPanel';
import { CourtStatusPanel } from '../../src/features/court/components/CourtStatusPanel';
import { getResolutionDisabledReason } from '../../src/features/court/courtPlayStatus';
import { canUseNativeLiveKit } from '../../src/features/court/liveKitRuntime';
import { withCourtLiveRoom } from '../../src/features/court/liveRoom';
import { useActiveCourtSession } from '../../src/features/court/useActiveCourtSession';
import { useCourtQuestion } from '../../src/features/court/useCourtQuestion';
import { useLiveCourtPresence } from '../../src/features/court/useLiveCourtPresence';
import { useMe } from '../../src/features/me/useMe';
import {
  completeDare,
  forfeitDare,
  getSettlementStatus,
  recordCourtHeartbeat,
  recordWitnessAttendance,
  submitDareAnswer,
  submitResultClaim,
  submitWitnessVote,
} from '../../src/lib/actions/endpoints';
import { isUuid } from '../../src/lib/ids';
import { activeCourtSession } from '../../src/mocks/court';

type WitnessVote = 'A' | 'B';

export default function CourtPlayScreen() {
  const router = useRouter();
  const { courtSessionId, dareId } = useLocalSearchParams<{
    courtSessionId?: string;
    dareId?: string;
  }>();
  const { data } = useMe();
  const court = useActiveCourtSession(dareId);
  const courtQuestion = useCourtQuestion(dareId, court.session?.resolutionType);
  const [answerText, setAnswerText] = useState('');
  const [claimRationale, setClaimRationale] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [witnessEligible, setWitnessEligible] = useState(false);
  const [witnessVote, setWitnessVote] = useState<WitnessVote | null>(null);
  const baseSession = court.session ?? activeCourtSession;
  const resolvedDareId = isUuid(dareId) ? dareId : baseSession.dareId;
  const livePresence = useLiveCourtPresence({
    dareId: resolvedDareId,
    enabled: court.source === 'server' && Boolean(court.session),
    nativeVideoEnabled: canUseNativeLiveKit(),
    phase: baseSession.phase,
    viewerRole: baseSession.viewerRole,
  });
  const session = court.session ? withCourtLiveRoom(baseSession, livePresence.liveState) : activeCourtSession;
  const question = courtQuestion.question;
  const isParticipant = session.viewerRole !== 'spectator';
  const canPlay = session.phase === 'active' || session.phase === 'awaiting_result';
  const resolutionDisabledReason = getResolutionDisabledReason(session);
  const canSubmit = session.resolutionType === 'answer_key' && session.phase === 'active' && isParticipant && data.capabilities.canAcceptDare && answerText.trim().length > 0 && !submitting && !resolutionDisabledReason;

  useEffect(() => {
    setAnswerText('');
  }, [question.id]);

  useEffect(() => {
    setActionError(null);
    setActionNotice(null);
    setWitnessEligible(false);
    setWitnessVote(null);
  }, [resolvedDareId]);

  useEffect(() => {
    if (livePresence.error) setActionError(livePresence.error);
  }, [livePresence.error]);

  useEffect(() => {
    if (!isUuid(resolvedDareId) || !isParticipant || session.phase !== 'active') return;

    let mounted = true;
    const interval = setInterval(() => {
      recordCourtHeartbeat(resolvedDareId).then((result) => {
        if (mounted && !result.ok) {
          setActionError(result.error.message);
        }
      });
    }, 15_000);

    void recordCourtHeartbeat(resolvedDareId);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isParticipant, resolvedDareId, session.phase]);

  useEffect(() => {
    if (!isUuid(resolvedDareId) || session.phase !== 'active' || session.resolutionType !== 'witnessed' || session.viewerRole !== 'spectator') return;

    let mounted = true;
    const updateWitnessAttendance = async () => {
      const result = await recordWitnessAttendance(resolvedDareId);
      if (!mounted) return;
      if (!result.ok) {
        setWitnessEligible(false);
        setActionError(result.error.message);
        return;
      }
      setWitnessEligible(result.data.eligibleToVote);
      setActionError(null);
    };

    void updateWitnessAttendance();
    const interval = setInterval(() => {
      void updateWitnessAttendance();
    }, 15_000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [resolvedDareId, session.phase, session.resolutionType, session.viewerRole]);

  return (
    <CourtFlowFrame
      eyebrow="Court play"
      onBack={() => router.back()}
      title="Beat the clock."
      subtitle="Scores can show during play. Final payout waits for settlement confirmation."
    >
      <ConnectionBanner state={session.connectionState} message="Heartbeat is active." />
      <CourtPlayAlerts
        actionError={actionError}
        actionNotice={actionNotice}
        courtError={court.error}
        courtQuestion={courtQuestion}
        courtSource={court.source}
        session={session}
      />
      <CourtLiveRoomPanel
        liveRoom={session.liveRoom}
        liveState={livePresence.liveState}
        onConnectionStatus={livePresence.recordConnectionStatus}
      />
      <CourtArena session={session} />
      <CourtResolutionPanel
        answerText={answerText}
        claimRationale={claimRationale}
        courtSource={court.source}
        disabledReason={resolutionDisabledReason}
        onChangeAnswer={setAnswerText}
        onChangeRationale={setClaimRationale}
        onSubmitResultClaim={(outcome) => {
          void handleSubmitResultClaim(outcome);
        }}
        onSubmitWitnessVote={(vote) => {
          void handleSubmitWitnessVote(vote);
        }}
        question={question}
        session={session}
        submitting={submitting}
        witnessEligible={witnessEligible}
        witnessVote={witnessVote}
      />
      <CourtStatusPanel session={session} />
      <CourtPlayActions
        canPlay={canPlay}
        canSubmit={canSubmit}
        isParticipant={isParticipant}
        onForfeit={() => {
          void handleForfeit();
        }}
        onOpenChat={() => router.push({ pathname: '/court/chat', params: { dareId: resolvedDareId } })}
        onSubmitAnswer={() => {
          void handleSubmitAnswer();
        }}
        showAnswerSubmit={session.resolutionType === 'answer_key'}
        submitDisabledReason={resolutionDisabledReason}
        submitting={submitting}
      />
    </CourtFlowFrame>
  );

  async function handleSubmitAnswer() {
    if (session.resolutionType !== 'answer_key') return;
    if (session.phase !== 'active') {
      setActionError('Answer submission is closed for this Court state.');
      return;
    }
    if (resolutionDisabledReason) {
      setActionError(resolutionDisabledReason);
      return;
    }

    if (!isUuid(resolvedDareId) || courtQuestion.source !== 'server' || !isUuid(question.id)) {
      router.push('/court/result');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    const result = await submitDareAnswer(resolvedDareId, {
      answerText: answerText.trim(),
      questionId: question.id,
    });

    if (!result.ok) {
      setActionError(result.error.message);
      setSubmitting(false);
      return;
    }

    const completeResult = await completeDare(resolvedDareId);
    if (!completeResult.ok) {
      const suppressCompleteError = await shouldSuppressCompleteFailure(resolvedDareId, completeResult.error.code);
      setSubmitting(false);
      if (!suppressCompleteError) {
        setActionError(completeResult.error.message);
        return;
      }
    } else {
      setSubmitting(false);
    }

    router.push({
      pathname: '/court/result',
      params: {
        courtSessionId,
        dareId: result.data.dareId,
        scoreA: String(result.data.scoreA),
        scoreB: String(result.data.scoreB),
        status: completeResult.ok ? completeResult.data.status : 'awaiting_result',
        winnerId: completeResult.ok ? completeResult.data.winnerId ?? undefined : undefined,
      },
    });
  }

  async function handleSubmitResultClaim(
    outcome: 'challenger_won' | 'dispute' | 'issuer_won' | 'performer_completed' | 'void',
  ) {
    if (resolutionDisabledReason) {
      setActionError(resolutionDisabledReason);
      setActionNotice(null);
      return;
    }

    if (!isUuid(resolvedDareId)) {
      router.push('/court/result');
      return;
    }

    if (
      session.resolutionType === 'evidence' &&
      outcome !== 'void' &&
      outcome !== 'dispute'
    ) {
      router.push({
        pathname: '/disputes/evidence-upload',
        params: {
          claimOutcome: outcome,
          dareId: resolvedDareId,
          mode: 'result-claim',
          rationale: claimRationale,
        },
      });
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    const claimResult = await submitResultClaim(resolvedDareId, {
      claimedOutcome: outcome,
      evidenceObjectIds: [],
      rationale: claimRationale || undefined,
    });

    if (!claimResult.ok) {
      setActionError(claimResult.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/court/result',
      params: {
        claimState: claimResult.data.claimState,
        dareId: claimResult.data.dareId,
        status: claimResult.data.dareStatus,
        winnerId: claimResult.data.agreedWinnerId ?? undefined,
      },
    });
  }

  async function handleSubmitWitnessVote(vote: WitnessVote) {
    if (session.resolutionType !== 'witnessed' || session.viewerRole !== 'spectator') return;
    if (resolutionDisabledReason) {
      setActionError(resolutionDisabledReason);
      setActionNotice(null);
      return;
    }
    if (session.phase !== 'active') {
      setActionError('Witness voting is closed for this Court state.');
      setActionNotice(null);
      return;
    }

    if (!isUuid(resolvedDareId)) {
      setActionError('Court is not ready for witness voting yet.');
      setActionNotice(null);
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    if (!witnessEligible) {
      setActionError('Stay in the live Court a little longer before voting.');
      setActionNotice(null);
      setSubmitting(false);
      return;
    }

    const voteResult = await submitWitnessVote(resolvedDareId, { vote });

    if (!voteResult.ok) {
      setActionError(voteResult.error.message);
      setSubmitting(false);
      return;
    }

    setWitnessVote(voteResult.data.vote);
    setActionNotice('Your witness vote was recorded. Final settlement still waits for the Court result rules.');
    if (court.source === 'server') {
      try {
        await court.refresh();
      } catch {
        setActionError('Your vote was recorded, but the latest Court state could not be loaded.');
      }
    }
    setSubmitting(false);
  }

  async function handleForfeit() {
    if (!isUuid(resolvedDareId)) {
      router.push('/court/result');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    const result = await forfeitDare(resolvedDareId);
    if (!result.ok) {
      setActionError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/court/result',
      params: {
        dareId: result.data.dareId,
        status: result.data.status,
      },
    });
  }
}

async function shouldSuppressCompleteFailure(dareId: string, errorCode: string) {
  if (errorCode !== 'INVALID_STATE') return false;

  const settlementResult = await getSettlementStatus(dareId);
  if (!settlementResult.ok) return false;

  return settlementResult.data.settlement.reason === 'result_not_ready';
}
