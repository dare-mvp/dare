import { Linking, Platform, Share } from 'react-native';

import {
  buildDareShareMessage,
  getDarePublicUrl,
  getPublicSiteUrl,
  sanitizeShareLine,
  type PublicDareShareContext,
} from './shareLinks';

export { buildDareShareMessage, getDareAppUrl, getDarePublicUrl, type PublicDareShareContext } from './shareLinks';

export async function shareProfile(displayName: string) {
  const publicSiteUrl = getPublicSiteUrl();

  await Share.share({
    message: `I'm on DARE as ${sanitizeShareLine(displayName)}. Join me on DARE: ${publicSiteUrl}`,
    title: 'Share DARE profile',
    url: publicSiteUrl,
  });
}

export async function shareDare(input: PublicDareShareContext) {
  const message = buildDareShareMessage(input);
  const title = sanitizeShareLine(input.title ?? '') || 'DARE challenge';

  await Share.share({
    message,
    title,
    url: getDarePublicUrl(input.id ?? ''),
  });
}

export async function shareDareToWhatsApp(input: PublicDareShareContext) {
  const encodedMessage = encodeURIComponent(buildDareShareMessage(input));
  const nativeUrl = `whatsapp://send?text=${encodedMessage}`;
  const webUrl = `https://wa.me/?text=${encodedMessage}`;

  if (Platform.OS === 'web') {
    await Linking.openURL(webUrl);
    return;
  }

  try {
    await Linking.openURL(nativeUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}
