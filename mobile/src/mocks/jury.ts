import { JuryEvidenceSide } from '../features/jury/components/JuryEvidencePacket';

export const jurySummary = {
  activeAssignments: 1,
  categories: ['Knowledge', 'Sports', 'Finance'],
  completedVotes: 18,
  eligibility: 'Eligible',
  trustEarned: 96,
};

export const juryAssignment = {
  caseId: 'jury-case-001',
  category: 'Finance',
  dueLabel: 'Due in 2h 14m',
  rewardLabel: 'NGN 150',
  title: 'Fintech trivia verdict review',
};

export const juryEvidenceSides: [JuryEvidenceSide, JuryEvidenceSide] = [
  {
    body: 'Packet A claims the final answer was submitted before timeout and includes a court timer screenshot.',
    filesCount: 2,
    label: 'A',
  },
  {
    body: 'Packet B claims the answer arrived after timeout and includes the scoring receipt plus replay timestamp.',
    filesCount: 3,
    label: 'B',
  },
];
