import { useRouter } from 'expo-router';
import { Bell, LockKeyhole, LogOut, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { useAuth } from '../../src/features/auth/AuthProvider';
import { useMe } from '../../src/features/me/useMe';
import { ProfileFlowFrame } from '../../src/features/profile/components/ProfileFlowFrame';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { data, error, loading } = useMe();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const settings = getSettings(data.capabilities);

  return (
    <ProfileFlowFrame
      eyebrow="Settings"
      onBack={() => router.back()}
      title="Account controls."
      subtitle="Manage preferences that affect notifications, security, and account safety."
    >
      {data.source === 'mock' && !error ? (
        <InlineAlert
          tone="info"
          title={loading ? 'Syncing settings' : 'Preview settings'}
          message={loading ? 'Account controls are loading.' : 'Live settings appear after sign-in and sync.'}
        />
      ) : null}

      {error ? (
        <InlineAlert
          tone="danger"
          title="Settings sync failed"
          message={error}
        />
      ) : null}

      {signOutError ? (
        <InlineAlert
          tone="danger"
          title="Sign out failed"
          message={signOutError}
        />
      ) : null}

      <View style={styles.panel}>
        {settings.map((setting) => (
          <View key={setting.label} style={styles.row}>
            <View style={styles.icon}>{setting.icon}</View>
            <View style={styles.copy}>
              <Text style={styles.label}>{setting.label}</Text>
              <Text style={styles.body}>{setting.body}</Text>
            </View>
            <Switch
              accessibilityLabel={setting.label}
              disabled
              thumbColor={setting.value ? colors.primary : colors.textGhost}
              trackColor={{ false: colors.surfaceElevated, true: colors.primaryDim }}
              value={setting.value}
            />
          </View>
        ))}
      </View>
      <InlineAlert
        tone="info"
        title="Security settings"
        message="Sensitive settings require a confirmed session before changes take effect."
      />
      <ActionButton
        accessibilityLabel="Open support"
        label="Support"
        onPress={() => router.push('/profile/support')}
        variant="secondary"
      />
      <ActionButton
        accessibilityLabel="Sign out"
        disabled={signingOut}
        icon={<LogOut color={colors.text} size={17} />}
        label={signingOut ? 'Signing out' : 'Sign out'}
        onPress={() => {
          void handleSignOut();
        }}
        variant="danger"
      />
    </ProfileFlowFrame>
  );

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    const result = await auth.signOut();
    setSigningOut(false);

    if (!result.ok) {
      setSignOutError(result.message);
      return;
    }

    router.replace('/sign-in');
  }
}

function getSettings(capabilities: {
  canCreateDare: boolean;
  canDeposit?: boolean;
  canWithdraw: boolean;
}) {
  return [
    {
      body: 'Manage push and in-app notification preferences.',
      icon: <Bell color={colors.primary} size={20} />,
      label: 'Notifications',
      value: true,
    },
    {
      body: 'Require extra confirmation before money-moving actions.',
      icon: <LockKeyhole color={colors.warning} size={20} />,
      label: 'Money action confirmation',
      value: capabilities.canDeposit || capabilities.canWithdraw || capabilities.canCreateDare,
    },
    {
      body: 'Show devices connected to this account.',
      icon: <Smartphone color={colors.info} size={20} />,
      label: 'Known devices',
      value: false,
    },
  ];
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
    minHeight: 72,
    padding: spacing[14],
  },
  icon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.control,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: typography.body.fontSize,
    fontWeight: '900',
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 17,
    marginTop: spacing[4],
  },
});
