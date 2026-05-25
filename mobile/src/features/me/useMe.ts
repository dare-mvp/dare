import { useCallback, useEffect, useState } from 'react';

import { getMe } from '../../lib/actions/endpoints';
import { useAuth } from '../auth/AuthProvider';
import { createPreviewMeState, normalizeMeResponse } from './normalizeMe';
import { MeState } from './types';

type UseMeResult = {
  data: MeState;
  error: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useMe(): UseMeResult {
  const auth = useAuth();
  const [data, setData] = useState<MeState>(() => createPreviewMeState());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(auth.status === 'loading');

  const refresh = useCallback(async () => {
    if (auth.status === 'loading') {
      setLoading(true);
      return;
    }

    if (auth.status !== 'authenticated') {
      setData(createPreviewMeState());
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await getMe();

    if (result.ok) {
      setData(normalizeMeResponse(result.data));
      setError(null);
    } else {
      setData(createPreviewMeState());
      setError(result.error.message);
    }

    setLoading(false);
  }, [auth.status]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function load() {
      if (auth.status === 'loading') {
        if (mounted) setLoading(true);
        return;
      }

      if (auth.status !== 'authenticated') {
        if (mounted) {
          setData(createPreviewMeState());
          setError(null);
          setLoading(false);
        }
        return;
      }

      if (mounted) setLoading(true);
      const result = await getMe({ signal: controller.signal });

      if (!mounted) return;

      if (result.ok) {
        setData(normalizeMeResponse(result.data));
        setError(null);
      } else {
        setData(createPreviewMeState());
        setError(result.error.message);
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [auth.status]);

  return {
    data,
    error,
    loading,
    refresh,
  };
}
