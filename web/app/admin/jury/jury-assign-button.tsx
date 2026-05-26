'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { assignJuryCaseAction } from '@/app/admin/actions';

export function JuryAssignButton({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleAssign() {
    setLoading(true);
    try {
      await assignJuryCaseAction(caseId);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleAssign} disabled={loading}>
      {loading ? 'Assigning…' : 'Assign'}
    </Button>
  );
}
