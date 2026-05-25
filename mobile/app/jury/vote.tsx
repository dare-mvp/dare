import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { ErrorState } from '../../src/components/ui/ErrorState';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { TextField } from '../../src/components/ui/TextField';
import { JuryEvidencePacket } from '../../src/features/jury/components/JuryEvidencePacket';
import { JuryFlowFrame } from '../../src/features/jury/components/JuryFlowFrame';
import { useJuryAssignment } from '../../src/features/jury/useJuryAssignment';
import { castJuryVote, CastJuryVotePayload } from '../../src/lib/actions/endpoints';
import { isUuid } from '../../src/lib/ids';

export default function JuryVoteScreen() {
  const router = useRouter();
  const { caseId } = useLocalSearchParams<{ caseId?: string }>();
  const { assignment, error, loading } = useJuryAssignment(caseId);
  const [rationale, setRationale] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const rationaleError = rationale.trim().length > 0 && rationale.trim().length < 20
    ? 'Add at least 20 characters.'
    : undefined;

  return (
    <JuryFlowFrame
      eyebrow="Vote"
      onBack={() => router.back()}
      title="Choose packet."
      subtitle="Review A and B without player identities. Vote for the packet better supported by evidence."
    >
      {assignment?.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing packet' : 'Preview packet'}
          message={loading ? 'Checking for a live jury packet.' : 'Live evidence packets appear after sign-in and sync.'}
        />
      ) : null}

      {error || submitError ? (
        <InlineAlert
          tone="danger"
          title={submitError ? 'Vote failed' : 'Packet unavailable'}
          message={submitError ?? error ?? 'Unable to load this jury packet.'}
        />
      ) : null}

      {!assignment && !loading ? (
        <ErrorState
          body="No jury packet is available for this assignment."
          onRetry={() => router.replace('/jury')}
          retryLabel="Back to jury"
          title="No packet"
        />
      ) : null}

      {assignment ? (
        <>
          <JuryEvidencePacket
            caseTitle={assignment.title}
            onVoteA={() => {
              void handleVote('A');
            }}
            onVoteB={() => {
              void handleVote('B');
            }}
            sides={assignment.sides}
          />
          <TextField
            error={rationaleError}
            label="Vote rationale"
            multiline
            onChangeText={setRationale}
            placeholder="Explain which packet is better supported by evidence."
            value={rationale}
          />
        </>
      ) : null}

      <InlineAlert
        tone="warning"
        title="Vote cannot be changed"
        message="Submit only after reading both packets and checking the attached evidence counts."
      />
    </JuryFlowFrame>
  );

  async function handleVote(vote: CastJuryVotePayload['vote']) {
    if (submitting) return;
    if (!assignment) return;

    if (assignment.source !== 'server' || !isUuid(assignment.caseId)) {
      router.push(`/jury/receipt?vote=${vote}`);
      return;
    }

    if (rationale.trim().length < 20) {
      setSubmitError('Add a vote rationale before submitting.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const result = await castJuryVote(assignment.caseId, {
      rationale: rationale.trim(),
      vote,
    });

    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.replace({
      pathname: '/jury/receipt',
      params: {
        caseId: result.data.juryCaseId,
        status: result.data.status,
        vote,
        votesCast: String(result.data.votesCast),
        votesNeeded: String(result.data.votesNeeded),
      },
    });
  }
}
