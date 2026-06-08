import { useRouter } from 'expo-router';
import { FileText, ScrollText, ShieldCheck, UserRound } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { TopBar } from '../../src/components/ui/TopBar';
import { ConstitutionPreview } from '../../src/features/create/components/ConstitutionPreview';
import {
  CreatePressCard as PressCard,
  CreateSectionTitle as SectionTitle,
  createScreenStyles as styles,
  getCreateGate,
} from '../../src/features/create/components/CreateScreenParts';
import { CreateStepper } from '../../src/features/create/components/CreateStepper';
import { SelectPill } from '../../src/features/create/components/SelectPill';
import { TimeEscrowSection } from '../../src/features/create/components/TimeEscrowSection';
import { getCreateStakeAvailabilityError } from '../../src/features/create/createEligibility';
import { saveCreateDareDraft } from '../../src/features/create/createDraftStore';
import {
  categoryOptions,
  createSectionIcons,
  dareTypeOptions,
  resolutionOptions,
} from '../../src/features/create/createVisuals';
import { useCreateDareDraft } from '../../src/features/create/hooks/useCreateDareDraft';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { colors } from '../../src/theme/tokens';

export default function CreateScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const { draft, escrowKobo, platformFeeKobo, rewardKobo, stakeKobo, updateDraft, validation } = useCreateDareDraft();
  const createGate = getCreateGate(data);
  const stakeAvailabilityError = getCreateStakeAvailabilityError(escrowKobo, data);
  const canReview = validation.isValid && !stakeAvailabilityError && data.capabilities.canCreateDare && !loading && !error;
  const visibleErrors = {
    answerKey: draft.answerKey ? validation.errors.answerKey : undefined,
    answerKeyRules: draft.answerKeyRules ? validation.errors.answerKeyRules : undefined,
    opponent: draft.opponent ? validation.errors.opponent : undefined,
    rewardNaira: draft.rewardNaira ? validation.errors.rewardNaira ?? stakeAvailabilityError ?? undefined : undefined,
    rules: draft.rules ? validation.errors.rules : undefined,
    stakeNaira: draft.stakeNaira ? validation.errors.stakeNaira ?? stakeAvailabilityError ?? undefined : undefined,
    title: draft.title ? validation.errors.title : undefined,
    durationSeconds: validation.errors.durationSeconds,
  };

  return (
    <Screen>
      <TopBar
        balanceLabel={formatNgnFromKobo(data.wallet.availableKobo)}
        displayInitial={data.profile.avatarInitial}
        subtitle="Create Challenge"
        title="Issue a DARE"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {data.source === 'mock' && !error ? (
          <InlineAlert
            tone="info"
            title={loading ? 'Syncing account' : 'Preview data'}
            message={loading ? 'Create eligibility is loading.' : 'Live stake and reward limits appear after sign-in and sync.'}
          />
        ) : null}

        {error ? (
          <InlineAlert
            tone="danger"
            title="Create eligibility unavailable"
            message={error}
          />
        ) : null}

        {!loading && !error && !data.capabilities.canCreateDare ? (
          <InlineAlert
            tone="warning"
            title={createGate.title}
            message={createGate.message}
          />
        ) : null}

        <CreateStepper />

        <View style={styles.section}>
          <SectionTitle eyebrow="Funding" icon={createSectionIcons.type} title="Choose the DARE type" />
          {dareTypeOptions.map((option) => (
            <PressCard
              body={option.body}
              icon={option.icon}
              key={option.value}
              label={option.label}
              onPress={() => updateDraft('dareType', option.value)}
              selected={draft.dareType === option.value}
            />
          ))}
        </View>

        <View style={styles.section}>
          <SectionTitle eyebrow="Resolution" icon={createSectionIcons.type} title="Choose how this DARE resolves" />
          {resolutionOptions.map((option) => (
            <PressCard
              body={option.body}
              icon={option.icon}
              key={option.value}
              label={option.label}
              onPress={() => updateDraft('resolutionType', option.value)}
              selected={draft.resolutionType === option.value}
            />
          ))}
        </View>

        <View style={styles.section}>
          <SectionTitle eyebrow="Category" icon={createSectionIcons.category} title="Choose a DARE category" />
          <View style={styles.pillGrid}>
            {categoryOptions.map((category) => (
              <SelectPill
                icon={category.icon}
                key={category.value}
                label={category.label}
                onSelect={(value) => updateDraft('category', value)}
                selected={draft.category === category.value}
                value={category.value}
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionTitle eyebrow="Terms" icon={createSectionIcons.terms} title="Define the challenge" />
          <TextField
            error={visibleErrors.title}
            label="Challenge title"
            leftIcon={<FileText color={colors.textMuted} size={16} />}
            onChangeText={(value) => updateDraft('title', value)}
            placeholder="e.g. Beat my fintech trivia score"
            value={draft.title}
          />
          <TextField
            error={visibleErrors.rules}
            leftIcon={<ScrollText color={colors.textMuted} size={16} />}
            label="Rules"
            multiline
            onChangeText={(value) => updateDraft('rules', value)}
            placeholder="Write the exact rules, win condition, and tie handling."
            style={styles.rulesInput}
            textAlignVertical="top"
            value={draft.rules}
          />
          {draft.resolutionType === 'answer_key' ? (
            <>
              <TextField
                error={visibleErrors.answerKey}
                label="Committed answer key"
                leftIcon={<ShieldCheck color={colors.textMuted} size={16} />}
                onChangeText={(value) => updateDraft('answerKey', value)}
                placeholder="Required for Answer Key DAREs"
                secureTextEntry
                value={draft.answerKey}
              />
              <TextField
                error={visibleErrors.answerKeyRules}
                label="Answer judging rule (optional)"
                leftIcon={<ShieldCheck color={colors.textMuted} size={16} />}
                onChangeText={(value) => updateDraft('answerKeyRules', value)}
                placeholder="e.g. spelling must match exactly, no abbreviations"
                value={draft.answerKeyRules}
              />
            </>
          ) : null}
          <TextField
            autoCapitalize="none"
            error={visibleErrors.opponent}
            label={draft.dareType === 'task' ? 'Performer (optional)' : 'Opponent (optional)'}
            leftIcon={<UserRound color={colors.textMuted} size={16} />}
            onChangeText={(value) => updateDraft('opponent', value)}
            placeholder="@username or leave open"
            value={draft.opponent}
          />
        </View>

        <TimeEscrowSection
          durationError={visibleErrors.durationSeconds}
          durationSeconds={draft.durationSeconds}
          onDurationChange={(value) => updateDraft('durationSeconds', value)}
          onStakeChange={(value) => updateDraft('stakeNaira', value)}
          onRewardChange={(value) => updateDraft('rewardNaira', value)}
          rewardError={visibleErrors.rewardNaira}
          rewardNaira={draft.rewardNaira}
          stakeError={visibleErrors.stakeNaira}
          stakeNaira={draft.stakeNaira}
          dareType={draft.dareType}
        />

        <ConstitutionPreview
          draft={draft}
          escrowKobo={escrowKobo}
          platformFeeKobo={platformFeeKobo}
          rewardKobo={rewardKobo}
          stakeKobo={stakeKobo}
        />

        <InlineAlert
          tone="warning"
          title="Confirmation required"
          message="Submitting will lock the stake or reward only after confirmation. Until then, this DARE remains a draft."
        />

        <ActionButton
          accessibilityLabel="Review DARE stake or reward"
          disabled={data.capabilities.canCreateDare ? !canReview : loading || Boolean(error)}
          icon={<ShieldCheck color={colors.text} size={18} />}
          label={data.capabilities.canCreateDare ? 'Review terms' : createGate.label}
          onPress={() => {
            if (!data.capabilities.canCreateDare) {
              router.push(createGate.route);
              return;
            }

            router.push({
              pathname: '/create/review',
              params: { draftId: saveCreateDareDraft(draft) },
            });
          }}
        />
      </ScrollView>
    </Screen>
  );
}
