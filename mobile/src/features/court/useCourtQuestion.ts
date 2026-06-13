import { useEffect, useState } from 'react';

import { getCurrentCourtQuestion } from '../../lib/actions/endpoints';
import { isUuid } from '../../lib/ids';
import { activeCourtSession } from '../../mocks/court';
import { useAuth } from '../auth/AuthProvider';
import { CourtQuestion, CourtSession } from './types';

type CourtQuestionState = {
  answeredRounds: number;
  error: string | null;
  loading: boolean;
  question: CourtQuestion;
  roundIndex: number;
  source: 'mock' | 'server';
  totalRounds: number;
};

export function useCourtQuestion(
  dareId?: string,
  resolutionType: CourtSession['resolutionType'] = 'answer_key',
): CourtQuestionState {
  const auth = useAuth();
  const [state, setState] = useState<CourtQuestionState>(() =>
    auth.status === 'authenticated' || auth.status === 'loading' ? createEmptyServerState(auth.status === 'loading') : createPreviewState(),
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (auth.status === 'loading') {
        if (mounted) setState(createEmptyServerState(true));
        return;
      }

      if (resolutionType !== 'answer_key') {
        if (mounted) setState(createResolutionModeState(resolutionType));
        return;
      }

      if (!isUuid(dareId) || auth.status !== 'authenticated') {
        if (mounted) setState(createPreviewState());
        return;
      }

      setState((current) => ({ ...current, loading: true }));
      const result = await getCurrentCourtQuestion(dareId);
      if (!mounted) return;

      if (!result.ok) {
        setState({
          ...createEmptyServerState(false),
          error: result.error.message,
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
  }, [auth.status, dareId, resolutionType]);

  return state;
}

function createEmptyServerState(loading: boolean): CourtQuestionState {
  return {
    answeredRounds: 0,
    error: null,
    loading,
    question: {
      id: 'empty',
      options: [],
      prompt: 'No active question.',
    },
    roundIndex: 0,
    source: 'server',
    totalRounds: 0,
  };
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

function createResolutionModeState(resolutionType: CourtSession['resolutionType']): CourtQuestionState {
  return {
    answeredRounds: 0,
    error: null,
    loading: false,
    question: {
      id: resolutionType,
      options: [],
      prompt: getResolutionPrompt(resolutionType),
    },
    roundIndex: 0,
    source: 'server',
    totalRounds: 0,
  };
}

function getResolutionPrompt(resolutionType: CourtSession['resolutionType']) {
  if (resolutionType === 'witnessed') {
    return 'Complete the DARE while both sides remain present for witnessed confirmation.';
  }

  if (resolutionType === 'evidence') {
    return 'Complete the DARE and submit evidence according to the agreed rules.';
  }

  return 'No active prompt.';
}
