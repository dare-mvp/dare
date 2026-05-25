import { useRouter } from 'expo-router';
import { Headphones, MessageCircle, ShieldAlert } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '../../src/components/ui/ActionButton';
import { InlineAlert } from '../../src/components/ui/InlineAlert';
import { ProfileFlowFrame } from '../../src/features/profile/components/ProfileFlowFrame';
import { colors, fonts, radius, spacing, typography } from '../../src/theme/tokens';

const supportOptions = [
  {
    body: 'Get help with deposits, withdrawals, or wallet status.',
    icon: <Headphones color={colors.success} size={20} />,
    title: 'Payments support',
  },
  {
    body: 'Ask about disputes, evidence, or jury review status.',
    icon: <ShieldAlert color={colors.warning} size={20} />,
    title: 'Dispute support',
  },
  {
    body: 'Report account access, devices, or suspicious activity.',
    icon: <MessageCircle color={colors.info} size={20} />,
    title: 'Account support',
  },
];

export default function SupportScreen() {
  const router = useRouter();

  return (
    <ProfileFlowFrame
      eyebrow="Support"
      onBack={() => router.back()}
      title="Get help safely."
      subtitle="Support flows should never ask for passwords, OTPs, or withdrawal codes."
    >
      <View style={styles.panel}>
        {supportOptions.map((option) => (
          <View key={option.title} style={styles.option}>
            <View style={styles.icon}>{option.icon}</View>
            <View style={styles.copy}>
              <Text style={styles.title}>{option.title}</Text>
              <Text style={styles.body}>{option.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <InlineAlert
        tone="danger"
        title="Protect your account"
        message="DARE support will not ask for your password, OTP, private keys, or bank authorization codes."
      />
      <ActionButton accessibilityLabel="Back to profile" label="Back to profile" onPress={() => router.replace('/(tabs)/profile')} />
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
  option: {
    alignItems: 'flex-start',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing[12],
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
  title: {
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
