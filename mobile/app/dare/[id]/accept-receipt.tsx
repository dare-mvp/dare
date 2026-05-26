import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../../src/components/ui/ActionButton';
import { ErrorState } from '../../../src/components/ui/ErrorState';
import { InlineAlert } from '../../../src/components/ui/InlineAlert';
import { MoneyAmount } from '../../../src/components/ui/MoneyAmount';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { DareFlowFrame } from '../../../src/features/dares/components/DareFlowFrame';
import { useDareDetail } from '../../../src/features/feed/useDareDetail';
import { colors, fonts, radius, spacing, typography } from '../../../src/theme/tokens';

const platformFeeRate = 0.05;

export default function AcceptReceiptScreen() {
  const router = useRouter();
  const { courtSessionId, id, reference, stakeAmount, status } = useLocalSearchParams<{
    courtSessionId?: string;
    id: string;
    reference?: string;
    stakeAmount?: string;
    status?: string;
  }>();
  const { dare, error, loading } = useDareDetail(id);

  if (!dare) {
    return (
      <DareFlowFrame
        eyebrow="Accept receipt"
        onBack={() => router.back()}
        title="Receipt not found."
        subtitle="This acceptance record is not available right now."
      >
        {loading ? (
          <InlineAlert
            tone="info"
            title="Loading receipt"
            message="Fetching the accepted DARE details."
          />
        ) : (
          <ErrorState
            body={error ?? 'Return to the feed and choose another DARE.'}
            onRetry={() => router.replace('/(tabs)')}
            retryLabel="Back to feed"
            title="Unable to load receipt"
          />
        )}
      </DareFlowFrame>
    );
  }

  const stakeKobo = stakeAmount ? Number.parseInt(stakeAmount, 10) : dare.stakeKobo;
  const platformFeeKobo = Math.round(stakeKobo * platformFeeRate);
  const totalKobo = stakeKobo + platformFeeKobo;

  return (
    <DareFlowFrame
      eyebrow="Accept receipt"
      onBack={() => router.back()}
      title="Acceptance pending."
      subtitle="Your slot is reserved after escrow and eligibility checks are confirmed."
    >
      <View style={styles.hero}>
        <CheckCircle2 color={colors.warning} size={32} />
        <StatusBadge label={(status ?? 'PENDING').toUpperCase()} tone="warning" />
        <Text style={styles.heroTitle}>Acceptance submitted</Text>
        <Text style={styles.heroText}>Ready-up opens once the DARE acceptance is confirmed.</Text>
      </View>

      <View style={styles.receipt}>
        <Text style={styles.receiptTitle}>{dare.title}</Text>
        <ReceiptLine label="Issuer" value={dare.playerA.name} />
        <ReceiptMoneyLine label="Stake" value={stakeKobo} />
        <ReceiptMoneyLine label="Platform fee" value={platformFeeKobo} />
        <ReceiptMoneyLine emphasis label="Escrow requested" value={totalKobo} />
        <ReceiptLine label="Reference" value={reference ?? `ACC-${dare.id.toUpperCase()}`} />
        {courtSessionId ? <ReceiptLine label="Court session" value={courtSessionId} /> : null}
      </View>

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Go to court"
          label="Go to court"
          onPress={() => router.replace({
            pathname: '/court/ready',
            params: {
              courtSessionId,
              dareId: dare.id,
            },
          })}
        />
        <ActionButton
          accessibilityLabel="Back to feed"
          label="Back to feed"
          onPress={() => router.replace('/(tabs)')}
          variant="secondary"
        />
      </View>
    </DareFlowFrame>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={1} style={styles.value}>{value}</Text>
    </View>
  );
}

function ReceiptMoneyLine({ emphasis = false, label, value }: { emphasis?: boolean; label: string; value: number }) {
  return (
    <View style={styles.line}>
      <Text style={[styles.label, emphasis && styles.emphasisLabel]}>{label}</Text>
      <MoneyAmount amountKobo={value} tone={emphasis ? 'locked' : 'pending'} />
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
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  emphasisLabel: {
    color: colors.text,
  },
  value: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  actions: {
    gap: spacing[10],
  },
});
