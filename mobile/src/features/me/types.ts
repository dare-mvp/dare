import { CapabilityFlags } from '../../lib/actions/endpoints';
import { MeUser } from '../../lib/actions/endpoints';
import { ProfileSummary } from '../profile/types';
import { WalletSummary } from '../wallet/types';

export type MeDataSource = 'mock' | 'server';

export type MeState = {
  capabilities: CapabilityFlags;
  profile: ProfileSummary;
  source: MeDataSource;
  user: MeUser | null;
  wallet: WalletSummary;
};
