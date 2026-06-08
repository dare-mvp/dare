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
      'When a Skill-Based DARE settles, the winner receives the eligible escrow payout after platform fees. When a Task-Based DARE settles, the performer receives the Darer-funded reward after valid completion. Wallet updates are recorded through immutable ledger entries.',
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
      'DARE charges a platform fee on each settled DARE. The fee is shown clearly on the escrow review screen before you confirm the DARE. There are no hidden charges.',
  },
  {
    category: 'payments',
    question: 'How do I withdraw my payouts?',
    answer:
      'Go to your Wallet, tap Withdraw, enter your bank details, and submit. Withdrawals are reviewed and processed within one business day. KYC verification is required before your first withdrawal.',
  },
  // Gameplay
  {
    category: 'gameplay',
    question: 'What is the difference between Skill-Based and Task-Based?',
    answer:
      'Skill-Based DAREs are two-sided competitions: the Darer and Challenger both stake funds, then the winner receives the eligible payout after settlement. Task-Based DAREs are reward flows: the Darer funds the reward, and the Performer does not stake money.',
  },
  {
    category: 'gameplay',
    question: 'How are DARE results decided?',
    answer:
      'Each DARE has a user-authored constitution and one resolution path. Answer Key is for objective prompts with committed answers. Witnessed is for live performance with eligible witness signals. Evidence is for proof packets such as video, photos, screen recordings, or location-backed submissions. Disputes move to blinded jury or admin review.',
  },
  {
    category: 'gameplay',
    question: "What happens if there's a dispute?",
    answer:
      'A player can file a dispute during the dispute window after the DARE ends. The review packet follows the DARE constitution and can include answer events, witness signals, clips, photos, metadata, and participant claims. Jurors receive blinded packets where possible so they focus on proof, not identity.',
  },
  {
    category: 'gameplay',
    question: 'Who are the jurors?',
    answer:
      'Jurors are eligible DARE users who meet KYC, trust score, and anti-collusion checks. Jury packets are blinded so jurors focus on evidence, not identity. Jurors can receive review rewards under platform policy.',
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
      'Once participants confirm and escrow is locked, backing out triggers the DARE forfeit or refund policy. Skill-Based forfeits can award the opponent. Task-Based forfeits can refund the Darer or pay the performer depending on proof and the constitution. You can void a DARE before it is accepted with no penalty.',
  },
  {
    category: 'gameplay',
    question: 'How does the evidence submission work?',
    answer:
      'For Evidence DAREs, you upload the required clip, photo, screen recording, or location-backed proof within the submission window. Metadata and file hashes are attached where supported. Late or incomplete submissions follow the forfeit, refund, or review rules in the DARE constitution.',
  },
  // Safety
  {
    category: 'safety',
    question: 'Is DARE legal in Nigeria and Kenya?',
    answer:
      'DARE operates as a skill-based challenges platform under the Predominance Test: outcomes are determined by player skill, not chance. We are pursuing relevant licences in launch markets and comply with applicable consumer protection regulations.',
  },
  {
    category: 'safety',
    question: 'What responsible gaming tools are available?',
    answer:
      'You can set daily, weekly, or monthly deposit limits from your profile settings. Self-exclusion is available immediately and locks your account from paid DARE participation for the chosen period. DARE also flags unusual activity and can restrict high-risk accounts.',
  },
  // Account
  {
    category: 'account',
    question: 'What does KYC verification involve?',
    answer:
      'KYC (Know Your Customer) requires a government-issued ID and a selfie. Tier 1 unlocks basic paid DARE participation; Tier 2 is needed for larger stakes, rewards, and withdrawals. Verification is handled securely and your documents are not shared with other players.',
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
