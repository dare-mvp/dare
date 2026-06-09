import {
  AccessToken,
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
};

type LiveKitConfig = {
  apiKey: string;
  apiSecret: string;
  restUrl: string;
  wsUrl: string;
};

export function createLiveKitGateway(): LiveKitGateway {
  const config = readLiveKitConfig();
  const roomClient = new RoomServiceClient(
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
  };
}

function readLiveKitConfig(): LiveKitConfig {
  const rawUrl = requiredEnv("LIVEKIT_URL");
  return {
    apiKey: requiredEnv("LIVEKIT_API_KEY"),
    apiSecret: requiredEnv("LIVEKIT_API_SECRET"),
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

function isRoomAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /already exists|already_exist|ALREADY_EXISTS|409/i.test(message);
}
