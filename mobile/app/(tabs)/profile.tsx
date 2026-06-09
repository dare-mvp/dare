import { useRouter } from 'expo-router';
import { LifeBuoy, Settings } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { Screen } from '../../src/components/ui/Screen';
import { TopBar } from '../../src/components/ui/TopBar';
import { formatNgnFromKobo } from '../../src/features/me/format';
import { useMe } from '../../src/features/me/useMe';
import { AccountControlsPanel } from '../../src/features/profile/components/AccountControlsPanel';
import { ProfileHero } from '../../src/features/profile/components/ProfileHero';
import { RecentChallengesPanel } from '../../src/features/profile/components/RecentChallengesPanel';
import { TrustScorePanel } from '../../src/features/profile/components/TrustScorePanel';
import { shareProfile } from '../../src/lib/share/shareContent';
import { colors, spacing } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { data, error, loading } = useMe();
  const profile = data.profile;
  const [shareError, setShareError] = useState<string | null>(null);

  async function handleShareProfile() {
    setShareError(null);

    try {
      await shareProfile(profile.displayName);
    } catch {
      setShareError('Profile sharing is not available right now.');
    }
  }

  return (
    <Screen>
      <TopBar
        balanceLabel={formatNgnFromKobo(data.wallet.availableKobo)}
        displayInitial={profile.avatarInitial}
        subtitle="Stats and reputation"
        title="My Profile"
      />
      <ScrollView contentContainerStyle={styles.content}>
        {data.source === 'mock' && !error ? (
          <InlineAlert
            tone="info"
            title={loading ? 'Syncing profile' : 'Preview data'}
            message={loading ? 'Your profile is loading.' : 'Live profile data appears after sign-in and sync.'}
          />
        ) : null}

        {error ? (
          <InlineAlert
            tone="danger"
            title="Profile sync failed"
            message={error}
          />
        ) : null}

        {shareError ? (
          <InlineAlert
            tone="danger"
            title="Share failed"
            message={shareError}
          />
        ) : null}

        <ProfileHero
          onEditPress={() => router.push('/profile/edit')}
          onSharePress={handleShareProfile}
          profile={profile}
        />
        <TrustScorePanel profile={profile} />
        <AccountControlsPanel
          onJuryEligibilityPress={() => router.push('/profile/jury-eligibility')}
          onJuryPress={() => router.push('/jury')}
          onKycPress={() => router.push('/kyc-status')}
          onResponsibleGamingPress={() => router.push('/responsible-gaming')}
          profile={profile}
        />
        <RecentChallengesPanel challenges={profile.recentChallenges} />
        <View style={styles.secondaryActions}>
          <ActionButton
            accessibilityLabel="Open settings"
            icon={<Settings color={colors.text} size={17} />}
            label="Settings"
            onPress={() => router.push('/profile/settings')}
            variant="secondary"
          />
          <ActionButton
            accessibilityLabel="Open support"
            icon={<LifeBuoy color={colors.text} size={17} />}
            label="Support"
            onPress={() => router.push('/profile/support')}
            variant="secondary"
          />
        </View>
        <InlineAlert
          tone="info"
          title="Eligibility is confirmation-based"
          message="Trust, KYC, jury eligibility, and limits must be confirmed before money-moving actions are enabled."
        />
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
  secondaryActions: {
    gap: spacing[10],
  },
});
