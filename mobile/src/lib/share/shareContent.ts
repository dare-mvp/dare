import { Share } from 'react-native';

const PUBLIC_SITE_URL = 'https://www.daregamesapp.com';

export async function shareProfile(displayName: string) {
  await Share.share({
    message: `I'm on DARE as ${displayName}. Join me on DARE: ${PUBLIC_SITE_URL}`,
    title: 'Share DARE profile',
    url: PUBLIC_SITE_URL,
  });
}

export async function shareDare(input: { id: string; title: string }) {
  await Share.share({
    message: `${input.title}\n\nExplore DARE: ${PUBLIC_SITE_URL}\nDARE ID: ${input.id}`,
    title: input.title,
    url: PUBLIC_SITE_URL,
  });
}
