import { useEffect, useState } from 'react';

import { callAction } from '../../lib/actions/client';
import { getLoadUserMessage } from '../../lib/errors/userMessages';
import { isUuid } from '../../lib/ids';
import { supabaseClient } from '../../lib/supabase/client';
import { juryAssignment, juryEvidenceSides } from '../../mocks/jury';
import { useAuth } from '../auth/AuthProvider';
import { JuryEvidenceSide } from './components/JuryEvidencePacket';

export type JuryAssignmentDetail = {
  assignmentId: string;
  caseId: string;
  category: string;
  dueLabel: string;
  rewardLabel: string;
  sides: [JuryEvidenceSide, JuryEvidenceSide];
  source: 'mock' | 'server';
  status: string;
  title: string;
  verdict: JuryVerdict | null;
  votesNeeded: number;
};

export type JuryVerdict = 'A' | 'B' | 'void' | 'escalate' | 'uphold' | 'overturn';

type JuryAssignmentState = {
  assignment: JuryAssignmentDetail | null;
  error: string | null;
  loading: boolean;
};

type AssignmentRow = {
  due_at: string | null;
  id: string;
  jury_case_id: string;
  status: string;
};

type JuryEvidencePacketResponse = {
  assignmentId: string;
  caseId: string;
  claimedAt: string | null;
  dareId: string;
  dueAt: string | null;
  sides: [JuryEvidenceSide, JuryEvidenceSide];
  status: string;
  title: string;
  verdict: JuryVerdict | null;
  votesNeeded: number;
};

export function useJuryAssignment(caseId?: string): JuryAssignmentState {
  const auth = useAuth();
  const [state, setState] = useState<JuryAssignmentState>(() => ({
    assignment: auth.status === 'authenticated' || auth.status === 'loading' ? null : createPreviewAssignment(),
    error: null,
    loading: auth.status === 'loading',
  }));

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!supabaseClient || auth.status !== 'authenticated') {
        if (mounted) {
          setState({
            assignment: auth.status === 'loading' ? null : createPreviewAssignment(),
            error: null,
            loading: auth.status === 'loading',
          });
        }
        return;
      }

      setState((current) => ({ ...current, loading: true }));

      let assignmentQuery = supabaseClient
        .from('jury_assignments')
        .select('id,jury_case_id,status,due_at');

      assignmentQuery = isUuid(caseId)
        ? assignmentQuery.eq('jury_case_id', caseId)
        : assignmentQuery.in('status', ['assigned', 'claimed']).order('due_at', { ascending: true }).limit(1);

      const { data: assignment, error: assignmentError } = await assignmentQuery.maybeSingle();
      if (!mounted) return;

      if (assignmentError) {
        setState({ assignment: null, error: getLoadUserMessage('jury assignment'), loading: false });
        return;
      }

      if (!assignment) {
        setState({ assignment: null, error: null, loading: false });
        return;
      }

      const packet = await getJuryEvidencePacket((assignment as AssignmentRow).jury_case_id);

      if (!mounted) return;

      if (!packet.ok) {
        setState({
          assignment: null,
          error: getLoadUserMessage('jury assignment'),
          loading: false,
        });
        return;
      }

      setState({
        assignment: mapAssignment(packet.data),
        error: null,
        loading: false,
      });
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [auth.status, caseId]);

  return state;
}

function createPreviewAssignment(): JuryAssignmentDetail {
  return {
    assignmentId: 'preview-assignment',
    caseId: juryAssignment.caseId,
    category: juryAssignment.category,
    dueLabel: juryAssignment.dueLabel,
    rewardLabel: juryAssignment.rewardLabel,
    sides: juryEvidenceSides,
    source: 'mock',
    status: 'assigned',
    title: juryAssignment.title,
    verdict: null,
    votesNeeded: 3,
  };
}

function mapAssignment(packet: JuryEvidencePacketResponse): JuryAssignmentDetail {
  return {
    assignmentId: packet.assignmentId,
    caseId: packet.caseId,
    category: 'Jury',
    dueLabel: packet.dueAt ? formatDueLabel(packet.dueAt) : 'No deadline',
    rewardLabel: '+2 trust',
    sides: packet.sides,
    source: 'server',
    status: packet.status,
    title: packet.title,
    verdict: packet.verdict,
    votesNeeded: packet.votesNeeded,
  };
}

function getJuryEvidencePacket(juryCaseId: string) {
  return callAction<JuryEvidencePacketResponse>(`/jury-cases/${juryCaseId}/evidence`);
}

function formatDueLabel(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (seconds <= 0) return 'Due now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `Due in ${hours}h ${minutes}m`;
  return `Due in ${Math.max(1, minutes)}m`;
}
