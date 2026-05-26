export type FaqItem = {
  question: string;
  answer: string;
  category: 'payments' | 'gameplay' | 'safety' | 'account';
};

export const faqItems: FaqItem[] = [
  // Payments
  {
    category: 'payments',
    question: 'How do payouts work?',
    answer:
      'When a DARE settles, the winner receives the eligible escrow payout after platform fees. Wallet updates are recorded through immutable ledger entries and the funds hit your wallet within seconds of settlement.',
  },
  {
    category: 'payments',
    question: 'Which banks and payment methods are supported?',
    answer:
      'Deposits and withdrawals are handled through our integrated payment provider. Nigerian bank transfers, USSD, and card payments are supported. Coverage depends on the provider available at launch in your region.',
  },
  {
    category: 'payments',
    question: 'How much does DARE charge in fees?',
    answer:
      'DARE charges a platform fee on each settled DARE. The fee is shown clearly on the escrow review screen before you confirm the challenge — there are no hidden charges.',
  },
  {
    category: 'payments',
    question: 'How do I withdraw my winnings?',
    answer:
      'Go to your Wallet, tap Withdraw, enter your bank details, and submit. Withdrawals are reviewed and processed within one business day. KYC verification is required before your first withdrawal.',
  },
  // Gameplay
  {
    category: 'gameplay',
    question: "What happens if there's a dispute?",
    answer:
      'A player can file a dispute during the dispute window after the challenge ends. Evidence is reviewed through the blind jury flow — jurors see only the clips and proof, not the players\' identities. The final verdict controls settlement.',
  },
  {
    category: 'gameplay',
    question: 'Who are the jurors?',
    answer:
      'Jurors are eligible DARE users who meet KYC, trust score, and anti-collusion checks. Jury packets are blinded so jurors focus on evidence, not identity. Jurors earn small rewards for accurate verdicts.',
  },
  {
    category: 'gameplay',
    question: 'What is a trust score?',
    answer:
      'Trust score reflects account behaviour: completed DAREs, forfeits, dispute history, and jury reliability. A higher trust score lets you access larger stakes and more challenge categories. It protects you from risky matches too.',
  },
  {
    category: 'gameplay',
    question: 'Can I cancel a DARE after it is accepted?',
    answer:
      'Once both players confirm and escrow is locked, backing out triggers a forfeit penalty. Forfeits affect your trust score and the forfeited stake goes to your opponent. You can void a DARE before it is accepted with no penalty.',
  },
  {
    category: 'gameplay',
    question: 'How does the evidence submission work?',
    answer:
      'After completing your challenge, you upload your proof clip or photo within the submission window. Geo-location data and timestamps are attached automatically. Late submissions are penalised or forfeited depending on the DARE settings.',
  },
  // Safety
  {
    category: 'safety',
    question: 'Is DARE legal in Nigeria and Kenya?',
    answer:
      'DARE operates as a skill-based challenges platform under the Predominance Test — outcomes are determined by player skill, not chance. We are pursuing relevant licences in launch markets and comply with applicable consumer protection regulations.',
  },
  {
    category: 'safety',
    question: 'What responsible gaming tools are available?',
    answer:
      'You can set daily, weekly, or monthly deposit limits from your profile settings. Self-exclusion is available immediately and locks your account from wagering for the chosen period. DARE also flags unusual activity and can restrict high-risk accounts.',
  },
  // Account
  {
    category: 'account',
    question: 'What does KYC verification involve?',
    answer:
      'KYC (Know Your Customer) requires a government-issued ID and a selfie. Tier 1 unlocks basic wagering; Tier 2 is needed for larger stakes and withdrawals. Verification is handled securely and your documents are not shared with other players.',
  },
  {
    category: 'account',
    question: 'What is the minimum age to use DARE?',
    answer:
      'DARE is available to users aged 18 and over. Age is verified during the KYC process. Accounts found to be under 18 are permanently closed and any balance is refunded.',
  },
];

export const FAQ_CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'payments', label: 'Payments' },
  { value: 'gameplay', label: 'Gameplay' },
  { value: 'safety', label: 'Safety' },
  { value: 'account', label: 'Account' },
] as const;

export type FaqCategory = (typeof FAQ_CATEGORIES)[number]['value'];
