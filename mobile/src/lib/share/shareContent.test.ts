import { buildDareShareMessage, getDarePublicUrl } from './shareLinks';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testDareShareUsesOnlyPublicContext() {
  const message = buildDareShareMessage({
    id: 'dare-123',
    resolutionLabel: 'Evidence Review',
    stakeLabel: 'Reward NGN 1,000',
    statusLabel: 'Open',
    title: 'Proof upload task',
  });

  assert(message.includes('Proof upload task'), 'Share message should include title.');
  assert(message.includes('Reward NGN 1,000'), 'Share message should include public stake or reward label.');
  assert(message.includes('Evidence Review'), 'Share message should include public proof context.');
  assert(message.includes('DARE ID: dare-123'), 'Share message should include DARE ID.');
  assert(!message.toLowerCase().includes('wallet'), 'Share message should not include wallet internals.');
  assert(!message.toLowerCase().includes('answer key'), 'Share message should not include private answer keys.');
  assert(!message.toLowerCase().includes('kyc'), 'Share message should not include KYC state.');
}

function testShareMessageSanitizesLineBreaks() {
  const message = buildDareShareMessage({
    id: 'dare-123',
    title: 'Title\nwith\nbreaks',
  });

  assert(message.startsWith('Title with breaks'), 'Share title should be collapsed to one line.');
}

function testShareMessageFallsBackForMissingTitle() {
  const message = buildDareShareMessage({
    id: 'dare-123',
    title: '',
  });

  assert(message.startsWith('DARE challenge'), 'Share message should use a safe fallback title.');
}

function testShareMessageRequiresReference() {
  let failed = false;

  try {
    buildDareShareMessage({
      id: '',
      title: 'Missing reference',
    });
  } catch {
    failed = true;
  }

  assert(failed, 'Share message should require a confirmed DARE reference.');
}

function testPublicDareUrlEncodesId() {
  const url = getDarePublicUrl('dare id/with spaces');

  assert(url === 'https://www.daregamesapp.com/dare/dare%20id%2Fwith%20spaces', 'Public DARE URL should encode the DARE ID.');
}

testDareShareUsesOnlyPublicContext();
testShareMessageSanitizesLineBreaks();
testShareMessageFallsBackForMissingTitle();
testShareMessageRequiresReference();
testPublicDareUrlEncodesId();
