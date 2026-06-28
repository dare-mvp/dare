export type MoneyPreviewLine = {
  emphasis?: boolean;
  label: string;
  valueKobo: number;
};

export type MoneyPreview = {
  footnote: string;
  lines: MoneyPreviewLine[];
  title: string;
};

export function getCreateMoneyPreview(params: {
  dareType: 'skill' | 'task';
  platformFeeKobo: number;
  rewardKobo: number;
  stakeKobo: number;
}): MoneyPreview {
  if (params.dareType === 'task') {
    return {
      footnote: 'Estimated until server confirmation. Reward returns to Darer if expired or voided according to policy.',
      lines: [
        { emphasis: true, label: 'Darer reward locked', valueKobo: params.rewardKobo },
        { label: 'Performer stake', valueKobo: 0 },
        { label: 'Performer receives after valid completion', valueKobo: Math.max(0, params.rewardKobo - params.platformFeeKobo) },
        { label: 'Platform fee', valueKobo: params.platformFeeKobo },
        { label: 'Refund if expired', valueKobo: params.rewardKobo },
      ],
      title: 'Create money preview',
    };
  }

  return {
    footnote: 'Estimated until server confirmation. Dispute hold is possible if the result is challenged.',
    lines: [
      { emphasis: true, label: 'You lock', valueKobo: params.stakeKobo },
      { label: 'They lock', valueKobo: params.stakeKobo },
      { label: 'Winner receives', valueKobo: Math.max(0, params.stakeKobo * 2 - params.platformFeeKobo) },
      { label: 'Platform fee', valueKobo: params.platformFeeKobo },
      { label: 'Refund if expired', valueKobo: params.stakeKobo },
    ],
    title: 'Create money preview',
  };
}

export function getAcceptMoneyPreview(params: {
  dareType: 'skill' | 'task';
  issuerEscrowKobo: number;
  platformFeeKobo: number;
  rewardKobo: number;
  source?: 'estimated' | 'server';
  totalDueKobo: number;
  winnerPayoutKobo: number;
}): MoneyPreview {
  const footnote = params.source === 'estimated'
    ? 'Estimated from cached DARE details until the server quote loads. Do not accept until eligibility and money terms are confirmed.'
    : 'Server quote. Dispute hold is possible if the result is challenged.';

  if (params.dareType === 'task') {
    return {
      footnote: params.source === 'estimated'
        ? footnote
        : 'Server quote. Dispute hold is possible if proof or completion is challenged.',
      lines: [
        { emphasis: true, label: 'Darer reward locked', valueKobo: params.rewardKobo },
        { label: 'Performer stake', valueKobo: 0 },
        { label: 'Performer receives after valid completion', valueKobo: params.winnerPayoutKobo },
        { label: 'Platform fee', valueKobo: params.platformFeeKobo },
        { label: 'You lock', valueKobo: params.totalDueKobo },
      ],
      title: 'Accept money preview',
    };
  }

  return {
    footnote,
    lines: [
      { emphasis: true, label: 'You lock', valueKobo: params.totalDueKobo },
      { label: 'They lock', valueKobo: params.issuerEscrowKobo },
      { label: 'Winner receives', valueKobo: params.winnerPayoutKobo },
      { label: 'Platform fee', valueKobo: params.platformFeeKobo },
      { label: 'Refund if expired', valueKobo: params.totalDueKobo },
    ],
    title: 'Accept money preview',
  };
}
