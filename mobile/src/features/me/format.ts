export function formatNgnFromKobo(amountKobo: number) {
  const amount = Math.round(amountKobo / 100);
  return `NGN ${amount.toLocaleString('en-NG')}`;
}

export function formatNgnCompactFromKobo(amountKobo: number) {
  const amount = Math.round(amountKobo / 100);

  if (amount >= 1_000_000) {
    return `NGN ${Math.round(amount / 1_000_000)}M`;
  }

  if (amount >= 1_000) {
    return `NGN ${Math.round(amount / 1_000)}K`;
  }

  return formatNgnFromKobo(amountKobo);
}
