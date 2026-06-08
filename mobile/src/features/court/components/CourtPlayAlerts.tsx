import { InlineAlert } from '../../../components/ui/InlineAlert';
import { getResolutionNoticeMessage, getResolutionNoticeTitle } from '../resolutionCopy';
import { CourtSession } from '../types';
import {
  getCourtStatusMessage,
  getCourtStatusTitle,
  getCourtStatusTone,
} from '../courtPlayStatus';

type CourtQuestionState = {
  error: string | null;
  loading: boolean;
  roundIndex: number;
  source: 'mock' | 'server';
  totalRounds: number;
};

type CourtPlayAlertsProps = {
  actionError: string | null;
  actionNotice: string | null;
  courtError: string | null;
  courtSource: 'mock' | 'server';
  courtQuestion: CourtQuestionState;
  session: CourtSession;
};

export function CourtPlayAlerts({
  actionError,
  actionNotice,
  courtError,
  courtQuestion,
  courtSource,
  session,
}: CourtPlayAlertsProps) {
  return (
    <>
      {actionError ? (
        <InlineAlert
          tone="danger"
          title="Court action failed"
          message={actionError}
        />
      ) : null}
      {actionNotice ? (
        <InlineAlert
          tone="success"
          title="Action submitted"
          message={actionNotice}
        />
      ) : null}
      {courtError ? (
        <InlineAlert
          tone="danger"
          title="Court state unavailable"
          message={courtError}
        />
      ) : null}
      {session.status !== 'active' ? (
        <InlineAlert
          tone={getCourtStatusTone(session.status)}
          title={getCourtStatusTitle(session.status)}
          message={getCourtStatusMessage(session)}
        />
      ) : null}
      {courtSource === 'server' ? (
        courtQuestion.source === 'server' && !courtQuestion.error ? (
          <InlineAlert
            tone="info"
            title={courtQuestion.loading ? 'Loading resolution' : getResolutionNoticeTitle(session.resolutionType, courtQuestion)}
            message={courtQuestion.loading ? 'Fetching the current resolution state.' : getResolutionNoticeMessage(session.resolutionType)}
          />
        ) : (
          <InlineAlert
            tone="danger"
            title="Resolution unavailable"
            message={courtQuestion.error ?? 'Unable to load the assigned court resolution.'}
          />
        )
      ) : null}
    </>
  );
}
