import { useRouter } from 'expo-router';
import { CircleDollarSign, FileText, ScrollText, ShieldCheck, UserRound } from 'lucide-react-native';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { Screen } from '../../src/components/ui/Screen';
import { TextField } from '../../src/components/ui/TextField';
import { TopBar } from '../../src/components/ui/TopBar';
import { ConstitutionPreview } from '../../src/features/create/components/ConstitutionPreview';
import { CreateStepper } from '../../src/features/create/components/CreateStepper';
import { SelectPill } from '../../src/features/create/components/SelectPill';
import { draftToRouteParams } from '../../src/features/create/createDarePayload';
import {
  categoryOptions,
  createSectionIcons,
  durationOptions,
  resolutionOptions,
} from '../../src/features/create/createVisuals';
import { useCreateDareDraft } from '../../src/features/create/hooks/useCreateDareDraft';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function CreateScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const { draft, escrowKobo, platformFeeKobo, stakeKobo, updateDraft, validation } = useCreateDareDraft();
  const canReview = validation.isValid && data.capabilities.canCreateDare;
  const visibleErrors = {
    opponent: draft.opponent ? validation.errors.opponent : undefined,
    rules: draft.rules ? validation.errors.rules : undefined,
    stakeNaira: draft.stakeNaira ? validation.errors.stakeNaira : undefined,
    title: draft.title ? validation.errors.title : undefined,
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
            message={loading ? 'Create eligibility is loading.' : 'Live stake limits appear after sign-in and sync.'}
          />
        ) : null}

        {error ? (
          <InlineAlert
            tone="danger"
            title="Create eligibility unavailable"
            message={error}
          />
        ) : null}

        <CreateStepper />

        <View style={styles.section}>
          <SectionTitle eyebrow="Type" icon={createSectionIcons.type} title="Choose how this challenge resolves" />
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
          <TextField
            autoCapitalize="none"
            error={visibleErrors.opponent}
            label="Opponent (optional)"
            leftIcon={<UserRound color={colors.textMuted} size={16} />}
            onChangeText={(value) => updateDraft('opponent', value)}
            placeholder="@username or leave open"
            value={draft.opponent}
          />
        </View>

        <View style={styles.section}>
          <SectionTitle eyebrow="Stake" icon={createSectionIcons.stake} title="Set time and escrow" />
          <View style={styles.pillGrid}>
            {durationOptions.map((duration) => (
              <SelectPill
                icon={duration.icon}
                key={duration.value}
                label={duration.label}
                onSelect={(value) => updateDraft('durationSeconds', value)}
                selected={draft.durationSeconds === duration.value}
                value={duration.value}
              />
            ))}
          </View>
          <TextField
            error={visibleErrors.stakeNaira}
            keyboardType="numeric"
            label="Stake amount"
            leftIcon={<CircleDollarSign color={colors.warning} size={16} />}
            onChangeText={(value) => updateDraft('stakeNaira', value.replace(/[^0-9]/g, ''))}
            placeholder="Minimum NGN 100"
            value={draft.stakeNaira}
          />
        </View>

        <ConstitutionPreview
          draft={draft}
          escrowKobo={escrowKobo}
          platformFeeKobo={platformFeeKobo}
          stakeKobo={stakeKobo}
        />

        <InlineAlert
          tone="warning"
          title="Confirmation required"
          message="Submitting will lock escrow only after confirmation. Until then, this DARE remains a draft."
        />

        <ActionButton
          accessibilityLabel="Review DARE escrow"
          disabled={!canReview}
          icon={<ShieldCheck color={colors.text} size={18} />}
          label="Review escrow"
          onPress={() => router.push({
            pathname: '/create/review',
            params: draftToRouteParams(draft),
          })}
        />
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ eyebrow, icon, title }: { eyebrow: string; icon: ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <View style={styles.eyebrowRow}>
        {icon}
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function PressCard({
  body,
  icon,
  label,
  onPress,
  selected,
}: {
  body?: string;
  icon: ReactNode;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.pressCard, selected && styles.pressCardSelected]}
    >
      <View style={styles.pressCardIcon}>{icon}</View>
      <View style={styles.pressCardCopy}>
        <Text style={styles.pressCardTitle}>{label}</Text>
        {body ? <Text style={styles.pressCardBody}>{body}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing[20],
    padding: spacing[20],
    paddingBottom: spacing[32],
  },
  section: {
    gap: spacing[12],
  },
  sectionTitleWrap: {
    gap: spacing[4],
  },
  eyebrowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing[6],
  },
  eyebrow: {
    color: colors.primary,
    fontFamily: fonts.mono,
    fontSize: typography.caption.fontSize,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: typography.sectionTitle.fontSize,
    fontWeight: '900',
    lineHeight: typography.sectionTitle.lineHeight,
  },
  pressCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing[6],
    padding: spacing[14],
  },
  pressCardSelected: {
    backgroundColor: colors.primaryDim,
    borderColor: colors.primary,
  },
  pressCardTitle: {
    color: colors.text,
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    fontWeight: '900',
  },
  pressCardIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  pressCardCopy: {
    flex: 1,
    gap: spacing[4],
    minWidth: 0,
  },
  pressCardBody: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight,
  },
  pillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  rulesInput: {
    minHeight: 110,
  },
});
