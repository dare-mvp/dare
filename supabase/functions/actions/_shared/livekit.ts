import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  EncodingOptionsPreset,
  S3Upload,
  RoomServiceClient,
  WebhookReceiver,
} from "livekit-server-sdk";

import { ActionError } from "./errors.ts";

export type LiveKitViewerRole = "participant_a" | "participant_b" | "spectator";

export type LiveKitRoomAccess = {
  provider: "livekit";
  providerRoomId: string;
  providerToken: string;
  providerUrl: string;
};

export type LiveKitRoomParams = {
  courtSessionId: string;
  dareId: string;
  roomName: string;
};

export type LiveKitRecordingStartResult = {
  egressId: string;
  provider: "livekit";
  recordingStatus: "recording";
  storageBucket: string;
  storagePath: string;
};

export type LiveKitTokenParams = LiveKitRoomParams & {
  userId: string;
  viewerRole: LiveKitViewerRole;
};

export type LiveKitWebhookEvent = {
  createdAt?: bigint | number | string;
  egressInfo?: Record<string, unknown>;
  event?: string;
  id?: string;
  participant?: Record<string, unknown>;
  room?: Record<string, unknown>;
};

export type LiveKitGateway = {
  createParticipantToken(params: LiveKitTokenParams): Promise<LiveKitRoomAccess>;
  ensureRoom(params: LiveKitRoomParams): Promise<void>;
  receiveWebhook(rawBody: string, authorization: string | null): Promise<LiveKitWebhookEvent>;
  startRoomRecording(params: LiveKitRoomParams): Promise<LiveKitRecordingStartResult | null>;
  stopRoomRecording(roomName: string): Promise<string[]>;
};

type LiveKitConfig = {
  apiKey: string;
  apiSecret: string;
  egress?: LiveKitEgressStorageConfig;
  restUrl: string;
  wsUrl: string;
};

type LiveKitEgressStorageConfig = {
  accessKey: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle: boolean;
  prefix: string;
  region: string;
  secret: string;
};

export function createLiveKitGateway(): LiveKitGateway {
  const config = readLiveKitConfig();
  const roomClient = new RoomServiceClient(
    config.restUrl,
    config.apiKey,
    config.apiSecret,
  );
  const egressClient = new EgressClient(
    config.restUrl,
    config.apiKey,
    config.apiSecret,
  );
  const webhookReceiver = new WebhookReceiver(
    config.apiKey,
    config.apiSecret,
  );

  return {
    async ensureRoom(params) {
      try {
        await roomClient.createRoom({
          emptyTimeout: 10 * 60,
          maxParticipants: 150,
          metadata: JSON.stringify({
            courtSessionId: params.courtSessionId,
            dareId: params.dareId,
            product: "dare-live-court",
          }),
          name: params.roomName,
        });
      } catch (error) {
        if (isRoomAlreadyExistsError(error)) return;
        throw new ActionError("PROVIDER_UNAVAILABLE", { cause: error });
      }
    },

    async createParticipantToken(params) {
      const canPublish = params.viewerRole !== "spectator";
      const token = new AccessToken(config.apiKey, config.apiSecret, {
        identity: params.userId,
        metadata: JSON.stringify({
          courtSessionId: params.courtSessionId,
          dareId: params.dareId,
          role: params.viewerRole,
        }),
        ttl: "15m",
      });
      token.addGrant({
        canPublish,
        canPublishData: canPublish,
        canSubscribe: true,
        room: params.roomName,
        roomJoin: true,
      });

      return {
        provider: "livekit",
        providerRoomId: params.roomName,
        providerToken: await token.toJwt(),
        providerUrl: config.wsUrl,
      };
    },

    async receiveWebhook(rawBody, authorization) {
      if (!authorization) {
        throw new ActionError("UNAUTHENTICATED");
      }

      try {
        return await webhookReceiver.receive(
          rawBody,
          authorization,
        ) as unknown as LiveKitWebhookEvent;
      } catch (error) {
        throw new ActionError("FORBIDDEN", { cause: error });
      }
    },

    async startRoomRecording(params) {
      if (!config.egress) return null;

      try {
        const active = await egressClient.listEgress({
          active: true,
          roomName: params.roomName,
        });
        const existing = active.find((egress) => egress.roomName === params.roomName);
        if (existing?.egressId) {
          return {
            egressId: existing.egressId,
            provider: "livekit",
            recordingStatus: "recording",
            storageBucket: config.egress.bucket,
            storagePath: recordingPathFromEgress(existing) ??
              createRecordingPath(config.egress.prefix, params),
          };
        }

        const storagePath = createRecordingPath(config.egress.prefix, params);
        const output = new EncodedFileOutput({
          disableManifest: false,
          fileType: EncodedFileType.MP4,
          filepath: storagePath,
          output: {
            case: "s3",
            value: new S3Upload({
              accessKey: config.egress.accessKey,
              bucket: config.egress.bucket,
              endpoint: config.egress.endpoint,
              forcePathStyle: config.egress.forcePathStyle,
              metadata: {
                courtSessionId: params.courtSessionId,
                dareId: params.dareId,
                product: "dare-live-court",
              },
              region: config.egress.region,
              secret: config.egress.secret,
            }),
          },
        });
        const info = await egressClient.startRoomCompositeEgress(
          params.roomName,
          output,
          {
            encodingOptions: EncodingOptionsPreset.H264_720P_30,
            layout: "grid",
          },
        );

        return {
          egressId: info.egressId,
          provider: "livekit",
          recordingStatus: "recording",
          storageBucket: config.egress.bucket,
          storagePath,
        };
      } catch (error) {
        throw new ActionError("PROVIDER_UNAVAILABLE", { cause: error });
      }
    },

    async stopRoomRecording(roomName) {
      try {
        const active = await egressClient.listEgress({ active: true, roomName });
        const stopped: string[] = [];
        for (const egress of active) {
          if (!egress.egressId) continue;
          await egressClient.stopEgress(egress.egressId);
          stopped.push(egress.egressId);
        }
        return stopped;
      } catch (error) {
        throw new ActionError("PROVIDER_UNAVAILABLE", { cause: error });
      }
    },
  };
}

