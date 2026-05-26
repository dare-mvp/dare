export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: 'How do payouts work?',
    answer:
      'When a DARE settles, the winner receives the eligible escrow payout after platform fees. Wallet updates are recorded through immutable ledger entries.',
  },
  {
    question: "What happens if there's a dispute?",
    answer:
      'A player can file a dispute during the dispute window. Evidence is reviewed through the jury flow, and the final verdict controls settlement.',
  },
  {
    question: 'Who are the jurors?',
    answer:
      'Jurors are eligible DARE users who meet KYC, trust, and anti-collusion checks. Jury packets are blinded so jurors focus on evidence, not identity.',
  },
  {
    question: 'What is a trust score?',
    answer:
      'Trust score reflects account behavior such as completed DAREs, forfeits, disputes, and jury reliability. It helps protect players from risky matches.',
  },
  {
    question: 'Which banks and accounts are supported?',
    answer:
      'Deposits and withdrawals are handled through the configured payment provider. Supported banks depend on the provider coverage available at launch.',
  },
];
