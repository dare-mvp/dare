import assert from 'node:assert/strict';

import {
  getCourtActionDisabledReason,
  getCourtConnectionState,
  getLowDataCourtGuidance,
} from './courtConnectivity';
import { activeCourtSession } from '../../mocks/court';

assert.equal(getCourtConnectionState('active', 4), 'connected');
assert.equal(getCourtConnectionState('active', 31), 'reconnecting');
assert.equal(getCourtConnectionState('active', 75), 'offline');
assert.equal(getCourtConnectionState('active', Number.NaN), 'offline');
assert.equal(getCourtConnectionState('awaiting_result', undefined), 'offline');
assert.equal(getCourtConnectionState('ready', 90), 'connected');

assert.match(
  getCourtActionDisabledReason({
    ...activeCourtSession,
    connectionState: 'offline',
  }) ?? '',
  /not queued as successful/,
);

assert.equal(
  getCourtActionDisabledReason({
    ...activeCourtSession,
    connectionState: 'connected',
  }),
  null,
);

assert.match(
  getLowDataCourtGuidance({
    ...activeCourtSession,
    resolutionType: 'evidence',
    viewerRole: 'participant_a',
  }).body,
  /constitution/,
);

assert.match(
  getLowDataCourtGuidance({
    ...activeCourtSession,
    viewerRole: 'spectator',
  }).body,
  /does not submit proof/,
);
