import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const GUIDE_DISMISSED_KEY = 'dare:first-session-guide-dismissed:v1';

export function useFirstSessionGuide(userId?: string | null) {
  const [checked, setChecked] = useState(false);
  const [visible, setVisible] = useState(false);
  const storageKey = userId ? `${GUIDE_DISMISSED_KEY}:${userId}` : null;

  useEffect(() => {
    let mounted = true;
    setChecked(false);
    setVisible(false);

    async function load() {
      if (!storageKey) {
        if (mounted) setChecked(true);
        return;
      }

      const dismissed = await readDismissedFlag(storageKey);
      if (!mounted) return;
      setVisible(!dismissed);
      setChecked(true);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [storageKey]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    if (storageKey) await writeDismissedFlag(storageKey);
  }, [storageKey]);

  return {
    dismiss,
    ready: checked,
    visible: checked && visible,
  };
}

async function readDismissedFlag(storageKey: string) {
  try {
    if (!(await SecureStore.isAvailableAsync())) return false;
    return (await SecureStore.getItemAsync(storageKey)) === '1';
  } catch {
    return false;
  }
}

async function writeDismissedFlag(storageKey: string) {
  try {
    if (!(await SecureStore.isAvailableAsync())) return;
    await SecureStore.setItemAsync(storageKey, '1', {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } catch {
    // A failed local dismissal write should not block browsing.
  }
}
