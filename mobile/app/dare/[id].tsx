import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, LockKeyhole, Share2, ShieldCheck } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { MoneyAmount } from '../../src/components/ui/MoneyAmount';
import { Screen } from '../../src/components/ui/Screen';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { useMe } from '../../src/features/me/useMe';
import { getFeaturedDareById } from '../../src/mocks/home';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const platformFeeRate = 0.05;

export default function DareDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error, loading } = useMe();
  const dare = id ? getFeaturedDareById(id) : undefined;

  if (!dare) {
    return (
      <Screen padded>
        <DetailHeader onBack={() => router.back()} title="DARE not found" />
        <InlineAlert
          tone="danger"
          title="Unable to load DARE"
          message="This challenge is not available right now."
        />
      </Screen>
    );
  }

  const platformFeeKobo = Math.round(dare.stakeKobo * platformFeeRate);
  const escrowRequiredKobo = dare.stakeKobo + platformFeeKobo;
  const projectedPotKobo = dare.stakeKobo * 2;
  const canAccept = dare.status === 'open' && data.capabilities.canAcceptDare;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <DetailHeader onBack={() => router.back()} title="Accept DARE" />

        {data.source === 'mock' && !error ? (
          <InlineAlert
            tone="info"
            title={loading ? 'Syncing account' : 'Preview data'}
            message={loading ? 'Acceptance eligibility is loading.' : 'Live acceptance checks appear after sign-in and sync.'}
          />
        ) : null}

        {error ? (
          <InlineAlert
            tone="danger"
            title="Acceptance eligibility unavailable"
            message={error}
          />
        ) : null}

        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <StatusBadge label={dare.status.toUpperCase()} tone={canAccept ? 'success' : 'warning'} />
            <Text style={styles.category}>{dare.category.toUpperCase()}</Text>
          </View>
          <Text style={styles.title}>{dare.title}</Text>
          <View style={styles.potRow}>
            <View>
              <Text style={styles.label}>Stake</Text>
              <MoneyAmount amountKobo={dare.stakeKobo} tone="locked" />
            </View>
            <View style={styles.rightText}>
              <Text style={styles.label}>Projected pot</Text>
              <MoneyAmount amountKobo={projectedPotKobo} tone="pending" />
            </View>
          </View>
        </View>

        <View style={styles.matchPanel}>
          <PlayerBlock
            accentColor={colors.primary}
            meta={`${dare.playerA.tier} - ${dare.playerA.trustScore} pts`}
            name={dare.playerA.name}
            role="Issuer"
          />
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <PlayerBlock
            alignRight
            accentColor={dare.playerB ? colors.info : colors.surfaceElevated}
            meta={dare.playerB ? `${dare.playerB.tier} - ${dare.playerB.trustScore} pts` : 'Awaiting challenger'}
            name={dare.playerB?.name ?? 'You'}
            role={dare.playerB ? 'Challenger' : 'Your slot'}
          />
        </View>

        <View style={styles.section}>
          <SectionTitle icon={<ShieldCheck color={colors.primary} size={18} />} title="Constitution" />
          <DetailRow label="Resolution" value={dare.resolution} />
          <DetailRow label="Created" value={dare.createdAgo} />
          <DetailRow
            label="Rules"
            value="Both players enter court mode. The challenge is scored automatically. Settlement remains pending until confirmation."
          />
          <DetailRow label="Dispute window" value="A dispute may be opened after the result if either player files a valid dispute." />
        </View>

        <View style={styles.section}>
          <SectionTitle icon={<LockKeyhole color={colors.warning} size={18} />} title="Escrow review" />
          <MoneyLine label="Your stake" value={dare.stakeKobo} />
          <MoneyLine label="Platform fee estimate" value={platformFeeKobo} />
          <MoneyLine emphasis label="Escrow required" value={escrowRequiredKobo} />
        </View>

        <InlineAlert
          tone="warning"
          title="Acceptance requires confirmation"
          message="This DARE is only accepted after escrow, limits, and eligibility checks are confirmed."
        />

        <InlineAlert
          tone="info"
          title="KYC and limits checked before ready-up"
          message="If this stake exceeds your tier or responsible gaming limit, you will need to lower the stake or update your account before ready-up."
        />

        <View style={styles.actions}>
          <ActionButton
            accessibilityLabel="Accept this DARE"
            disabled={!canAccept}
            label={dare.status === 'open' ? 'Review accept' : 'Not open'}
            onPress={() => router.push(`/dare/${dare.id}/accept`)}
          />
          <ActionButton
            accessibilityLabel="Share this DARE"
            label="Share"
            variant="secondary"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function DetailHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={onBack} style={styles.iconButton}>
        <ChevronLeft color={colors.textMuted} size={22} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <Pressable accessibilityLabel="Share DARE" accessibilityRole="button" style={styles.iconButton}>
        <Share2 color={colors.textMuted} size={18} />
      </Pressable>
    </View>
  );
}

function PlayerBlock({
  accentColor,
  alignRight = false,
  meta,
  name,
  role,
}: {
  accentColor: string;
  alignRight?: boolean;
  meta: string;
  name: string;
  role: string;
}) {
  return (
    <View style={[styles.player, alignRight && styles.playerRight]}>
      <View style={[styles.avatar, { backgroundColor: accentColor }]}>
        <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={[styles.playerCopy, alignRight && styles.playerCopyRight]}>
        <Text style={styles.playerRole}>{role}</Text>
        <Text numberOfLines={1} style={styles.playerName}>{name}</Text>
        <Text numberOfLines={1} style={styles.playerMeta}>{meta}</Text>
      </View>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function MoneyLine({ emphasis = false, label, value }: { emphasis?: boolean; label: string; value: number }) {
  return (
    <View style={styles.moneyLine}>
      <Text style={emphasis ? styles.moneyLabelStrong : styles.moneyLabel}>{label}</Text>
      <MoneyAmount amountKobo={value} tone={emphasis ? 'locked' : 'pending'} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[16],
    padding: spacing[20],
    paddingBottom: spacing[32],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[12],
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  hero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[16],
    padding: spacing[16],
  },
  heroTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  category: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: '900',
    lineHeight: 32,
  },
  potRow: {
    alignItems: 'flex-end',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[14],
  },
  label: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  rightText: {
    alignItems: 'flex-end',
  },
  matchPanel: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[8],
    padding: spacing[16],
  },
  player: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing[10],
    minWidth: 0,
  },
  playerRight: {
    flexDirection: 'row-reverse',
  },
  playerCopy: {
    flex: 1,
    minWidth: 0,
  },
  playerCopyRight: {
    alignItems: 'flex-end',
  },
  avatar: {
    alignItems: 'center',
    borderRadius: radius.pill,
    flexShrink: 0,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  playerRole: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  playerName: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: '900',
  },
  playerMeta: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
  },
  vsBadge: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  vsText: {
    color: colors.primary,
    fontFamily: fonts.display,
    fontSize: 10,
    fontWeight: '900',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[8],
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  detailRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[4],
    paddingTop: spacing[10],
  },
  detailLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: colors.textSoft,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  moneyLine: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing[10],
  },
  moneyLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  moneyLabelStrong: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: '900',
  },
  actions: {
    gap: spacing[12],
  },
});
