import { callAction } from './client';
import { createIdempotencyKey, createRequestId } from './idempotency';
import { ActionRequestOptions } from './types';

export type CapabilityFlags = {
  canAcceptDare: boolean;
  canCreateDare: boolean;
  canDeposit?: boolean;
  canJury: boolean;
  canWithdraw: boolean;
  canUpdateProfile: boolean;
};

export type MeUser = {
  accountStatus: string;
  avatarColor: string | null;
  avatarEmoji: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  completedDares: number;
  country: string | null;
  createdAt: string;
  displayName: string | null;
  disputes: number;
  id: string;
  juryCategories: string[];
  juryOptIn: boolean;
  kycTier: string;
  losses: number;
  riskStatus: string;
  tier: string;
  trustScore: number;
  updatedAt: string;
  username: string;
  wins: number;
};

export type MeWallet = {
  accountStatus: string;
  available: number;
  currency: string;
  escrowed: number;
  held: number;
  pendingWithdrawal: number;
  walletAccountId: string;
};

export type MeResponsibleGaming = {
  coolingOffUntil: string | null;
  dailyDepositLimit: number | null;
  maxStakePerDare: number | null;
  monthlyDepositLimit: number | null;
  selfExcluded: boolean;
  selfExclusionUntil: string | null;
  weeklyDepositLimit: number | null;
};

export type MeResponse = {
  capabilities: CapabilityFlags;
  responsibleGaming: MeResponsibleGaming;
  user: MeUser;
  wallet: MeWallet | null;
};

type ActionEnvelope<TBody> = {
  idempotencyKey?: string;
  payload: TBody;
  requestId: string;
};

export type UpdateProfilePayload = {
  avatarColor?: string | null;
  avatarEmoji?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  city?: string | null;
  country?: string | null;
  displayName?: string | null;
  username?: string;
};

export type UpdateProfileResponse = {
  user: MeUser;
};

export type MarkNotificationReadResponse = {
  isRead: boolean;
  notificationId: string;
  readAt: string;
};

export type MarkAllNotificationsReadResponse = {
  readAt: string;
  updatedCount: number;
};

export type InitializeDepositPayload = {
  amount: number;
  currency: 'NGN';
  provider: 'paystack';
};

export type InitializeDepositResponse = {
  accessCode: string;
  amount: number;
  authorizationUrl: string;
  currency: 'NGN';
  mode: 'live' | 'test';
  paymentTransactionId: string;
  provider: 'paystack';
  reference: string;
  status: 'initialized';
};

export type RequestWithdrawalPayload = {
  amount: number;
  currency: 'NGN';
  destination: {
    accountName: string;
    accountNumberToken: string;
    bankCode: string;
    type: 'bank_account';
  };
};

export type RequestWithdrawalResponse = {
  amount: number;
  currency: 'NGN';
  ledgerEntryId: string;
  status: 'pending';
  withdrawalRequestId: string;
};

export type CreateDarePayload = {
  category: 'knowledge' | 'physical' | 'verbal' | 'sports' | 'creative' | 'other';
  constitution: {
    edgeCases?: string | null;
    proofMethod?: string | null;
    rules: string;
    test: string;
  };
  currency: 'NGN';
  description?: string;
  durationSeconds: number;
  stakeAmount: number;
  targetUsername?: string | null;
  title: string;
};

export type CreateDareResponse = {
  challengerId: string | null;
  constitutionId: string;
  currency: 'NGN';
  dareId: string;
  issuerEscrowHoldId: string;
  issuerLedgerEntryId: string;
  stakeAmount: number;
  status: 'open' | 'targeted_pending';
};

export type AcceptDareResponse = {
  challengerEscrowHoldId: string;
  challengerLedgerEntryId: string;
  courtSessionId: string;
  currency: 'NGN';
  dareId: string;
  stakeAmount: number;
  status: 'ready_check';
};

export type ReadyDareResponse = {
  assignedRounds: number;
  courtSessionId: string;
  dareId: string;
  dareStatus: 'ready_check' | 'active';
  phase: 'ready_check' | 'active';
  playerAReady: boolean;
  playerBReady: boolean;
  serverEndTime: string | null;
  serverStartTime: string | null;
};

export type CourtHeartbeatResponse = {
  courtSessionId: string;
  dareId: string;
  phase: 'active';
  playerAHeartbeatAt: string | null;
  playerBHeartbeatAt: string | null;
  playerRole: 'A' | 'B';
  reconnectDeadline: string;
};

export type SubmitAnswerPayload = {
  questionId: string;
  roundIndex: number;
  selectedOption: number;
};

export type SubmitAnswerResponse = {
  answerId: string;
  correct: boolean;
  dareId: string;
  phase: 'active';
  questionId: string;
  responseMs: number;
  roundIndex: number;
  scoreA: number;
  scoreB: number;
  selectedOption: number;
};

