import { CheckCircle2, Flag, MessageSquare } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ActionButton } from '../../../components/ui/ActionButton';
import { colors, spacing } from '../../../theme/tokens';

type CourtPlayActionsProps = {
  canPlay: boolean;
  canSubmit: boolean;
  isParticipant: boolean;
  onForfeit: () => void;
  onOpenChat: () => void;
  onSubmitAnswer: () => void;
  submitting: boolean;
  showAnswerSubmit: boolean;
};

export function CourtPlayActions({
  canPlay,
  canSubmit,
  isParticipant,
  onForfeit,
  onOpenChat,
  onSubmitAnswer,
  showAnswerSubmit,
  submitting,
}: CourtPlayActionsProps) {
  return (
    <View style={styles.actions}>
      {showAnswerSubmit ? (
        <ActionButton
          accessibilityLabel="Submit answer"
          disabled={!canSubmit}
          icon={<CheckCircle2 color={colors.text} size={18} />}
          label={submitting ? 'Submitting' : 'Submit answer'}
          onPress={onSubmitAnswer}
        />
      ) : null}
      <ActionButton
        accessibilityLabel="Open court chat"
        icon={<MessageSquare color={colors.text} size={18} />}
        label="Chat"
        onPress={onOpenChat}
        variant="secondary"
      />
      {isParticipant ? (
        <ActionButton
          accessibilityLabel="Forfeit DARE"
          disabled={!canPlay || submitting}
          icon={<Flag color={colors.text} size={18} />}
          label="Forfeit"
          onPress={onForfeit}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing[10],
  },
});
