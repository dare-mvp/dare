import { DareFeedItem } from '../features/feed/components/DareCard';

export const featuredDares: DareFeedItem[] = [
  {
    id: 'dare-open-1',
    title: 'Win a Premier League debate with creator-set answer rules',
    category: 'Sports',
    stakeKobo: 250000,
    status: 'open',
    resolution: 'Answer Key',
    createdAgo: '12 min ago',
    actionLabel: 'Accept this DARE',
    playerA: {
      name: 'Kade',
      tier: 'Champion',
      trustScore: 820,
      accent: 'ember',
    },
  },
  {
    id: 'dare-live-1',
    title: 'Settle an Afrobeats history challenge live in Court',
    category: 'Music',
    stakeKobo: 100000,
    status: 'live',
    resolution: 'Answer Key',
    createdAgo: '4 min ago',
    actionLabel: 'Players heading to court',
    playerA: {
      name: 'Mira',
      tier: 'Contender',
      trustScore: 360,
      accent: 'info',
    },
    playerB: {
      name: 'Tomi',
      tier: 'Riser',
      trustScore: 240,
      accent: 'ice',
    },
  },
  {
    id: 'dare-disputed-1',
    title: 'Resolve a contested fintech answer-key result with jury review',
    category: 'Finance',
    stakeKobo: 500000,
    status: 'disputed',
    resolution: 'Evidence',
    createdAgo: '1 hr ago',
    actionLabel: 'Jury reviewing',
    viewers: 18,
    playerA: {
      name: 'Ada',
      tier: 'Elite',
      trustScore: 910,
      accent: 'ember',
    },
    playerB: {
      name: 'Ikenna',
      tier: 'Champion',
      trustScore: 770,
      accent: 'info',
    },
  },
  {
    id: 'dare-active-1',
    title: 'First to solve five product-security scenarios wins the pot',
    category: 'Knowledge',
    stakeKobo: 350000,
    status: 'active',
    resolution: 'Live court',
    createdAgo: 'Now',
    actionLabel: 'Challenge underway',
    viewers: 42,
    playerA: {
      name: 'Nora',
      tier: 'Champion',
      trustScore: 690,
      accent: 'win',
    },
    playerB: {
      name: 'Bayo',
      tier: 'Contender',
      trustScore: 410,
      accent: 'ice',
    },
  },
];

export function getFeaturedDareById(id: string) {
  return featuredDares.find((dare) => dare.id === id);
}
