import type { MeState } from '../me/types';
import { formatNgnFromKobo } from '../me/format';

export function getCreateStakeAvailabilityError(stakeKobo: number, me: MeState) {
  if (me.source !== 'server' || stakeKobo <= 0) return null;

  if (stakeKobo > me.wallet.availableKobo) {
    return `Available balance is ${formatNgnFromKobo(me.wallet.availableKobo)}. Lower the stake or deposit funds.`;
  }

  return null;
}