export type CurrentCourtQuestionResponse = {
  answeredRounds: number;
  courtSessionId: string;
  dareId: string;
  options: string[];
  phase: 'active';
  prompt: string;
  questionId: string;
  roundIndex: number;
  scoreA: number;
  scoreB: number;
  serverEndTime: string;
  totalRounds: number;
};

export type SendCourtMessagePayload = {
  message: string;
};

export type SendCourtMessageResponse = {
  createdAt: string;
  dareId: string;
  message: string;
  messageId: string;
  moderationStatus: 'visible';
  userId: string;
  usernameSnapshot: string | null;
};

export type ForfeitDareResponse = {
  completedAt: string;
  courtPhase: 'forfeited' | 'completed';
  dareId: string;
  forfeiterId: string;
  status: 'forfeited' | 'settled';
  winnerId: string;
};

export type DisputeReason =
  | 'abuse_or_cheating'
  | 'other'
  | 'rules_issue'
  | 'score_issue'
  | 'technical_issue'
  | 'timer_issue';

export type FileDisputePayload = {
  evidenceObjectIds: string[];
  reason: DisputeReason;
  summary: string;
};

export type FileDisputeResponse = {
  courtPhase: 'disputed';
  dareId: string;
  dareStatus: 'dispute_pending';
  evidenceAId: string | null;
  evidenceBId: string | null;
  juryCaseId: string;
  opponentUserId: string;
  status: 'filed';
};

export type EvidenceUploadPayload = {
  fileName: string;
  fileSizeBytes: number;
  mimeType: 'image/jpeg' | 'image/png' | 'video/mp4';
};

export type EvidenceUploadResponse = {
  byteSize: number;
  dareId: string;
  evidenceObjectId: string;
  mediaType: string;
  status: 'pending';
  storageBucket: string;
  storagePath: string;
  upload: {
    path: string;
    signedUrl: string;
    token: string;
  };
  userId: string;
};

export type EvidenceConfirmPayload = {
  contentHash?: string;
  evidenceObjectId: string;
};

export type EvidenceConfirmResponse = {
  dareId: string;
  evidenceObjectId: string;
  juryCaseId: string;
  side: 'A' | 'B';
  status: 'uploaded';
  uploadedAt: string;
};

export type ResponsibleGamingSettingsPayload = {
  dailyDepositLimitNgn?: number;
  maxStakeNgn?: number;
  monthlyDepositLimitNgn?: number;
  sessionMaxMinutes?: number;
  weeklyDepositLimitNgn?: number;
};

export type ResponsibleGamingSettingsResponse = {
  coolingOffUntil: string | null;
  dailyDepositLimitNgn: number | null;
  maxStakeNgn: number | null;
  monthlyDepositLimitNgn: number | null;
  pending: {
    dailyDepositLimitNgn: number | null;
    effectiveAt: string | null;
    maxStakeNgn: number | null;
    monthlyDepositLimitNgn: number | null;
    sessionMaxMinutes: number | null;
    weeklyDepositLimitNgn: number | null;
  };
  selfExcluded: boolean;
  selfExclusionUntil: string | null;
  sessionMaxMinutes: number | null;
  weeklyDepositLimitNgn: number | null;
};

export type SelfExcludePayload = {
  durationDays: number;
  reason?: string;
};

export type SelfExcludeResponse = {
  accountStatus: string;
  cancelledDares: number;
  forfeitedDares: number;
  refundedAmount: number;
  selfExcluded: boolean;
  selfExclusionUntil: string;
  userId: string;
};

export type SubmitKycPayload = {
  documents: Record<string, unknown>;
  kycTierRequested: 'kyc1' | 'kyc2' | 'kyc3';
};

export type SubmitKycResponse = {
  kycTierRequested: string;
  kycVerificationId: string;
  status: 'pending';
  submittedAt: string;
  userId: string;
};

export type CastJuryVotePayload = {
  rationale: string;
  vote: 'A' | 'B' | 'void' | 'escalate';
};

export type CastJuryVoteResponse = {
  assignmentId: string;
  dareId: string;
  dareStatus: 'jury_open' | 'completed' | 'dispute_pending';
  juryCaseId: string;
  status: 'jury_voting' | 'settlement_pending' | 'escalated';
  verdict: 'A' | 'B' | 'void' | 'escalate' | null;
  voteId: string;
  votesCast: number;
  votesNeeded: number;
  winnerId: string | null;
};

export function getMe(options: Pick<ActionRequestOptions, 'signal'> = {}) {
  return callAction<MeResponse>('/me', options);
}

export function postAction<TResponse, TBody>(path: string, body: TBody, scope: string) {
  const idempotencyKey = createIdempotencyKey(scope);
  return callAction<TResponse>(path, {
    body: createActionEnvelope(body, idempotencyKey),
    idempotencyKey,
    method: 'POST',
  });
}

export function patchAction<TResponse, TBody>(path: string, body: TBody) {
  return callAction<TResponse>(path, {
    body: createActionEnvelope(body),
    method: 'PATCH',
  });
}

