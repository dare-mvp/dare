import { DareFeedItem } from '../features/feed/components/DareCard';

export const featuredDares: DareFeedItem[] = [
  {
    id: 'dare-open-1',
    title: 'Beat a 12-question Premier League quiz in court mode',
    category: 'Sports',
    stakeKobo: 250000,
    status: 'open',
    resolution: 'Algorithmic',
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
    title: 'Answer five Afrobeats history questions before timeout',
    category: 'Music',
    stakeKobo: 100000,
    status: 'live',
    resolution: 'Court quiz',
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
    title: 'Resolve a contested fintech trivia result with jury review',
    category: 'Finance',
    stakeKobo: 500000,
    status: 'disputed',
    resolution: 'Jury',
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
