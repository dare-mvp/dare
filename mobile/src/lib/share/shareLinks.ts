const PUBLIC_SITE_URL = 'https://www.daregamesapp.com';
const APP_SCHEME = 'dare';

export type PublicDareShareContext = {
  id?: string | null;
  title?: string | null;
  stakeLabel?: string;
  resolutionLabel?: string;
  statusLabel?: string;
};

export function buildDareShareMessage(input: PublicDareShareContext) {
  const id = getShareableDareId(input.id);
  const title = sanitizeShareLine(input.title ?? '') || 'DARE challenge';

  return [
    title,
    input.stakeLabel ? `Stake/reward: ${sanitizeShareLine(input.stakeLabel)}` : null,
    input.resolutionLabel ? `Proof: ${sanitizeShareLine(input.resolutionLabel)}` : null,
    input.statusLabel ? `Status: ${sanitizeShareLine(input.statusLabel)}` : null,
    `Open DARE: ${getDarePublicUrl(id)}`,
    `DARE ID: ${sanitizeShareLine(id)}`,
  ].filter((line): line is string => Boolean(line)).join('\n');
}

export function getDarePublicUrl(id: string) {
  return `${PUBLIC_SITE_URL}/dare/${encodeURIComponent(getShareableDareId(id))}`;
}

export function getDareAppUrl(id: string) {
  return `${APP_SCHEME}:///dare/${encodeURIComponent(getShareableDareId(id))}`;
}

export function getPublicSiteUrl() {
  return PUBLIC_SITE_URL;
}

export function sanitizeShareLine(value: string) {
  return value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function getShareableDareId(value: string | null | undefined) {
  const id = sanitizeShareLine(value ?? '');
  if (!id) {
    throw new Error('A confirmed DARE reference is required before sharing.');
  }

  return id.slice(0, 128);
}
