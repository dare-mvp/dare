import { WalletTransactionDetail, WalletTransactionType } from './types';

type LedgerCopyInput = {
  amountKobo: number;
  dareId: string | null;
  direction: 'credit' | 'debit';
  id: string;
  metadata: Record<string, unknown> | null;
  rawType: string;
  status: string;
};

export type WalletTransactionCopy = {
  description: string;
  details: WalletTransactionDetail[];
  label: string;
  referenceLabel: string;
  type: WalletTransactionType;
};

export function getWalletTransactionCopy(input: LedgerCopyInput): WalletTransactionCopy {
  const metadata = input.metadata ?? {};
  const role = readString(metadata, 'role');
  const dareType = readString(metadata, 'dare_type');
  const fundingModel = readString(metadata, 'funding_model');
  const reason = readString(metadata, 'reason');
  const label = readString(metadata, 'label');

  const base = getBaseCopy(input.rawType, {
    dareType,
    fundingModel,
    reason,
    role,
  });

  return {
    ...base,
    details: buildDetails(input, { dareType, fundingModel, reason, role }),
    label: label ?? base.label,
    referenceLabel: shortReference(input.id),
  };
}

function getBaseCopy(
  rawType: string,
  metadata: { dareType: string | null; fundingModel: string | null; reason: string | null; role: string | null },
): Omit<WalletTransactionCopy, 'details' | 'referenceLabel'> {
  switch (rawType) {
    case 'deposit_confirmed':
      return {
        description: 'Deposit is confirmed by the payment provider and added to available balance.',
        label: 'Deposit confirmed',
        type: 'deposit',
      };
    case 'withdrawal_completed':
      return {
        description: 'Withdrawal has been sent by the payment provider.',
        label: 'Withdrawal sent',
        type: 'withdrawal_pending',
      };
    case 'withdrawal_pending':
      return {
        description: 'Withdrawal is queued until provider confirmation updates the wallet.',
        label: 'Withdrawal pending',
        type: 'withdrawal_pending',
      };
    case 'escrow_hold':
      return getEscrowHoldCopy(metadata);
    case 'escrow_release':
      return getEscrowReleaseCopy(metadata);
    case 'payout':
      return {
        description: metadata.dareType === 'task'
          ? 'Task reward was paid to the performer after settlement.'
          : 'Winner payout was posted from the settled stake pool.',
        label: 'Winner payout',
        type: 'payout',
      };
    case 'platform_fee':
      return {
        description: 'Platform fee was deducted during final settlement.',
        label: 'Settlement fee',
        type: 'platform_fee',
      };
    case 'juror_reward':
      return {
        description: 'Jury reward was posted after eligible review activity.',
        label: 'Jury reward',
        type: 'jury_reward',
      };
    case 'reversal':
      return {
        description: 'A previous wallet movement was reversed.',
        label: 'Wallet reversal',
        type: 'reversal',
      };
    case 'adjustment':
      return {
        description: 'Manual wallet adjustment posted by an authorized operation.',
        label: 'Wallet adjustment',
        type: 'adjustment',
      };
    case 'bonus_credit':
      return {
        description: 'Bonus credit posted to the wallet.',
        label: 'Bonus credit',
        type: 'bonus_credit',
      };
    default:
      return {
        description: 'Wallet ledger entry posted by the server.',
        label: formatLabel(rawType),
        type: 'adjustment',
      };
  }
}

function getEscrowHoldCopy(
  metadata: { dareType: string | null; fundingModel: string | null; reason: string | null; role: string | null },
) {
  if (metadata.reason === 'dispute_pending') {
    return {
      description: 'Escrow is frozen while jury or admin review is pending.',
      label: 'Dispute hold',
      type: 'stake_lock' as const,
    };
  }

  if (metadata.dareType === 'task' || metadata.fundingModel === 'darer_reward') {
    return {
      description: 'Creator reward is locked; the task performer does not stake money.',
      label: 'Task creator reward locked',
      type: 'stake_lock' as const,
    };
  }

  if (metadata.role === 'challenger') {
    return {
      description: 'Challenger stake is locked; both Skill-Based stakes settle together.',
      label: 'Skill challenger stake locked',
      type: 'stake_lock' as const,
    };
  }

  return {
    description: 'Creator stake is locked in escrow until result settlement.',
    label: 'Skill creator stake locked',
    type: 'stake_lock' as const,
  };
}

function getEscrowReleaseCopy(
  metadata: { dareType: string | null; reason: string | null },
) {
  if (metadata.reason === 'dare_cancelled') {
    return {
      description: 'Escrow was returned because the DARE was cancelled before settlement.',
      label: 'DARE cancellation refund',
      type: 'stake_release' as const,
    };
  }

  if (metadata.reason === 'self_exclusion') {
    return {
      description: 'Escrow was returned after responsible gaming protections were applied.',
      label: 'Responsible gaming refund',
      type: 'stake_release' as const,
    };
  }

  if (metadata.reason === 'tie_or_void' || metadata.reason === 'void_or_no_valid_completion') {
    return {
      description: metadata.dareType === 'task'
        ? 'Task reward was returned because settlement ended void or had no valid completion.'
        : 'Stake escrow was returned because the result was void or tied.',
      label: 'Void/refund returned',
      type: 'stake_release' as const,
    };
  }

  return {
    description: 'Escrow was released back to available balance.',
    label: 'Escrow refund',
    type: 'stake_release' as const,
  };
}

function buildDetails(
  input: LedgerCopyInput,
  metadata: { dareType: string | null; fundingModel: string | null; reason: string | null; role: string | null },
) {
  const details: WalletTransactionDetail[] = [
    { label: 'Ledger type', value: formatLabel(input.rawType) },
    { label: 'Direction', value: input.direction },
    { label: 'Status', value: formatLabel(input.status) },
  ];

  if (metadata.role) details.push({ label: 'Role', value: formatLabel(metadata.role) });
  if (metadata.dareType) details.push({ label: 'DARE type', value: formatLabel(metadata.dareType) });
  if (metadata.fundingModel) details.push({ label: 'Funding', value: formatLabel(metadata.fundingModel) });
  if (metadata.reason) details.push({ label: 'Reason', value: formatLabel(metadata.reason) });
  if (input.dareId) details.push({ label: 'DARE', value: shortReference(input.dareId) });

  return details;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function shortReference(value: string) {
  return value.length > 12 ? value.slice(0, 8).toUpperCase() : value.toUpperCase();
}

function formatLabel(value: string) {
  return value.replace(/[_-]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
