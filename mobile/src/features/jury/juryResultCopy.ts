export type JuryReceiptParams = {
  dareStatus?: string;
  status?: string;
  verdict?: string;
  vote?: string;
  votesCast?: string;
  votesNeeded?: string;
  winnerId?: string;
};

export type JuryResultCopy = {
  resultLabel: string;
  settlementLabel: string;
  settlementMessage: string;
  tone: 'info' | 'success' | 'warning';
  trustEvent: string;
};

export function getJuryResultCopy(params: JuryReceiptParams): JuryResultCopy {
  const verdict = normalizeVerdict(params.verdict);

  if (params.status === 'escalated' || verdict === 'escalate') {
    return {
      resultLabel: 'Escalated for admin review',
      settlementLabel: 'Settlement held',
      settlementMessage: 'Escrow remains frozen until admin review closes the jury case.',
      tone: 'warning',
      trustEvent: 'Pending admin review',
    };
  }

  if (params.status === 'settlement_pending' && verdict) {
    return {
      resultLabel: verdict === 'void' ? 'Void verdict reached' : `Packet ${verdict} verdict reached`,
      settlementLabel: verdict === 'void' ? 'Refund pending' : 'Payout pending',
      settlementMessage: verdict === 'void'
        ? 'Settlement will return eligible escrow after the server posts refund ledger entries.'
        : 'Settlement will post winner payout after final server verification.',
      tone: 'success',
      trustEvent: 'Verdict recorded',
    };
  }

  return {
    resultLabel: 'Vote pending tally',
    settlementLabel: 'Awaiting verdict',
    settlementMessage: 'Reward, trust, payout, and refund updates wait until the jury case closes.',
    tone: 'info',
    trustEvent: 'Pending verdict',
  };
}

export function normalizeVerdict(value?: string) {
  if (value === 'A' || value === 'B' || value === 'void' || value === 'escalate') return value;
  return null;
}
