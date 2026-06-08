import { useEffect, useState } from 'react';

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
};

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

type JuryCaseRow = {
  evidence_a_id: string | null;
  evidence_b_id: string | null;
  id: string;
  reason: string;
  status: string;
  votes_needed: number;
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

      const { data: juryCase, error: caseError } = await supabaseClient
        .from('jury_cases')
        .select('id,status,reason,votes_needed,evidence_a_id,evidence_b_id')
        .eq('id', (assignment as AssignmentRow).jury_case_id)
        .maybeSingle();

      if (!mounted) return;

      if (caseError || !juryCase) {
        setState({
          assignment: null,
          error: getLoadUserMessage('jury assignment'),
          loading: false,
        });
        return;
      }

      setState({
        assignment: mapAssignment(assignment as AssignmentRow, juryCase as JuryCaseRow),
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
  };
}

function mapAssignment(assignment: AssignmentRow, juryCase: JuryCaseRow): JuryAssignmentDetail {
  const evidenceCountA = juryCase.evidence_a_id ? 1 : 0;
  const evidenceCountB = juryCase.evidence_b_id ? 1 : 0;

  return {
    assignmentId: assignment.id,
    caseId: juryCase.id,
    category: 'Jury',
    dueLabel: assignment.due_at ? formatDueLabel(assignment.due_at) : 'No deadline',
    rewardLabel: '+2 trust',
    sides: [
      {
        body: `Packet A evidence for this dispute. Reason: ${juryCase.reason}`,
        filesCount: evidenceCountA,
        label: 'A',
      },
      {
        body: `Packet B evidence for this dispute. Reason: ${juryCase.reason}`,
        filesCount: evidenceCountB,
        label: 'B',
      },
    ],
    source: 'server',
    status: juryCase.status,
    title: `Jury case ${juryCase.id.slice(0, 8)}`,
  };
}

function formatDueLabel(value: string) {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (seconds <= 0) return 'Due now';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `Due in ${hours}h ${minutes}m`;
  return `Due in ${Math.max(1, minutes)}m`;
}
