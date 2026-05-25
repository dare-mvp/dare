import { useLocalSearchParams, useRouter } from 'expo-router';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { CountdownTimer } from '../../src/components/ui/CountdownTimer';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { CourtArena } from '../../src/features/court/components/CourtArena';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { CourtPhaseCard } from '../../src/features/court/components/CourtPhaseCard';
import { activeCourtSession } from '../../src/mocks/court';

export default function CourtCountdownScreen() {
  const router = useRouter();
  const { courtSessionId, dareId } = useLocalSearchParams<{
    courtSessionId?: string;
    dareId?: string;
  }>();
  const session = { ...activeCourtSession, phase: 'countdown' as const, timeRemainingSeconds: 5 };

  return (
    <CourtFlowFrame
      eyebrow="Countdown"
      onBack={() => router.back()}
      title="Court starts now."
      subtitle="The challenge begins when the countdown reaches zero."
    >
      <CourtPhaseCard
        body="Get ready to answer. Keep your connection active and avoid switching away."
        statusLabel="COUNTDOWN"
        statusTone="warning"
        title={session.title}
      >
        <CountdownTimer label="Starting in" secondsRemaining={session.timeRemainingSeconds} />
      </CourtPhaseCard>
      <CourtArena session={session} />
      <InlineAlert
        tone="info"
        title="Answers open after countdown"
        message="Submissions are accepted only during active court play."
      />
      <ActionButton
        accessibilityLabel="Enter court play"
        label="Enter play"
        onPress={() => router.push({
          pathname: '/court/play',
          params: {
            courtSessionId,
            dareId,
          },
        })}
      />
    </CourtFlowFrame>
  );
}