export function patchIdempotentAction<TResponse, TBody>(path: string, body: TBody, scope: string) {
  const idempotencyKey = createIdempotencyKey(scope);
  return callAction<TResponse>(path, {
    body: createActionEnvelope(body, idempotencyKey),
    idempotencyKey,
    method: 'PATCH',
  });
}

export function updateMyProfile(payload: UpdateProfilePayload) {
  return patchAction<UpdateProfileResponse, UpdateProfilePayload>('/profiles/me', payload);
}

export function markNotificationRead(notificationId: string) {
  return patchAction<MarkNotificationReadResponse, Record<string, never>>(
    `/notifications/${notificationId}/read`,
    {},
  );
}

export function markAllNotificationsRead() {
  return postAction<MarkAllNotificationsReadResponse, Record<string, never>>(
    '/notifications/read-all',
    {},
    'notifications-read-all',
  );
}

export function initializeDeposit(payload: InitializeDepositPayload) {
  return postAction<InitializeDepositResponse, InitializeDepositPayload>(
    '/wallet/deposits/init',
    payload,
    'wallet-deposit-init',
  );
}

export function requestWithdrawal(payload: RequestWithdrawalPayload) {
  return postAction<RequestWithdrawalResponse, RequestWithdrawalPayload>(
    '/wallet/withdrawals',
    payload,
    'wallet-withdrawal',
  );
}

export function createDare(payload: CreateDarePayload) {
  return postAction<CreateDareResponse, CreateDarePayload>(
    '/dares',
    payload,
    'create-dare',
  );
}

export function acceptDare(dareId: string) {
  return postAction<AcceptDareResponse, Record<string, never>>(
    `/dares/${dareId}/accept`,
    {},
    'accept-dare',
  );
}

export function markDareReady(dareId: string) {
  return postAction<ReadyDareResponse, Record<string, never>>(
    `/dares/${dareId}/ready`,
    {},
    'dare-ready',
  );
}

export function recordCourtHeartbeat(dareId: string) {
  return callAction<CourtHeartbeatResponse>(`/court/${dareId}/heartbeat`, {
    body: createActionEnvelope({}),
    method: 'POST',
  });
}

export function submitDareAnswer(dareId: string, payload: SubmitAnswerPayload) {
  return postAction<SubmitAnswerResponse, SubmitAnswerPayload>(
    `/dares/${dareId}/answers`,
    payload,
    'dare-answer',
  );
}

export function getCurrentCourtQuestion(dareId: string) {
  return callAction<CurrentCourtQuestionResponse>(`/court/${dareId}/question`);
}

export function sendCourtMessage(dareId: string, payload: SendCourtMessagePayload) {
  return postAction<SendCourtMessageResponse, SendCourtMessagePayload>(
    `/court/${dareId}/messages`,
    payload,
    'court-message',
  );
}

export function forfeitDare(dareId: string) {
  return postAction<ForfeitDareResponse, Record<string, never>>(
    `/dares/${dareId}/forfeit`,
    {},
    'dare-forfeit',
  );
}

export function requestEvidenceUpload(dareId: string, payload: EvidenceUploadPayload) {
  return postAction<EvidenceUploadResponse, EvidenceUploadPayload>(
    `/dares/${dareId}/evidence`,
    payload,
    'evidence-upload',
  );
}

export function confirmEvidenceUpload(dareId: string, payload: EvidenceConfirmPayload) {
  return postAction<EvidenceConfirmResponse, EvidenceConfirmPayload>(
    `/dares/${dareId}/evidence/confirm`,
    payload,
    'evidence-confirm',
  );
}

export function fileDispute(dareId: string, payload: FileDisputePayload) {
  return postAction<FileDisputeResponse, FileDisputePayload>(
    `/dares/${dareId}/disputes`,
    payload,
    'file-dispute',
  );
}

export function updateResponsibleGamingSettings(payload: ResponsibleGamingSettingsPayload) {
  return patchIdempotentAction<ResponsibleGamingSettingsResponse, ResponsibleGamingSettingsPayload>(
    '/responsible-gaming/settings',
    payload,
    'responsible-gaming-settings',
  );
}

export function selfExclude(payload: SelfExcludePayload) {
  return postAction<SelfExcludeResponse, SelfExcludePayload>(
    '/responsible-gaming/self-exclude',
    payload,
    'self-exclusion',
  );
}

export function submitKyc(payload: SubmitKycPayload) {
  return postAction<SubmitKycResponse, SubmitKycPayload>(
    '/kyc/submit',
    payload,
    'kyc-submit',
  );
}

export function castJuryVote(juryCaseId: string, payload: CastJuryVotePayload) {
  return postAction<CastJuryVoteResponse, CastJuryVotePayload>(
    `/jury-cases/${juryCaseId}/votes`,
    payload,
    'jury-vote',
  );
}

function createActionEnvelope<TBody>(
  payload: TBody,
  idempotencyKey?: string,
): ActionEnvelope<TBody> {
  return {
    ...(idempotencyKey ? { idempotencyKey } : {}),
    payload,
    requestId: createRequestId(),
  };
}
