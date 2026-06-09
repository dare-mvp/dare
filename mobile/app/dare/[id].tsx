import { useLocalSearchParams, useRouter } from 'expo-router';
import { LockKeyhole, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { MoneyAmount } from '../../src/components/ui/MoneyAmount';
import { Screen } from '../../src/components/ui/Screen';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { formatDareTypeLabel, formatFundingModelLabel } from '../../src/features/create/createLabels';
import {
  DetailHeader,
  DetailRow,
  MoneyLine,
  PlayerBlock,
  SectionTitle,
  dareDetailStyles as styles,
} from '../../src/features/feed/components/DareDetailParts';
import { useDareDetail } from '../../src/features/feed/useDareDetail';
import { useMe } from '../../src/features/me/useMe';
import { getAcceptQuote, type AcceptQuoteResponse } from '../../src/lib/actions/endpoints';
import { ACTIVE_COURT_COMMITMENT_MESSAGE } from '../../src/lib/errors/userMessages';
import { shareDare } from '../../src/lib/share/shareContent';
import { colors } from '../../src/theme/tokens';

const platformFeeRate = 0.05;

export default function DareDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, error: meError, loading: meLoading } = useMe();
  const { dare, error: detailError, loading: detailLoading, source } = useDareDetail(id);
  const [acceptQuote, setAcceptQuote] = useState<AcceptQuoteResponse | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  useEffect(() => {
    if (!dare?.id || !isUuid(dare.id) || dare.status !== 'open') {
      setAcceptQuote(null);
      return undefined;
    }

    let mounted = true;
    void getAcceptQuote(dare.id).then((result) => {
      if (!mounted) return;
      setAcceptQuote(result.ok ? result.data : null);
    });

    return () => {
      mounted = false;
    };
  }, [dare?.id, dare?.status]);

  if (!dare) {
    return (
      <Screen padded>
        <DetailHeader onBack={() => router.back()} title="DARE not found" />
        <InlineAlert
          tone={detailLoading ? 'info' : 'danger'}
          title={detailLoading ? 'Loading DARE' : 'Unable to load DARE'}
          message={detailLoading ? 'Fetching the latest challenge details.' : detailError ?? 'This challenge is not available right now.'}
        />
      </Screen>
    );
  }

  const currentDare = dare;
  const isTask = dare.dareType === 'task';
  const dareType = dare.dareType ?? 'skill';
  const fundingModel = formatFundingModelLabel(dare.fundingModel, dareType);
  const rewardKobo = dare.rewardKobo ?? 0;
  const acceptStakeKobo = isTask ? 0 : dare.stakeKobo;
  const platformFeeKobo = Math.round(acceptStakeKobo * platformFeeRate);
  const escrowRequiredKobo = acceptStakeKobo + platformFeeKobo;
  const projectedPotKobo = isTask ? rewardKobo : dare.stakeKobo * 2;
  const isCreator = data.source === 'server' &&
    data.user?.username?.toLowerCase() === dare.playerA.name.toLowerCase();
  const hasActiveCourtCommitment = acceptQuote?.reasonCode === 'ACTIVE_COURT_COMMITMENT';
  const canAccept = dare.status === 'open' && data.capabilities.canAcceptDare && !isCreator && !hasActiveCourtCommitment;

  async function handleShareDare() {
    setShareError(null);

    try {
      await shareDare({ id: currentDare.id, title: currentDare.title });
    } catch {
      setShareError('DARE sharing is not available right now.');
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <DetailHeader onBack={() => router.back()} onShare={handleShareDare} title="Accept DARE" />

        {(source === 'mock' || data.source === 'mock') && !meError ? (
          <InlineAlert
            tone="info"
            title={meLoading || detailLoading ? 'Syncing DARE' : 'Preview data'}
            message={meLoading || detailLoading ? 'Acceptance eligibility is loading.' : 'Live DARE details and acceptance checks appear after sign-in and sync.'}
          />
        ) : null}

        {meError ? (
          <InlineAlert
            tone="danger"
            title="Acceptance eligibility unavailable"
            message={meError}
          />
        ) : null}

        {detailError && source === 'server' ? (
          <InlineAlert
            tone="danger"
            title="DARE detail unavailable"
            message={detailError}
          />
        ) : null}

        {shareError ? (
          <InlineAlert
            tone="danger"
            title="Share failed"
            message={shareError}
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
              <Text style={styles.label}>{isTask ? 'Reward' : 'Stake'}</Text>
              <MoneyAmount amountKobo={isTask ? rewardKobo : dare.stakeKobo} tone="locked" />
            </View>
            <View style={styles.rightText}>
              <Text style={styles.label}>{isTask ? 'Performer lock' : 'Projected pot'}</Text>
              <MoneyAmount amountKobo={isTask ? 0 : projectedPotKobo} tone="pending" />
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
            meta={dare.playerB ? `${dare.playerB.tier} - ${dare.playerB.trustScore} pts` : isTask ? 'Awaiting performer' : 'Awaiting challenger'}
            name={dare.playerB?.name ?? 'You'}
            role={dare.playerB ? (isTask ? 'Performer' : 'Challenger') : 'Your slot'}
          />
        </View>

        <View style={styles.section}>
          <SectionTitle icon={<ShieldCheck color={colors.primary} size={18} />} title="Constitution" />
          <DetailRow label="DARE type" value={formatDareTypeLabel(dareType)} />
          <DetailRow label="Funding" value={fundingModel} />
          <DetailRow label="Resolution" value={dare.resolution} />
          <DetailRow label="Created" value={dare.createdAgo} />
          <DetailRow
            label={isTask ? 'Task description' : 'DARE description'}
            value={dare.description?.trim() || 'Description not available.'}
          />
          <DetailRow
            label="Rules"
            value={dare.rules?.trim() || (isTask
              ? 'The performer completes the task for the Darer-funded reward. No performer stake is locked.'
              : 'Both players enter court mode with matched stakes. Settlement remains pending until confirmation.')}
          />
          <DetailRow label="Dispute window" value="A dispute may be opened after the result if either player files a valid dispute." />
        </View>

        <View style={styles.section}>
          <SectionTitle icon={<LockKeyhole color={colors.warning} size={18} />} title="Escrow review" />
          {isTask ? (
            <>
              <MoneyLine label="Darer reward" value={rewardKobo} />
              <MoneyLine label="Your performer stake" value={0} />
              <MoneyLine emphasis label="Escrow required from you" value={0} />
            </>
          ) : (
            <>
              <MoneyLine label="Your stake" value={dare.stakeKobo} />
              <MoneyLine label="Platform fee estimate" value={platformFeeKobo} />
              <MoneyLine emphasis label="Escrow required" value={escrowRequiredKobo} />
            </>
          )}
        </View>

        <InlineAlert
          tone="warning"
          title="Acceptance requires confirmation"
          message="This DARE is only accepted after escrow, limits, and eligibility checks are confirmed."
        />

        {isCreator ? (
          <InlineAlert
            tone="info"
            title="Created by you"
            message="You cannot accept your own DARE. Share it or wait for another eligible player to accept."
          />
        ) : null}

        {hasActiveCourtCommitment ? (
          <InlineAlert
            tone="info"
            title="Court already active"
            message={ACTIVE_COURT_COMMITMENT_MESSAGE}
          />
        ) : null}

        <InlineAlert
          tone="info"
          title={isTask ? 'Task-Based acceptance' : 'KYC and limits checked before ready-up'}
          message={isTask
            ? 'Task-Based DAREs do not lock performer stake. KYC and account eligibility are still checked before ready-up.'
            : 'If this stake exceeds your tier or responsible gaming limit, you will need to lower the stake or update your account before ready-up.'}
        />

        <View style={styles.actions}>
          <ActionButton
            accessibilityLabel="Accept this DARE"
            disabled={!canAccept}
            label={isCreator ? 'Created by you' : hasActiveCourtCommitment ? 'Court already active' : dare.status === 'open' ? 'Review accept' : 'Not open'}
            onPress={() => router.push(`/dare/${dare.id}/accept`)}
          />
          {hasActiveCourtCommitment ? (
            <ActionButton
              accessibilityLabel="Go to your current Court"
              label="Go to Court"
              onPress={() => router.push('/(tabs)/court')}
              variant="secondary"
            />
          ) : null}
          <ActionButton
            accessibilityLabel="Share this DARE"
            label="Share"
            onPress={handleShareDare}
            variant="secondary"
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
