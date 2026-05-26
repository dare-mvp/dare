import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts as useDmSansFonts,
} from '@expo-google-fonts/dm-sans';
import {
  JetBrainsMono_500Medium,
  JetBrainsMono_600SemiBold,
  useFonts as useJetBrainsFonts,
} from '@expo-google-fonts/jetbrains-mono';
import {
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
  useFonts as useSyneFonts,
} from '@expo-google-fonts/syne';

import { colors } from '../src/theme/tokens';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { usePushNotifications } from '../src/features/notifications/usePushNotifications';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [syneLoaded] = useSyneFonts({
    Syne_600SemiBold,
    Syne_700Bold,
    Syne_800ExtraBold,
  });
  const [dmSansLoaded] = useDmSansFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });
  const [jetBrainsLoaded] = useJetBrainsFonts({
    JetBrainsMono_500Medium,
    JetBrainsMono_600SemiBold,
  });

  const fontsLoaded = syneLoaded && dmSansLoaded && jetBrainsLoaded;

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </>
  );
}

function AppNavigator() {
  usePushNotifications();

  return (
    <Stack
      initialRouteName="(auth)"
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="dare/[id]" />
      <Stack.Screen name="dare/[id]/accept" />
      <Stack.Screen name="dare/[id]/accept-receipt" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="create/review" />
      <Stack.Screen name="create/receipt" />
      <Stack.Screen name="court/ready" />
      <Stack.Screen name="court/countdown" />
      <Stack.Screen name="court/play" />
      <Stack.Screen name="court/result" />
      <Stack.Screen name="court/settlement-status" />
      <Stack.Screen name="disputes/file" />
      <Stack.Screen name="disputes/evidence-upload" />
      <Stack.Screen name="disputes/status" />
      <Stack.Screen name="jury/index" />
      <Stack.Screen name="jury/assignment" />
      <Stack.Screen name="jury/vote" />
      <Stack.Screen name="jury/receipt" />
      <Stack.Screen name="profile/edit" />
      <Stack.Screen name="profile/jury-eligibility" />
      <Stack.Screen name="profile/settings" />
      <Stack.Screen name="profile/support" />
      <Stack.Screen name="responsible-gaming/index" />
      <Stack.Screen name="responsible-gaming/edit-limits" />
      <Stack.Screen name="responsible-gaming/self-exclusion" />
      <Stack.Screen name="responsible-gaming/cool-off-receipt" />
      <Stack.Screen name="wallet/deposit" />
      <Stack.Screen name="wallet/deposit-pending" />
      <Stack.Screen name="wallet/withdraw" />
      <Stack.Screen name="wallet/withdrawal-receipt" />
      <Stack.Screen name="wallet/transaction/[id]" />
    </Stack>
  );
}
