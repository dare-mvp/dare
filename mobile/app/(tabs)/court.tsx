import { useRouter } from 'expo-router';
import { CirclePlay, Gavel, Hourglass, Send, ShieldCheck } from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { Screen } from '../../src/components/ui/Screen';
import { TopBar } from '../../src/components/ui/TopBar';
import { CourtArena } from '../../src/features/court/components/CourtArena';
import { CourtStatusPanel } from '../../src/features/court/components/CourtStatusPanel';
import { QuizPanel } from '../../src/features/court/components/QuizPanel';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { activeCourtSession } from '../../src/mocks/court';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function CourtScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const session = activeCourtSession;
  const canEnterCourt = data.capabilities.canAcceptDare;

  return (
    <Screen>
      <TopBar
        balanceLabel={formatNgnFromKobo(data.wallet.availableKobo)}
        displayInitial={data.profile.avatarInitial}
        subtitle="Live Challenge"
        title="The Court"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {data.source === 'mock' && !error ? (
          <InlineAlert
            tone="info"
            title={loading ? 'Syncing account' : 'Preview data'}
            message={loading ? 'Court eligibility is loading.' : 'Live court eligibility appears after sign-in and sync.'}
          />
        ) : null}

        {error ? (
          <InlineAlert
            tone="danger"
            title="Court eligibility unavailable"
            message={error}
          />
        ) : null}

        <CourtArena session={session} />

        <View style={styles.readyPanel}>
          <View>
            <Text style={styles.readyTitle}>Both players ready</Text>
            <Text style={styles.readyText}>
              Countdown has started. Leaving during an active court may trigger forfeit review.
            </Text>
          </View>
          <ActionButton
            accessibilityLabel="Ready state confirmed"
            disabled={!canEnterCourt}
            icon={<ShieldCheck color={colors.text} size={17} />}
            label="Ready-up"
            onPress={() => router.push('/court/ready')}
            variant="secondary"
          />
        </View>

        <QuizPanel question={session.question} />

        <CourtStatusPanel session={session} />

        <InlineAlert
          tone="warning"
          title="Forfeit-sensitive flow"
          message="Keep your connection active. If heartbeat is lost, the match may move into reconnect or forfeit review."
        />

        <View style={styles.settlementPanel}>
          <Text style={styles.settlementTitle}>Settlement stays pending</Text>
          <Text style={styles.settlementText}>
            Results can appear immediately after scoring. Payouts and trust changes are final only after settlement is confirmed.
          </Text>
          <View style={styles.actionRow}>
            <ActionButton
              accessibilityLabel="Submit current answer"
              disabled={!canEnterCourt}
              icon={<Send color={colors.text} size={17} />}
              label="Submit answer"
              onPress={() => router.push('/court/play')}
            />
            <ActionButton
              accessibilityLabel="File dispute"
              icon={<Gavel color={colors.text} size={17} />}
              label="Dispute"
              onPress={() => router.push('/court/result')}
              variant="secondary"
            />
          </View>
        </View>

        <View style={styles.flowPanel}>
          <Text style={styles.settlementTitle}>Court flow screens</Text>
          <Text style={styles.settlementText}>
            Preview each court state before live backend data is connected.
          </Text>
          <View style={styles.actionRow}>
            <ActionButton
              accessibilityLabel="Open countdown"
              icon={<Hourglass color={colors.text} size={17} />}
              label="Countdown"
              onPress={() => router.push('/court/countdown')}
              variant="secondary"
            />
            <ActionButton
              accessibilityLabel="Open settlement status"
              icon={<CirclePlay color={colors.text} size={17} />}
              label="Settlement"
              onPress={() => router.push('/court/settlement-status')}
              variant="secondary"
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[16],
    padding: spacing[16],
    paddingBottom: spacing[32],
  },
  readyPanel: {
    alignItems: 'center',
    backgroundColor: colors.primaryDim,
    borderColor: colors.primaryGlow,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    justifyContent: 'space-between',
    padding: spacing[16],
  },
  readyTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  readyText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
    maxWidth: 230,
    marginTop: spacing[4],
  },
  settlementPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  flowPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    gap: spacing[12],
    padding: spacing[16],
  },
  settlementTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  settlementText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  actionRow: {
    gap: spacing[10],
  },
});
