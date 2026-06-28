import type { AcceptQuoteResponse } from '../../lib/actions/endpoints';
import { ACTIVE_COURT_COMMITMENT_MESSAGE } from '../../lib/errors/userMessages';

export function getAcceptBlockedMessage(quote: AcceptQuoteResponse | null) {
  if (!quote || quote.canAccept) return null;

  if (quote.reasonCode === 'SELF_CHALLENGE') {
    return {
      message: 'You cannot accept your own DARE. Share it or wait for another eligible player to accept.',
      title: 'Created by you',
    };
  }

  if (quote.reasonCode === 'TARGETED_TO_ANOTHER_USER') {
    return {
      message: 'This DARE is reserved for another player.',
      title: 'Reserved DARE',
    };
  }

  if (quote.reasonCode === 'ACTIVE_COURT_COMMITMENT') {
    return {
      message: ACTIVE_COURT_COMMITMENT_MESSAGE,
      title: 'Court already active',
    };
  }

  return {
    message: 'This DARE is not accepting players right now.',
    title: 'Not open',
  };
}
