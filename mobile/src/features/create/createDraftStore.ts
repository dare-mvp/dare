import type { CreateDareDraft } from './types';

const drafts = new Map<string, CreateDareDraft>();

export function saveCreateDareDraft(draft: CreateDareDraft) {
  const draftId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  drafts.set(draftId, { ...draft });
  return draftId;
}

export function getCreateDareDraft(draftId: string | undefined) {
  if (!draftId) return null;
  const draft = drafts.get(draftId);
  return draft ? { ...draft } : null;
}

