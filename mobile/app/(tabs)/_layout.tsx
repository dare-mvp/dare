import { Tabs } from 'expo-router';
import { CirclePlus, Flame, Scale, User, Wallet } from 'lucide-react-native';

import { colors, fonts, typography } from '../../src/theme/tokens';

const iconSize = 22;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: fonts.body,
          fontSize: typography.caption.fontSize,
          fontWeight: '700',
        },
        tabBarStyle: {
          minHeight: 68,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarAccessibilityLabel: 'Feed tab',
          tabBarIcon: ({ color }) => <Flame color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarAccessibilityLabel: 'Create DARE tab',
          tabBarIcon: ({ color }) => <CirclePlus color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="court"
        options={{
          title: 'Court',
          tabBarAccessibilityLabel: 'Court tab',
          tabBarIcon: ({ color }) => <Scale color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarAccessibilityLabel: 'Wallet tab',
          tabBarIcon: ({ color }) => <Wallet color={color} size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarAccessibilityLabel: 'Profile tab',
          tabBarIcon: ({ color }) => <User color={color} size={iconSize} />,
        }}
      />
    </Tabs>
  );
}
