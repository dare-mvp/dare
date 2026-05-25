import { useRouter } from 'expo-router';
import { Bell, LockKeyhole, Shield, Smartphone } from 'lucide-react-native';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { ProfileFlowFrame } from '../../src/features/profile/components/ProfileFlowFrame';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const settings = [
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
    value: true,
  },
  {
    body: 'Show devices connected to this account.',
    icon: <Smartphone color={colors.info} size={20} />,
    label: 'Known devices',
    value: false,
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <ProfileFlowFrame
      eyebrow="Settings"
      onBack={() => router.back()}
      title="Account controls."
      subtitle="Manage preferences that affect notifications, security, and account safety."
    >
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
    </ProfileFlowFrame>
  );
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
