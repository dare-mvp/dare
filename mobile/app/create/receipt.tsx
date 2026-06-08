import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { MoneyAmount } from '../../src/components/ui/MoneyAmount';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { CreateFlowFrame } from '../../src/features/create/components/CreateFlowFrame';
import { isUuid } from '../../src/lib/ids';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function CreateReceiptScreen() {
  const router = useRouter();
  const { category, dareId, dareType, opponent, resolutionType, rewardAmount, stakeAmount, status, title } = useLocalSearchParams<{
    category?: string;
    dareId?: string;
    dareType?: string;
    opponent?: string;
    resolutionType?: string;
    rewardAmount?: string;
    stakeAmount?: string;
    status?: string;
    title?: string;
  }>();
  const stakeKobo = stakeAmount ? Number.parseInt(stakeAmount, 10) : 0;
  const rewardKobo = rewardAmount ? Number.parseInt(rewardAmount, 10) : 0;
  const isTask = dareType === 'task';
  const lockedAmountKobo = Number.isFinite(isTask ? rewardKobo : stakeKobo) ? Math.max(0, isTask ? rewardKobo : stakeKobo) : 0;
  const statusLabel = formatStatus(status);
  const receiptLines = [
    { label: 'Category', value: (category ?? 'knowledge').toUpperCase() },
    { label: 'DARE type', value: isTask ? 'TASK-BASED' : 'SKILL-BASED' },
    { label: 'Resolution', value: formatResolution(resolutionType) },
    { label: isTask ? 'Performer' : 'Opponent', value: opponent ?? (isTask ? 'Open task' : 'Open challenge') },
    { label: 'Reference', value: dareId ?? 'Pending reference' },
  ];

  return (
    <CreateFlowFrame
      eyebrow="Receipt"
      onBack={() => router.back()}
      title="DARE created."
      subtitle={isTask ? 'Your reward is locked. The performer does not stake money.' : 'Your creator stake is locked. The challenger stake locks on accept.'}
    >
      <View style={styles.hero}>
        <CheckCircle2 color={colors.warning} size={32} />
        <StatusBadge label={statusLabel} tone={status === 'open' ? 'success' : 'warning'} />
        <Text style={styles.heroTitle}>Challenge submitted</Text>
        <Text style={styles.heroText}>{getHeroText(status, isTask)}</Text>
      </View>

      <View style={styles.receipt}>
        <Text style={styles.receiptTitle}>{title ?? 'DARE created'}</Text>
        {receiptLines.map((line) => (
          <ReceiptLine key={line.label} label={line.label} value={line.value} />
        ))}
        <View style={styles.moneyLine}>
          <Text style={styles.label}>{isTask ? 'Reward locked' : 'Stake locked'}</Text>
          <MoneyAmount amountKobo={lockedAmountKobo} tone="locked" />
        </View>
      </View>

      <View style={styles.actions}>
        {isUuid(dareId) ? (
          <ActionButton
            accessibilityLabel="View created DARE"
            label="View DARE"
            onPress={() => router.replace(`/dare/${dareId}`)}
          />
        ) : null}
        <ActionButton
          accessibilityLabel="View feed"
          label="View feed"
          onPress={() => router.replace('/(tabs)')}
          variant={isUuid(dareId) ? 'secondary' : 'primary'}
        />
        <ActionButton
          accessibilityLabel="Create another DARE"
          label="Create another"
          onPress={() => router.replace('/(tabs)/create')}
          variant="secondary"
        />
      </View>
    </CreateFlowFrame>
  );
}

function formatStatus(status?: string) {
  if (status === 'targeted_pending') return 'TARGETED PENDING';
  if (status === 'open') return 'OPEN';
  return (status ?? 'CREATED').replace(/[_-]/g, ' ').toUpperCase();
}

function formatResolution(value?: string) {
  return (value ?? 'answer_key').replace(/[_-]/g, ' ').toUpperCase();
}

function getHeroText(status: string | undefined, isTask: boolean) {
  if (status === 'targeted_pending') {
    return isTask
      ? 'The targeted performer has been notified. Your reward stays locked unless the DARE is accepted, cancelled, or expires.'
      : 'The targeted player has been notified. Your stake stays locked unless the DARE is accepted, cancelled, or expires.';
  }

  return isTask
    ? 'The task is open and your reward is locked unless the DARE is accepted, cancelled, or expires.'
    : 'The DARE is open and your stake is locked unless the challenge is accepted, cancelled, or expires.';
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={1} style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    backgroundColor: colors.warningDim,
    borderColor: colors.warning,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[20],
  },
  heroTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  receipt: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[10],
    padding: spacing[16],
  },
  receiptTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  line: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  moneyLine: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'right',
  },
  actions: {
    gap: spacing[10],
  },
});
