export function nairaToKobo(value: string) {
  const amount = Number.parseInt(value, 10);
  if (!Number.isFinite(amount)) return 0;
  return amount * 100;
}

export function validateDepositAmount(value: string) {
  const amountKobo = nairaToKobo(value);
  if (amountKobo < 10_000) return 'Minimum deposit is NGN 100.';
  if (amountKobo > 5_000_000) return 'Maximum deposit is NGN 50,000.';
  return null;
}

export function validateWithdrawalInput(input: {
  accountName: string;
  accountNumberToken: string;
  amount: string;
  bankCode: string;
}) {
  const amountKobo = nairaToKobo(input.amount);

  if (amountKobo < 50_000) return 'Minimum withdrawal is NGN 500.';
  if (amountKobo > 5_000_000) return 'Maximum withdrawal is NGN 50,000.';
  if (!/^[0-9]{3,12}$/.test(input.bankCode.trim())) return 'Bank code must be 3 to 12 digits.';
  if (!/^[A-Za-z0-9:_-]{12,128}$/.test(input.accountNumberToken.trim())) {
    return 'Bank account token must be a valid token reference.';
  }
  if (input.accountName.trim().length < 2 || input.accountName.trim().length > 120) {
    return 'Account name must be 2 to 120 characters.';
  }

  return null;
}
