import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Flag } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { ConnectionBanner } from '../../src/components/ui/ConnectionBanner';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { CourtArena } from '../../src/features/court/components/CourtArena';
import { CourtFlowFrame } from '../../src/features/court/components/CourtFlowFrame';
import { CourtStatusPanel } from '../../src/features/court/components/CourtStatusPanel';
import { QuizPanel } from '../../src/features/court/components/QuizPanel';
import { useMe } from '../../src/features/me/useMe';
import {
  forfeitDare,
  recordCourtHeartbeat,
  submitDareAnswer,
} from '../../src/lib/actions/endpoints';
import { isUuid } from '../../src/lib/ids';
import { activeCourtSession } from '../../src/mocks/court';
import { colors, spacing } from '../../src/theme/tokens';

export default function CourtPlayScreen() {
  const router = useRouter();
  const { courtSessionId, dareId } = useLocalSearchParams<{
    courtSessionId?: string;
    dareId?: string;
  }>();
  const { data } = useMe();
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(2);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const session = { ...activeCourtSession, phase: 'active' as const };
  const canSubmit = data.capabilities.canAcceptDare && !submitting;

  useEffect(() => {
    if (!isUuid(dareId)) return;

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
  }, [dareId]);

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
      <CourtArena session={session} />
      <QuizPanel
        onSelectOption={setSelectedOptionIndex}
        question={session.question}
        selectedOptionIndex={selectedOptionIndex}
      />
      <CourtStatusPanel session={session} />
      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Submit answer"
          disabled={!canSubmit}
          icon={<CheckCircle2 color={colors.text} size={18} />}
          label={submitting ? 'Submitting' : 'Submit answer'}
          onPress={() => {
            void handleSubmitAnswer();
          }}
        />
        <ActionButton
          accessibilityLabel="Forfeit DARE"
          icon={<Flag color={colors.text} size={18} />}
          label="Forfeit"
          onPress={() => {
            void handleForfeit();
          }}
          variant="secondary"
        />
      </View>
    </CourtFlowFrame>
  );

  async function handleSubmitAnswer() {
    if (!isUuid(dareId) || !isUuid(session.question.id)) {
      router.push('/court/result');
      return;
    }

    setSubmitting(true);
    setActionError(null);
    const result = await submitDareAnswer(dareId, {
      questionId: session.question.id,
      roundIndex: 0,
      selectedOption: selectedOptionIndex,
    });

    if (!result.ok) {
      setActionError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/court/result',
      params: {
        courtSessionId,
        dareId: result.data.dareId,
        scoreA: String(result.data.scoreA),
        scoreB: String(result.data.scoreB),
      },
    });
  }

  async function handleForfeit() {
    if (!isUuid(dareId)) {
      router.push('/court/result');
      return;
    }

    setSubmitting(true);
    setActionError(null);
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
