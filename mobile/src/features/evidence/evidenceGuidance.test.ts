import assert from 'node:assert/strict';

import {
  getEvidenceFailureMessage,
  getEvidenceGuidance,
  getEvidenceStatusLabel,
  isResultClaimOutcome,
  shortEvidenceId,
} from './evidenceGuidance';

assert.match(getEvidenceGuidance('video/mp4').bullets.join(' '), /full attempt/);
assert.match(getEvidenceGuidance('image/jpeg').bullets.join(' '), /cropped/);
assert.match(getEvidenceGuidance(null).bullets.join(' '), /screen recording/);
assert.match(getEvidenceGuidance('application/pdf').title, /Unsupported/);

assert.equal(getEvidenceStatusLabel('confirming'), 'confirming');
assert.equal(getEvidenceStatusLabel('uploaded'), 'confirmed');
assert.match(getEvidenceFailureMessage('failed') ?? '', /not submitted/);
assert.equal(getEvidenceFailureMessage('ready'), null);

assert.equal(isResultClaimOutcome('performer_completed'), true);
assert.equal(isResultClaimOutcome('winner'), false);
assert.equal(shortEvidenceId(''), 'pending');
