import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil, PlusCircle, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { EscrowBreakdown } from '../../src/components/ui/EscrowBreakdown';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { ConstitutionPreview } from '../../src/features/create/components/ConstitutionPreview';
import { CreateFlowFrame } from '../../src/features/create/components/CreateFlowFrame';
import {
  draftToCreateDarePayload,
  routeParamsToDraft,
} from '../../src/features/create/createDarePayload';
import { useMe } from '../../src/features/me/useMe';
import { createDare } from '../../src/lib/actions/endpoints';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';
import { useState } from 'react';

export default function CreateReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    category?: string;
    durationSeconds?: string;
    opponent?: string;
    resolutionType?: string;
    rules?: string;
    stakeNaira?: string;
    title?: string;
  }>();
  const { data, error, loading } = useMe();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const draft = routeParamsToDraft(params);
  const stakeKobo = Math.round(Number(draft.stakeNaira || 0) * 100);
  const platformFeeKobo = Math.round(stakeKobo * 0.05);
  const escrowKobo = stakeKobo + platformFeeKobo;
  const canCreate = data.capabilities.canCreateDare && !submitting;

  return (
    <CreateFlowFrame
      eyebrow="Review"
      onBack={() => router.back()}
      title="Review terms."
      subtitle="Review the constitution, escrow, and eligibility checks before creating the challenge."
    >
      {data.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing account' : 'Preview data'}
          message={loading ? 'Create eligibility is loading.' : 'Live escrow checks appear after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="Create eligibility unavailable"
          message={error}
        />
      ) : null}

      {submitError ? (
        <InlineAlert
          tone="danger"
          title="Create failed"
          message={submitError}
        />
      ) : null}

      <View style={styles.statusCard}>
        <ShieldCheck color={colors.success} size={24} />
        <View style={styles.statusCopy}>
          <StatusBadge label="READY TO CREATE" tone="success" />
          <Text style={styles.statusTitle}>Constitution complete</Text>
          <Text style={styles.statusText}>Your rules, stake, duration, and resolution path are ready for confirmation.</Text>
        </View>
      </View>

      <ConstitutionPreview
        draft={draft}
        escrowKobo={escrowKobo}
        platformFeeKobo={platformFeeKobo}
        stakeKobo={stakeKobo}
      />

      <EscrowBreakdown
        platformFeeKobo={platformFeeKobo}
        stakeKobo={stakeKobo}
        title="Creator escrow"
      />

      <InlineAlert
        tone="warning"
        title="Create only clear terms"
        message="Ambiguous rules can lead to disputes. Make win conditions, tie handling, and evidence requirements explicit."
      />

      <View style={styles.actions}>
        <ActionButton
          accessibilityLabel="Create DARE"
          disabled={!canCreate}
          icon={<PlusCircle color={colors.text} size={18} />}
          label={submitting ? 'Creating' : 'Create DARE'}
          onPress={() => {
            void handleCreateDare();
          }}
        />
        <ActionButton
          accessibilityLabel="Edit DARE"
          icon={<Pencil color={colors.text} size={16} />}
          label="Edit"
          onPress={() => router.back()}
          variant="secondary"
        />
      </View>
    </CreateFlowFrame>
  );

  async function handleCreateDare() {
    setSubmitting(true);
    setSubmitError(null);

    const result = await createDare(draftToCreateDarePayload(draft));
    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push({
      pathname: '/create/receipt',
      params: {
        category: draft.category,
        dareId: result.data.dareId,
        opponent: draft.opponent || 'Open challenge',
        resolutionType: draft.resolutionType,
        stakeAmount: String(result.data.stakeAmount),
        status: result.data.status,
        title: draft.title,
      },
    });
  }
}

const styles = StyleSheet.create({
  statusCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.successDim,
    borderColor: colors.success,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    padding: spacing[16],
  },
  statusCopy: {
    flex: 1,
    gap: spacing[8],
    minWidth: 0,
  },
  statusTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
  },
  statusText: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    gap: spacing[10],
  },
});
