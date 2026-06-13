import { InlineAlert } from '../../../components/ui/InlineAlert';
import { AnswerKeyPanel } from './AnswerKeyPanel';
import { ResultClaimPanel } from './ResultClaimPanel';
import { WitnessVotePanel } from './WitnessVotePanel';
import { CourtQuestion, CourtSession } from '../types';

type ResultClaimOutcome = 'challenger_won' | 'dispute' | 'issuer_won' | 'performer_completed' | 'void';
type WitnessVote = 'A' | 'B';

type CourtResolutionPanelProps = {
  answerText: string;
  claimRationale: string;
  courtSource: 'mock' | 'server';
  disabledReason?: string;
  onChangeAnswer: (value: string) => void;
  onChangeRationale: (value: string) => void;
  onSubmitResultClaim: (outcome: ResultClaimOutcome) => void;
  onSubmitWitnessVote: (vote: WitnessVote) => void;
  question: CourtQuestion;
  session: CourtSession;
  submitting: boolean;
  witnessEligible: boolean;
  witnessVote: WitnessVote | null;
};

export function CourtResolutionPanel({
  answerText,
  claimRationale,
  courtSource,
  disabledReason,
  onChangeAnswer,
  onChangeRationale,
  onSubmitResultClaim,
  onSubmitWitnessVote,
  question,
  session,
  submitting,
  witnessEligible,
  witnessVote,
}: CourtResolutionPanelProps) {
  if (session.resolutionType === 'answer_key') {
    return (
      <AnswerKeyPanel
        answerText={answerText}
        disabled={Boolean(disabledReason)}
        disabledReason={disabledReason}
        onChangeAnswer={onChangeAnswer}
        question={question}
      />
    );
  }

  if (session.resolutionType === 'witnessed' && session.viewerRole === 'spectator') {
    return (
      <WitnessVotePanel
        disabled={courtSource !== 'server' || Boolean(disabledReason)}
        disabledReason={disabledReason}
        onVote={onSubmitWitnessVote}
        session={session}
        submitting={submitting}
        witnessEligible={witnessEligible}
        votedFor={witnessVote}
      />
    );
  }

  if (session.viewerRole === 'spectator') {
    return (
      <InlineAlert
        tone="info"
        title="Audience view"
        message="You can watch this Court session, but this resolution mode only accepts participant submissions."
      />
    );
  }

  return (
    <ResultClaimPanel
      disabled={Boolean(disabledReason)}
      disabledReason={disabledReason}
      onChangeRationale={onChangeRationale}
      onSubmit={onSubmitResultClaim}
      rationale={claimRationale}
      session={session}
      submitting={submitting}
    />
  );
}
