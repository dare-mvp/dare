import {
  assertInteger,
  assertOneOf,
  assertRecord,
  assertString,
  validationError,
} from "../_shared/validation.ts";

const MIN_WITHDRAWAL_KOBO = 50_000;
const MAX_WITHDRAWAL_KOBO = 5_000_000;
const SUPPORTED_CURRENCIES = ["NGN"] as const;
const DESTINATION_TYPES = ["bank_account"] as const;

export type WithdrawalPayload = {
  amount: number;
  currency: typeof SUPPORTED_CURRENCIES[number];
  destination: {
    type: typeof DESTINATION_TYPES[number];
    bankCode: string;
    accountNumberToken: string;
    accountName: string;
  };
};

export function validateWithdrawalPayload(value: unknown): WithdrawalPayload {
  const payload = assertRecord(value, "payload");
  const destination = assertRecord(payload.destination, "payload.destination");
  const bankCode = assertString(
    destination.bankCode,
    "payload.destination.bankCode",
    {
      min: 3,
      max: 12,
    },
  );
  const accountNumberToken = assertString(
    destination.accountNumberToken,
    "payload.destination.accountNumberToken",
    { min: 12, max: 128 },
  );

  if (!/^[0-9]+$/.test(bankCode)) {
    throw validationError(
      "payload.destination.bankCode",
      "must contain only digits",
    );
  }

  if (!/^[A-Za-z0-9:_-]+$/.test(accountNumberToken)) {
    throw validationError(
      "payload.destination.accountNumberToken",
      "must be a token reference",
    );
  }

  return {
    amount: assertInteger(payload.amount, "payload.amount", {
      min: MIN_WITHDRAWAL_KOBO,
      max: MAX_WITHDRAWAL_KOBO,
    }),
    currency: assertOneOf(
      payload.currency,
      SUPPORTED_CURRENCIES,
      "payload.currency",
    ),
    destination: {
      type: assertOneOf(
        destination.type,
        DESTINATION_TYPES,
        "payload.destination.type",
      ),
      bankCode,
      accountNumberToken,
      accountName: assertString(
        destination.accountName,
        "payload.destination.accountName",
        { min: 2, max: 120 },
      ),
    },
  };
}
