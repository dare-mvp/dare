import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { CountdownTimer } from '../../src/components/ui/CountdownTimer';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { CourtArena } from '../../src/features/court/components/CourtArena';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { CourtPhaseCard } from '../../src/features/court/components/CourtPhaseCard';
import { useActiveCourtSession } from '../../src/features/court/useActiveCourtSession';

export default function CourtCountdownScreen() {
  const router = useRouter();
  const { courtSessionId, dareId } = useLocalSearchParams<{
    courtSessionId?: string;
    dareId?: string;
  }>();
  const court = useActiveCourtSession(dareId);
  const [secondsRemaining, setSecondsRemaining] = useState(5);
  const session = court.session
    ? { ...court.session, phase: 'countdown' as const, timeRemainingSeconds: secondsRemaining }
    : null;
  const hasSession = Boolean(session);
  const resolvedDareId = dareId ?? session?.dareId;

  useEffect(() => {
    if (!hasSession) return;

    const timer = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [hasSession]);

  useEffect(() => {
    if (!hasSession || secondsRemaining > 0) return;

    router.replace({
      pathname: '/court/play',
      params: {
        courtSessionId,
        dareId: resolvedDareId,
      },
    });
  }, [courtSessionId, hasSession, resolvedDareId, router, secondsRemaining]);

  return (
    <CourtFlowFrame
      eyebrow="Countdown"
      onBack={() => router.back()}
      title="Court starts now."
      subtitle="The challenge begins when the countdown reaches zero."
    >
      {court.error ? (
        <InlineAlert
          tone="danger"
          title="Court state unavailable"
          message={court.error}
        />
      ) : null}

      {court.source === 'mock' && !court.error ? (
        <InlineAlert
          tone="info"
          title={court.loading ? 'Syncing court' : 'Preview countdown'}
          message={court.loading ? 'Court countdown is loading.' : 'Live countdown details appear after sign-in and ready-up.'}
        />
      ) : null}

      {session ? (
        <>
          <CourtPhaseCard
            body="Get ready to answer. Keep your connection active and avoid switching away."
            statusLabel="COUNTDOWN"
            statusTone="warning"
            title={session.title}
          >
            <CountdownTimer label="Starting in" secondsRemaining={session.timeRemainingSeconds} />
          </CourtPhaseCard>
          <CourtArena session={session} />
        </>
      ) : (
        <InlineAlert
          tone={court.loading ? 'info' : 'warning'}
          title={court.loading ? 'Loading court' : 'No active court'}
          message={court.loading ? 'Checking your court session.' : 'Ready-up must complete before countdown starts.'}
        />
      )}
      <InlineAlert
        tone="info"
        title="Answers open after countdown"
        message="Submissions are accepted only during active court play."
      />
      <ActionButton
        accessibilityLabel="Enter court play"
        disabled={!session}
        label="Enter play"
        onPress={() => router.replace({
          pathname: '/court/play',
          params: {
            courtSessionId,
            dareId: resolvedDareId,
          },
        })}
      />
    </CourtFlowFrame>
  );
}
