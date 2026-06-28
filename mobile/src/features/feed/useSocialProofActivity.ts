import { useCallback, useEffect, useState } from 'react';

import { getSocialProofActivity, type SocialProofActivityResponse } from '../../lib/actions/endpoints';
import { getLoadUserMessage } from '../../lib/errors/userMessages';

type SocialProofActivityState = {
  data: SocialProofActivityResponse | null;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useSocialProofActivity(): SocialProofActivityState {
  const [data, setData] = useState<SocialProofActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getSocialProofActivity();

    if (!result.ok) {
      setError(getLoadUserMessage('confirmed activity'));
      setLoading(false);
      return;
    }

    setData(result.data);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const result = await getSocialProofActivity();
      if (!mounted) return;

      if (!result.ok) {
        setError(getLoadUserMessage('confirmed activity'));
      } else {
        setData(result.data);
        setError(null);
      }
      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  return { data, error, loading, refresh };
}
