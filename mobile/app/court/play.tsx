import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Flag, MessageSquare } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { ConnectionBanner } from '../../src/components/ui/ConnectionBanner';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { CourtArena } from '../../src/features/court/components/CourtArena';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { CourtResolutionPanel } from '../../src/features/court/components/CourtResolutionPanel';
import { CourtStatusPanel } from '../../src/features/court/components/CourtStatusPanel';
import { getResolutionNoticeMessage, getResolutionNoticeTitle } from '../../src/features/court/resolutionCopy';
import { useActiveCourtSession } from '../../src/features/court/useActiveCourtSession';
import { useCourtQuestion } from '../../src/features/court/useCourtQuestion';
import { useMe } from '../../src/features/me/useMe';
import {
  completeDare,
  forfeitDare,
  recordCourtHeartbeat,
  recordWitnessAttendance,
  submitDareAnswer,
  submitResultClaim,
  submitWitnessVote,
} from '../../src/lib/actions/endpoints';
import { isUuid } from '../../src/lib/ids';
import { activeCourtSession } from '../../src/mocks/court';
import { colors, spacing } from '../../src/theme/tokens';

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
  const session = { ...(court.session ?? activeCourtSession), phase: 'active' as const };
  const question = courtQuestion.question;
  const isParticipant = session.viewerRole !== 'spectator';
  const canSubmit = session.resolutionType === 'answer_key' && isParticipant && data.capabilities.canAcceptDare && answerText.trim().length > 0 && !submitting;

  useEffect(() => {
    setAnswerText('');
  }, [question.id]);

  useEffect(() => {
    setActionError(null);
    setActionNotice(null);
    setWitnessEligible(false);
    setWitnessVote(null);
  }, [dareId]);

  useEffect(() => {
    if (!isUuid(dareId) || !isParticipant) return;

    let mounted = true;
    const interval = setInterval(() => {
      recordCourtHeartbeat(dareId).then((result) => {
        if (mounted && !result.ok) {
          setActionError(result.error.message);
        }
      });
    }, 15_000);

    void recordCourtHeartbeat(dareId);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [dareId, isParticipant]);

  useEffect(() => {
    if (!isUuid(dareId) || session.resolutionType !== 'witnessed' || session.viewerRole !== 'spectator') return;

    let mounted = true;
    const updateWitnessAttendance = async () => {
      const result = await recordWitnessAttendance(dareId);
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
  }, [dareId, session.resolutionType, session.viewerRole]);

  return (
    <CourtFlowFrame
      eyebrow="Court play"
      onBack={() => router.back()}
      title="Beat the clock."
      subtitle="Scores can show during play. Final payout waits for settlement confirmation."
    >
      <ConnectionBanner state={session.connectionState} message="Heartbeat is active." />
      {actionError ? (
        <InlineAlert
          tone="danger"
          title="Court action failed"
          message={actionError}
        />
      ) : null}
      {actionNotice ? (
        <InlineAlert
          tone="success"
          title="Action submitted"
          message={actionNotice}
        />
      ) : null}
      {court.error ? (
        <InlineAlert
          tone="danger"
          title="Court state unavailable"
          message={court.error}
        />
      ) : null}
      {court.source === 'server' ? (
        courtQuestion.source === 'server' && !courtQuestion.error ? (
          <InlineAlert
            tone="info"
            title={courtQuestion.loading ? 'Loading resolution' : getResolutionNoticeTitle(session.resolutionType, courtQuestion)}
            message={courtQuestion.loading ? 'Fetching the current resolution state.' : getResolutionNoticeMessage(session.resolutionType)}
          />
        ) : (
          <InlineAlert
            tone="danger"
            title="Resolution unavailable"
            message={courtQuestion.error ?? 'Unable to load the assigned court resolution.'}
          />
        )
      ) : null}
      <CourtArena session={session} />
      <CourtResolutionPanel
        answerText={answerText}
        claimRationale={claimRationale}
        courtSource={court.source}
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
      <View style={styles.actions}>
        {session.resolutionType === 'answer_key' ? (
          <ActionButton
            accessibilityLabel="Submit answer"
            disabled={!canSubmit}
            icon={<CheckCircle2 color={colors.text} size={18} />}
            label={submitting ? 'Submitting' : 'Submit answer'}
            onPress={() => {
              void handleSubmitAnswer();
            }}
          />
        ) : null}
        <ActionButton
          accessibilityLabel="Open court chat"
          icon={<MessageSquare color={colors.text} size={18} />}
          label="Chat"
          onPress={() => router.push({ pathname: '/court/chat', params: { dareId } })}
          variant="secondary"
        />
        {isParticipant ? (
          <ActionButton
            accessibilityLabel="Forfeit DARE"
            icon={<Flag color={colors.text} size={18} />}
            label="Forfeit"
            onPress={() => {
              void handleForfeit();
            }}
            variant="secondary"
          />
        ) : null}
      </View>
    </CourtFlowFrame>
  );

  async function handleSubmitAnswer() {
    if (session.resolutionType !== 'answer_key') return;

    if (!isUuid(dareId) || courtQuestion.source !== 'server' || !isUuid(question.id)) {
      router.push('/court/result');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    const result = await submitDareAnswer(dareId, {
      answerText: answerText.trim(),
      questionId: question.id,
    });

    if (!result.ok) {
      setActionError(result.error.message);
      setSubmitting(false);
      return;
    }

    const completeResult = await completeDare(dareId);
    setSubmitting(false);
    if (!completeResult.ok && result.data.phase !== 'active') {
      setActionError(completeResult.error.message);
      return;
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
    if (!isUuid(dareId)) {
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
          dareId,
          mode: 'result-claim',
          rationale: claimRationale,
        },
      });
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    const claimResult = await submitResultClaim(dareId, {
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

    if (!isUuid(dareId)) {
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
      return;
    }

    const voteResult = await submitWitnessVote(dareId, { vote });

    if (!voteResult.ok) {
      setActionError(voteResult.error.message);
      setSubmitting(false);
      return;
    }

    setWitnessVote(voteResult.data.vote);
    setActionNotice('Your witness vote was recorded. Final settlement still waits for the Court result rules.');
    await court.refresh();
    setSubmitting(false);
  }

  async function handleForfeit() {
    if (!isUuid(dareId)) {
      router.push('/court/result');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    setActionNotice(null);
    const result = await forfeitDare(dareId);
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

const styles = StyleSheet.create({
  actions: {
    gap: spacing[10],
  },
});
