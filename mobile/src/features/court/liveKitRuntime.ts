import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

export function canUseNativeLiveKit() {
  return Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}