function readLiveKitConfig(): LiveKitConfig {
  const rawUrl = requiredEnv("LIVEKIT_URL");
  return {
    apiKey: requiredEnv("LIVEKIT_API_KEY"),
    apiSecret: requiredEnv("LIVEKIT_API_SECRET"),
    egress: readLiveKitEgressStorageConfig(),
    restUrl: normalizeRestUrl(rawUrl),
    wsUrl: normalizeWsUrl(rawUrl),
  };
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new ActionError("PROVIDER_UNAVAILABLE", {
      message: `${name} is not configured.`,
    });
  }

  return value;
}

function normalizeRestUrl(value: string): string {
  if (value.startsWith("wss://")) return `https://${value.slice("wss://".length)}`;
  if (value.startsWith("ws://")) return `http://${value.slice("ws://".length)}`;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return `https://${value}`;
}

function normalizeWsUrl(value: string): string {
  if (value.startsWith("https://")) return `wss://${value.slice("https://".length)}`;
  if (value.startsWith("http://")) return `ws://${value.slice("http://".length)}`;
  if (value.startsWith("wss://") || value.startsWith("ws://")) return value;
  return `wss://${value}`;
}

function readLiveKitEgressStorageConfig(): LiveKitEgressStorageConfig | undefined {
  const bucket = optionalEnv("LIVEKIT_EGRESS_S3_BUCKET");
  const accessKey = optionalEnv("LIVEKIT_EGRESS_S3_ACCESS_KEY");
  const secret = optionalEnv("LIVEKIT_EGRESS_S3_SECRET_KEY");
  if (!bucket || !accessKey || !secret) return undefined;

  return {
    accessKey,
    bucket,
    endpoint: optionalEnv("LIVEKIT_EGRESS_S3_ENDPOINT") ?? undefined,
    forcePathStyle: optionalBooleanEnv("LIVEKIT_EGRESS_S3_FORCE_PATH_STYLE"),
    prefix: sanitizePathPart(optionalEnv("LIVEKIT_EGRESS_S3_PREFIX") ?? "live-court-recordings"),
    region: optionalEnv("LIVEKIT_EGRESS_S3_REGION") ?? "auto",
    secret,
  };
}

function optionalEnv(name: string): string | null {
  const value = Deno.env.get(name)?.trim();
  return value ? value : null;
}

function optionalBooleanEnv(name: string): boolean {
  const value = optionalEnv(name);
  if (!value) return false;
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

function createRecordingPath(prefix: string, params: LiveKitRoomParams): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return [
    sanitizePathPart(prefix),
    sanitizePathPart(params.dareId),
    sanitizePathPart(params.courtSessionId),
    `${sanitizePathPart(params.roomName)}-${timestamp}.mp4`,
  ].filter(Boolean).join("/");
}

function sanitizePathPart(value: string): string {
  return value
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[^a-zA-Z0-9._-]/g, "-"))
    .filter(Boolean)
    .join("/");
}

function recordingPathFromEgress(egress: { fileResults?: Array<{ filename?: string; location?: string }> }): string | null {
  const first = egress.fileResults?.[0];
  return first?.filename ?? first?.location ?? null;
}

function isRoomAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists|already_exist|ALREADY_EXISTS|409/i.test(message);
}
