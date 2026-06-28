import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { MoneyAmount } from '../../src/components/ui/MoneyAmount';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { formatDareTypeLabel, formatResolutionLabel } from '../../src/features/create/createLabels';
import { CreateFlowFrame } from '../../src/features/create/components/CreateFlowFrame';
import { isUuid } from '../../src/lib/ids';
import { shareDare, shareDareToWhatsApp } from '../../src/lib/share/shareContent';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function CreateReceiptScreen() {
  const router = useRouter();
  const [shareError, setShareError] = useState<string | null>(null);
  const { category, dareId, dareType, opponent, resolutionType, rewardAmount, stakeAmount, status, templateId, templateVersion, title, visibility } = useLocalSearchParams<{
    category?: string;
    dareId?: string;
    dareType?: string;
    opponent?: string;
    resolutionType?: string;
    rewardAmount?: string;
    stakeAmount?: string;
    status?: string;
    templateId?: string;
    templateVersion?: string;
    title?: string;
    visibility?: string;
  }>();
  const stakeKobo = stakeAmount ? Number.parseInt(stakeAmount, 10) : 0;
  const rewardKobo = rewardAmount ? Number.parseInt(rewardAmount, 10) : 0;
  const isTask = dareType === 'task';
  const hasServerReference = isUuid(dareId);
  const lockedAmountKobo = Number.isFinite(isTask ? rewardKobo : stakeKobo) ? Math.max(0, isTask ? rewardKobo : stakeKobo) : 0;
  const statusLabel = hasServerReference ? formatStatus(status) : 'UNCONFIRMED';
  const moneyLabel = hasServerReference
    ? isTask ? 'Reward locked' : 'Creator stake locked'
    : isTask ? 'Reward lock pending' : 'Creator stake pending';
  const isTargetedInvite = visibility === 'targeted' || status === 'targeted_pending';
  const receiptLines = [
    { label: 'Action', value: hasServerReference ? 'DARE created' : 'DARE create requested' },
    { label: 'Status', value: statusLabel },
    { label: 'Timestamp', value: new Date().toLocaleString() },
    { label: 'Category', value: (category ?? 'knowledge').toUpperCase() },
    { label: 'DARE type', value: formatDareTypeLabel(isTask ? 'task' : 'skill') },
    { label: 'Resolution', value: formatResolutionLabel(resolutionType ?? 'answer_key') },
    { label: isTask ? 'Performer' : 'Opponent', value: opponent ?? (isTask ? 'Open task' : 'Open challenge') },
    ...(templateId ? [{ label: 'Template', value: `${templateId}${templateVersion ? ` v${templateVersion}` : ''}` }] : []),
    { label: 'Reference', value: dareId ?? 'Pending reference' },
    { label: 'Next action', value: hasServerReference ? 'Share or wait for accept' : 'Check feed sync' },
    { label: 'Support', value: dareId ? `Use reference ${shortId(dareId)}` : 'Use pending receipt screen' },
  ];

  return (
    <CreateFlowFrame
      eyebrow="Receipt"
      onBack={() => router.back()}
      title={hasServerReference ? 'DARE created.' : 'Receipt pending.'}
      subtitle={hasServerReference
        ? isTask ? 'Your reward is locked. The performer does not stake money.' : 'Your creator stake is locked. The challenger stake locks on accept.'
        : 'Server confirmation is missing on this screen. Check the feed or create history before treating funds as locked.'}
    >
      {!hasServerReference ? (
        <InlineAlert
          tone="warning"
          title="Confirmation not available"
          message="This receipt is missing a valid DARE reference. Do not use it as proof of escrow until the DARE appears from the server."
        />
      ) : null}
      {shareError ? (
        <InlineAlert tone="danger" title="Share failed" message={shareError} />
      ) : null}

      <View style={styles.hero}>
        <CheckCircle2 color={colors.warning} size={32} />
        <StatusBadge label={statusLabel} tone={hasServerReference && status === 'open' ? 'success' : 'warning'} />
        <Text style={styles.heroTitle}>{hasServerReference ? 'Challenge submitted' : 'Confirmation pending'}</Text>
        <Text style={styles.heroText}>{hasServerReference ? getHeroText(status, isTask) : 'Return to the feed and wait for the confirmed DARE before sharing or accepting money terms.'}</Text>
      </View>

      <View style={styles.receipt}>
        <Text style={styles.receiptTitle}>{title ?? 'DARE created'}</Text>
        {receiptLines.map((line) => (
          <ReceiptLine key={line.label} label={line.label} value={line.value} />
        ))}
        <View style={styles.moneyLine}>
          <Text style={styles.label}>{moneyLabel}</Text>
          <MoneyAmount amountKobo={lockedAmountKobo} tone={hasServerReference ? 'locked' : 'pending'} />
        </View>
      </View>

      <View style={styles.actions}>
        {hasServerReference ? (
          <ActionButton
            accessibilityLabel="View created DARE"
            label="View DARE"
            onPress={() => router.replace(`/dare/${dareId}`)}
          />
        ) : null}
        {hasServerReference ? (
          <ActionButton
            accessibilityLabel={isTargetedInvite ? 'Send targeted DARE on WhatsApp' : 'Share DARE on WhatsApp'}
            label={isTargetedInvite ? 'Send WhatsApp invite' : 'Share on WhatsApp'}
            onPress={() => handleShareDare('whatsapp')}
            variant="secondary"
          />
        ) : null}
        {hasServerReference ? (
          <ActionButton
            accessibilityLabel="Share DARE invite"
            label={isTargetedInvite ? 'Share invite' : 'Share'}
            onPress={() => handleShareDare('native')}
            variant="secondary"
          />
        ) : null}
        <ActionButton
          accessibilityLabel="View feed"
          label="View feed"
          onPress={() => router.replace('/(tabs)')}
          variant={hasServerReference ? 'secondary' : 'primary'}
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

  async function handleShareDare(channel: 'native' | 'whatsapp') {
    if (!hasServerReference || !dareId) return;

    setShareError(null);
    try {
      const context = {
        id: dareId,
        title: title ?? 'DARE invite',
      };
      await (channel === 'whatsapp' ? shareDareToWhatsApp(context) : shareDare(context));
    } catch {
      setShareError(channel === 'whatsapp'
        ? 'WhatsApp sharing is not available right now. Use Share instead or open this DARE from the feed.'
        : 'DARE sharing is not available right now. Open the DARE from the feed and try again.');
    }
  }
}

function formatStatus(status?: string) {
  if (status === 'targeted_pending') return 'TARGETED PENDING';
  if (status === 'open') return 'OPEN';
  return (status ?? 'CREATED').replace(/[_-]/g, ' ').toUpperCase();
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

function shortId(value: string) {
  return value.length > 8 ? value.slice(0, 8) : value;
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
