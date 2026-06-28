import { resolveNotificationHref } from './notificationDestinations';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testCourtNotificationRoutesToReady() {
  const href = resolveNotificationHref({
    action: { dareId: 'dare-1', type: 'dare' },
    type: 'court_starting',
  });

  assert(typeof href === 'object' && href.pathname === '/court/ready', 'Court notification should route to ready screen.');
}

function testWalletNotificationRoutesToTransactionWhenPresent() {
  const href = resolveNotificationHref({
    action: { transactionId: 'tx-1', type: 'wallet' },
    type: 'wallet_deposit_confirmed',
  });

  assert(typeof href === 'object' && href.pathname === '/wallet/transaction/[id]', 'Wallet notification should route to transaction detail.');
}

function testMissingActionFallsBackSafely() {
  const href = resolveNotificationHref({
    type: 'unknown',
  });

  assert(href === '/notifications', 'Missing action should route to notifications fallback.');
}

function testCourtNotificationWithoutDareIdFallsBackSafely() {
  const href = resolveNotificationHref({
    action: { type: 'dare' },
    type: 'court_starting',
  });

  assert(href === '/notifications', 'Court notification without DARE id should use the inbox fallback.');
}

function testWalletNotificationWithoutTransactionUsesWalletFallback() {
  const href = resolveNotificationHref({
    action: { type: 'wallet' },
    type: 'wallet_deposit_confirmed',
  });

  assert(href === '/(tabs)/wallet', 'Wallet notification without transaction id should route to wallet overview.');
}

testCourtNotificationRoutesToReady();
testWalletNotificationRoutesToTransactionWhenPresent();
testMissingActionFallsBackSafely();
testCourtNotificationWithoutDareIdFallsBackSafely();
testWalletNotificationWithoutTransactionUsesWalletFallback();
