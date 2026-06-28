import type { AcceptQuoteResponse } from '../../lib/actions/endpoints';
import type { DareFeedItem } from './components/DareCard';

export type AcceptTrustWarning = {
  acknowledgementRequired: boolean;
  blocking: boolean;
  code:
    | 'BALANCE_OR_LIMIT_BLOCKED'
    | 'HIGH_STAKE'
    | 'LOW_TRUST'
    | 'NEW_ACCOUNT'
    | 'NOT_ACCEPTABLE'
    | 'RULES_INCOMPLETE'
    | 'SUBJECTIVE_REVIEW';
  message: string;
  title: string;
};

const LOW_TRUST_SCORE_THRESHOLD = 450;

export function getAcceptTrustWarnings(params: {
  dare: DareFeedItem;
  quote: AcceptQuoteResponse | null;
}): AcceptTrustWarning[] {
  const warnings: AcceptTrustWarning[] = [];
  const issuer = params.dare.playerA;
  const quote = params.quote;

  if (issuer.trustScore > 0 && issuer.trustScore < LOW_TRUST_SCORE_THRESHOLD) {
    warnings.push({
      acknowledgementRequired: true,
      blocking: false,
      code: 'LOW_TRUST',
      message: 'This issuer has a low trust score. Review the constitution before locking funds.',
      title: 'Low trust opponent',
    });
  }

  if (issuer.trustScore === 0 || /new/i.test(issuer.tier)) {
    warnings.push({
      acknowledgementRequired: true,
      blocking: false,
      code: 'NEW_ACCOUNT',
      message: 'This account has limited visible history on DARE.',
      title: 'New or unproven account',
    });
  }

  if (!params.dare.rules || params.dare.rules.trim().length < 20) {
    warnings.push({
      acknowledgementRequired: false,
      blocking: true,
      code: 'RULES_INCOMPLETE',
      message: 'Rules are incomplete. Do not accept until the DARE is refreshed with a full constitution.',
      title: 'Rules incomplete',
    });
  }

  if (params.dare.resolution !== 'Answer Key') {
    warnings.push({
      acknowledgementRequired: true,
      blocking: false,
      code: 'SUBJECTIVE_REVIEW',
      message: 'This result may require evidence, witnesses, or jury review before settlement.',
      title: 'Review may be needed',
    });
  }

  const amountKobo = quote?.totalDueAmount ?? params.dare.stakeKobo;
  if (amountKobo >= 2_000_000) {
    warnings.push({
      acknowledgementRequired: true,
      blocking: false,
      code: 'HIGH_STAKE',
      message: 'This amount is high. Confirm your limits and available balance before accepting.',
      title: 'High stake',
    });
  }

  if (quote && !quote.canAccept) {
    warnings.push({
      acknowledgementRequired: false,
      blocking: true,
      code: quote.reasonCode === 'ACCOUNT_READY' ? 'BALANCE_OR_LIMIT_BLOCKED' : 'NOT_ACCEPTABLE',
      message: 'The server quote says this DARE cannot be accepted in its current state.',
      title: 'Accept blocked',
    });
  }

  return warnings;
}

export function requiresAcceptRiskAcknowledgement(warnings: AcceptTrustWarning[]) {
  return warnings.some((warning) => warning.acknowledgementRequired && !warning.blocking);
}

export function hasBlockingAcceptWarning(warnings: AcceptTrustWarning[]) {
  return warnings.some((warning) => warning.blocking);
}
