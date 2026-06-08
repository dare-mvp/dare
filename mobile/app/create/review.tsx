import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pencil, PlusCircle, ShieldCheck } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { EscrowBreakdown } from '../../src/components/ui/EscrowBreakdown';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { ConstitutionPreview } from '../../src/features/create/components/ConstitutionPreview';
import { CreateFlowFrame } from '../../src/features/create/components/CreateFlowFrame';
import { getCreateStakeAvailabilityError } from '../../src/features/create/createEligibility';
import {
  draftToCreateDarePayload,
  parseStakeNairaToKobo,
  routeParamsToDraft,
} from '../../src/features/create/createDarePayload';
import { getCreateDareDraft } from '../../src/features/create/createDraftStore';
import { validateCreateDareDraft } from '../../src/features/create/hooks/useCreateDareDraft';
import { useMe } from '../../src/features/me/useMe';
import { createDare } from '../../src/lib/actions/endpoints';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';
import { useState } from 'react';

export default function CreateReviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    answerKey?: string;
    answerKeyRules?: string;
    category?: string;
    dareType?: string;
    durationSeconds?: string;
    opponent?: string;
    resolutionType?: string;
    rewardNaira?: string;
    rules?: string;
    stakeNaira?: string;
    title?: string;
    draftId?: string;
  }>();
  const { data, error, loading } = useMe();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const draft = getCreateDareDraft(params.draftId) ?? routeParamsToDraft(params);
  const validation = validateCreateDareDraft(draft);
  const stakeKobo = parseStakeNairaToKobo(draft.stakeNaira);
  const rewardKobo = parseStakeNairaToKobo(draft.rewardNaira);
  const escrowKobo = draft.dareType === 'task' ? rewardKobo : stakeKobo;
  const platformFeeKobo = Math.round((draft.dareType === 'task' ? rewardKobo : stakeKobo * 2) * 0.05);
  const stakeAvailabilityError = getCreateStakeAvailabilityError(escrowKobo, data);
  const canCreate = validation.isValid && !stakeAvailabilityError && data.capabilities.canCreateDare && !loading && !error && !submitting;
  const validationMessage = getFirstValidationError(validation.errors) ?? stakeAvailabilityError;

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

      {validationMessage ? (
        <InlineAlert
          tone="warning"
          title="Review incomplete"
          message={validationMessage}
        />
      ) : null}

      <View style={styles.statusCard}>
        <ShieldCheck color={validation.isValid ? colors.success : colors.warning} size={24} />
        <View style={styles.statusCopy}>
          <StatusBadge label={validation.isValid ? 'READY TO CREATE' : 'NEEDS EDIT'} tone={validation.isValid ? 'success' : 'warning'} />
          <Text style={styles.statusTitle}>{validation.isValid ? 'Constitution complete' : 'Constitution incomplete'}</Text>
          <Text style={styles.statusText}>
            {validation.isValid
              ? 'Your rules, stake, duration, and resolution path are ready for confirmation.'
              : 'Return to edit and complete the required terms before creating this DARE.'}
          </Text>
        </View>
      </View>

      <ConstitutionPreview
        draft={draft}
        escrowKobo={escrowKobo}
        platformFeeKobo={platformFeeKobo}
        rewardKobo={rewardKobo}
        stakeKobo={stakeKobo}
      />

      <EscrowBreakdown
        platformFeeLabel="Estimated settlement fee"
        platformFeeKobo={platformFeeKobo}
        stakeKobo={draft.dareType === 'task' ? rewardKobo : stakeKobo}
        title={draft.dareType === 'task' ? 'Reward escrow' : 'Creator escrow'}
        totalKobo={escrowKobo}
        totalLabel={draft.dareType === 'task' ? 'Reward to lock' : 'Stake to lock'}
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
    if (!canCreate) return;

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
        dareType: result.data.dareType,
        opponent: draft.opponent || (draft.dareType === 'task' ? 'Open task' : 'Open challenge'),
        resolutionType: draft.resolutionType,
        rewardAmount: String(result.data.rewardAmount),
        stakeAmount: String(result.data.stakeAmount),
        status: result.data.status,
        title: draft.title,
      },
    });
  }
}

function getFirstValidationError(errors: ReturnType<typeof validateCreateDareDraft>['errors']) {
  return errors.title
    ?? errors.rules
    ?? errors.answerKey
    ?? errors.answerKeyRules
    ?? errors.stakeNaira
    ?? errors.rewardNaira
    ?? errors.durationSeconds
    ?? errors.opponent
    ?? null;
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
