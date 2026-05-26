export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: 'How does DARE handle payouts?',
    answer:
      'Winnings are credited to your DARE wallet immediately after settlement. You can withdraw to your linked bank account at any time — withdrawals are processed within one business day. Funds are held in escrow during the challenge so both parties are protected.',
  },
  {
    question: 'What happens if there is a dispute?',
    answer:
      'Either player can file a dispute within 24 hours of the challenge deadline. A randomly selected jury of verified DARE users reviews the evidence and votes on the outcome. Their verdict is final. Escalated cases are reviewed by the DARE admin team.',
  },
  {
    question: 'How does the jury system work?',
    answer:
      'The jury is drawn from a pool of verified players with a trust score above the threshold for the stake level. Jurors are selected randomly and anonymously. Each juror reviews evidence submitted by both players and casts a vote. A majority verdict determines the winner.',
  },
  {
    question: 'What is a trust score?',
    answer:
      'Your trust score reflects your history on the platform — how reliably you complete challenges, whether disputes are filed against you, and whether you provide evidence on time. A higher trust score unlocks higher-stake challenges and jury eligibility.',
  },
  {
    question: 'Which banks are supported for withdrawals?',
    answer:
      'DARE supports all major Nigerian banks via Paystack. This includes GTBank, Access Bank, Zenith Bank, First Bank, UBA, Polaris Bank, Fidelity Bank, and more. Simply enter your account number and select your bank — account name verification happens automatically.',
  },
];
