import { ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { StatusBadge } from '../../../components/ui/StatusBadge';
import { TrustBadge } from '../../../components/ui/TrustBadge';
import { colors, fonts, radius, spacing, typography } from '../../../theme/tokens';
import { formatDareTypeLabel, formatFundingModelLabel } from '../../create/createLabels';
import { formatNgnFromKobo } from '../../me/format';
import type { DareFeedItem } from './DareCard';

export const acceptDareStyles = StyleSheet.create({
  challengeCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[14],
    padding: spacing[16],
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  issuerRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    paddingTop: spacing[12],
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    fontWeight: '900',
  },
  issuerCopy: {
    flex: 1,
    minWidth: 0,
  },
  issuerLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  issuerName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
  },
  checkPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  panelTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  checkLine: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing[10],
    paddingTop: spacing[10],
  },
  checkCopy: {
    flex: 1,
    minWidth: 0,
  },
  checkLabel: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  checkValue: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing[4],
  },
  actions: {
    gap: spacing[10],
  },
});

export function CheckLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={acceptDareStyles.checkLine}>
      <ShieldCheck color={colors.success} size={16} />
      <View style={acceptDareStyles.checkCopy}>
        <Text style={acceptDareStyles.checkLabel}>{label}</Text>
        <Text style={acceptDareStyles.checkValue}>{value}</Text>
      </View>
    </View>
  );
}

export function AcceptChallengeCard({ dare, isOpen }: { dare: DareFeedItem; isOpen: boolean }) {
  return (
    <View style={acceptDareStyles.challengeCard}>
      <View style={acceptDareStyles.cardHeader}>
        <StatusBadge label={dare.status.toUpperCase()} tone={isOpen ? 'success' : 'warning'} />
        <Text style={acceptDareStyles.category}>{dare.category.toUpperCase()}</Text>
      </View>
      <Text style={acceptDareStyles.title}>{dare.title}</Text>
      <View style={acceptDareStyles.issuerRow}>
        <View style={acceptDareStyles.avatar}>
          <Text style={acceptDareStyles.avatarText}>{dare.playerA.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={acceptDareStyles.issuerCopy}>
          <Text style={acceptDareStyles.issuerLabel}>Issuer</Text>
          <Text style={acceptDareStyles.issuerName}>{dare.playerA.name}</Text>
        </View>
        <TrustBadge score={dare.playerA.trustScore} tier={dare.playerA.tier} />
      </View>
    </View>
  );
}

export function AcceptanceChecksPanel({
  dare,
  dareType,
  fundingModel,
  quotePrimary,
  rewardKobo,
}: {
  dare: DareFeedItem;
  dareType: 'skill' | 'task';
  fundingModel?: 'two_sided_stake' | 'darer_reward';
  quotePrimary?: string;
  rewardKobo: number;
}) {
  const isTask = dareType === 'task';

  return (
    <View style={acceptDareStyles.checkPanel}>
      <Text style={acceptDareStyles.panelTitle}>Acceptance checks</Text>
      <CheckLine label="DARE type" value={formatDareTypeLabel(dareType)} />
      <CheckLine label="Funding" value={formatFundingModelLabel(fundingModel, dareType)} />
      <CheckLine
        label="Escrow"
        value={quotePrimary ?? (isTask
          ? `Performer money is not locked. The Darer reward is ${formatNgnFromKobo(rewardKobo)}.`
          : 'Challenger stake is reserved after confirmation')}
      />
      <CheckLine label={isTask ? 'Reward' : 'Stake'} value={isTask ? formatNgnFromKobo(rewardKobo) : formatNgnFromKobo(dare.stakeKobo)} />
      <CheckLine label="Resolution" value={`${dare.resolution} with dispute window`} />
      <CheckLine label="KYC" value="Tier and limits checked before ready-up" />
    </View>
  );
}
