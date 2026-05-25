import { useEffect, useState } from 'react';

import { getCurrentCourtQuestion } from '../../lib/actions/endpoints';
import { isUuid } from '../../lib/ids';
import { activeCourtSession } from '../../mocks/court';
import { useAuth } from '../auth/AuthProvider';
import { CourtQuestion } from './types';

type CourtQuestionState = {
  answeredRounds: number;
  error: string | null;
  loading: boolean;
  question: CourtQuestion;
  roundIndex: number;
  source: 'mock' | 'server';
  totalRounds: number;
};

export function useCourtQuestion(dareId?: string): CourtQuestionState {
  const auth = useAuth();
  const [state, setState] = useState<CourtQuestionState>(() => createPreviewState());

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!isUuid(dareId) || auth.status !== 'authenticated') {
        if (mounted) setState(createPreviewState());
        return;
      }

      setState((current) => ({ ...current, loading: true }));
      const result = await getCurrentCourtQuestion(dareId);
      if (!mounted) return;

      if (!result.ok) {
        setState({
          ...createPreviewState(),
          error: result.error.message,
          loading: false,
          source: 'server',
        });
        return;
      }

      setState({
        answeredRounds: result.data.answeredRounds,
        error: null,
        loading: false,
        question: {
          id: result.data.questionId,
          options: result.data.options,
          prompt: result.data.prompt,
        },
        roundIndex: result.data.roundIndex,
        source: 'server',
        totalRounds: result.data.totalRounds,
      });
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [auth.status, dareId]);

  return state;
}

function createPreviewState(): CourtQuestionState {
  return {
    answeredRounds: 0,
    error: null,
    loading: false,
    question: activeCourtSession.question,
    roundIndex: 0,
    source: 'mock',
    totalRounds: 5,
  };
}
