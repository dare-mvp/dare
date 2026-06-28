import type { CourtSession } from './types';

export type CourtConnectionNotice = {
  message: string;
  title: string;
  tone: 'danger' | 'info' | 'warning';
};

export type LowDataCourtGuidance = {
  body: string;
  cameraModeLabel: string;
  title: string;
  tone: 'info' | 'warning';
};

const reconnectThresholdSeconds = 30;
const offlineThresholdSeconds = 75;

export function getCourtConnectionState(
  phase: CourtSession['phase'],
  heartbeatAgeSeconds?: number | null,
): CourtSession['connectionState'] {
  if (phase !== 'active' && phase !== 'awaiting_result') return 'connected';
  const safeHeartbeatAgeSeconds = normalizeHeartbeatAgeSeconds(heartbeatAgeSeconds);
  if (safeHeartbeatAgeSeconds >= offlineThresholdSeconds) return 'offline';
  if (safeHeartbeatAgeSeconds >= reconnectThresholdSeconds) return 'reconnecting';
  return 'connected';
}

export function getCourtConnectionNotice(session: CourtSession): CourtConnectionNotice | null {
  if (session.connectionState === 'connected') {
    if (session.phase === 'active') {
      return {
        message: 'Heartbeat is current. Keep this screen open until the Court asks for the next action.',
        title: 'Connection current',
        tone: 'info',
      };
    }
    return null;
  }

  if (session.connectionState === 'offline') {
    return {
      message: `Last heartbeat was ${formatHeartbeatAge(session.heartbeatAgeSeconds)}. Reconnect now, keep this Court open, and retry the action after sync returns. Court actions are not queued as successful.`,
      title: 'Connection lost',
      tone: 'danger',
    };
  }

  return {
    message: `Last heartbeat was ${formatHeartbeatAge(session.heartbeatAgeSeconds)}. Keep this screen open and retry after the Court shows online. Server timing and forfeit decisions remain authoritative.`,
    title: 'Reconnecting',
    tone: 'warning',
  };
}

export function getCourtActionDisabledReason(session: CourtSession): string | null {
  if (session.connectionState === 'offline') {
    return 'Reconnect before taking Court actions. Offline actions are not queued as successful.';
  }

  if (session.connectionState === 'reconnecting') {
    return 'Wait for Court sync to recover before submitting, voting, readying, or forfeiting.';
  }

  return null;
}

export function getLowDataCourtGuidance(session: CourtSession): LowDataCourtGuidance {
  if (session.viewerRole === 'spectator') {
    return {
      body: 'Audience mode does not submit proof. If data is tight, keep watching without camera or microphone; participant rules are unchanged.',
      cameraModeLabel: 'Audience low-data OK',
      title: 'Low-data audience mode',
      tone: 'info',
    };
  }

  if (session.resolutionType === 'evidence') {
    return {
      body: 'Video, images, or screen proof must still match the constitution. You can retry uploads, but camera-off evidence is not valid when the DARE requires visible proof.',
      cameraModeLabel: 'Proof required',
      title: 'Low-data proof rules',
      tone: 'warning',
    };
  }

  if (session.resolutionType === 'witnessed' || session.liveRoom.recording.required) {
    return {
      body: 'Witnessed Courts need live presence and recording where required. Do not turn off camera or audio unless the constitution allows it.',
      cameraModeLabel: 'Live proof required',
      title: 'Keep required media on',
      tone: 'warning',
    };
  }

  return {
    body: 'Answer-key Courts still need live presence. Reduce background data, but keep required audio or video on if the Court asks for it.',
    cameraModeLabel: 'Presence required',
    title: 'Use less data carefully',
    tone: 'info',
  };
}

export function getSafeHeartbeatAgeSeconds(value?: number | null) {
  return normalizeHeartbeatAgeSeconds(value);
}

function normalizeHeartbeatAgeSeconds(value?: number | null) {
  if (!Number.isFinite(value) || value === null || value === undefined) return offlineThresholdSeconds;
  return Math.max(0, Math.round(value));
}

function formatHeartbeatAge(value?: number | null) {
  if (!Number.isFinite(value) || value === null || value === undefined) return 'unavailable';
  return `${Math.max(0, Math.round(value))}s ago`;
}
