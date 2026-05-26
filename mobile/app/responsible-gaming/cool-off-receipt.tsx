import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, Clock3 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { ResponsibleGamingFrame } from '../../src/features/responsible-gaming/components/ResponsibleGamingFrame';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function CoolOffReceiptScreen() {
  const router = useRouter();
  const {
    appliesTo,
    cancelledDares,
    effectiveAt,
    forfeitedDares,
    reference,
    refundedAmount,
    request,
    status,
    target,
  } = useLocalSearchParams<{
    appliesTo?: string;
    cancelledDares?: string;
    effectiveAt?: string;
    forfeitedDares?: string;
    reference?: string;
    refundedAmount?: string;
    request?: string;
    status?: string;
    target?: string;
  }>();
  const isSelfExclusion = request === 'Self-exclusion';
  const effectiveLabel = isSelfExclusion ? 'Excluded until' : 'Effective at';
  const receiptLines = [
    { label: 'Request', value: request ?? 'Limit change' },
    { label: 'Status', value: status ?? 'Cooling-off active' },
    { label: 'Applies to', value: appliesTo ?? 'Deposits and stakes' },
    target ? { label: 'Requested', value: target } : null,
    effectiveAt ? { label: effectiveLabel, value: formatDateTime(effectiveAt) } : null,
    cancelledDares ? { label: 'Cancelled DAREs', value: cancelledDares } : null,
    forfeitedDares ? { label: 'Forfeited DAREs', value: forfeitedDares } : null,
    refundedAmount ? { label: 'Refunded', value: formatNgnFromKobo(Number.parseInt(refundedAmount, 10)) } : null,
    { label: 'Reference', value: reference ?? 'Responsible gaming' },
  ].filter((line): line is { label: string; value: string } => Boolean(line));

  return (
    <ResponsibleGamingFrame
      eyebrow="Receipt"
      onBack={() => router.back()}
      title={isSelfExclusion ? 'Self-exclusion active.' : 'Cooling-off started.'}
      subtitle="The request is recorded. Money-moving controls now follow this latest responsible gaming state."
    >
      <View style={styles.hero}>
        {isSelfExclusion ? (
          <CheckCircle2 color={colors.success} size={32} />
        ) : (
          <Clock3 color={colors.warning} size={32} />
        )}
        <StatusBadge label={isSelfExclusion ? 'ACTIVE' : 'COOLING'} tone={isSelfExclusion ? 'success' : 'warning'} />
        <Text style={styles.title}>Request received</Text>
        <Text style={styles.body}>
          {isSelfExclusion
            ? 'The exclusion period is now active for this account.'
            : 'The current safer limit remains active during the cooling-off period.'}
        </Text>
      </View>

      <View style={styles.receipt}>
        {receiptLines.map((line) => (
          <View key={line.label} style={styles.line}>
            <Text style={styles.label}>{line.label}</Text>
            <Text numberOfLines={1} style={styles.value}>{line.value}</Text>
          </View>
        ))}
      </View>

      <ActionButton
        accessibilityLabel="Back to responsible gaming"
        label="Back to controls"
        onPress={() => router.replace('/responsible-gaming')}
      />
    </ResponsibleGamingFrame>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-NG', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  body: {
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
  },
  line: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[14],
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
});
