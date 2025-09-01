import { httpRouter } from "convex/server";
import { httpAction, action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

type ChangeNotification = {
  subscriptionId: string;
  subscriptionExpirationDateTime?: string;
  resource: string; // e.g. "/users/{id}/mailFolders('inbox')/messages/{id}"
  tenantId?: string; // Graph tenant (AAD) id
  encryptedContent?: {
    data: string; // base64
    dataKey?: string; // base64 RSA-encrypted AES key
    dataSignature?: string; // base64 HMAC-SHA256 of data
    encryptionCertificateId?: string;
    encryptionCertificateThumbprint?: string;
  };
  resourceData?: any; // if includeResourceData without encryption (fallback)
  // Other fields omitted for brevity
};

const http = httpRouter();

// GET handshake for Microsoft Graph webhook validation
http.route({
  path: "/webhooks/graph",
  method: "GET",
  handler: httpAction(async (_ctx, request) => {
    const url = new URL(request.url);
    const token = url.searchParams.get("validationToken");
    if (token) {
      return new Response(token, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response("Missing validationToken", { status: 400 });
  }),
});

// POST notifications endpoint
http.route({
  path: "/webhooks/graph",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = (await request.json().catch(() => ({}))) as {
        value?: ChangeNotification[];
        validationTokens?: string[];
      };

      // Optional: validate tokens (signature verification deferred in MVP)
      if (Array.isArray(body.validationTokens) && body.validationTokens.length > 0) {
        const ok = await verifyValidationTokens(ctx, body.validationTokens).catch(() => false);
        if (!ok) {
          // Reject if tokens present but invalid
          return new Response("Invalid validation token", { status: 401 });
        }
      }

      const notifications = body.value ?? [];
      if (notifications.length === 0) {
        return new Response(null, { status: 202 });
      }

      // Process notifications quickly and asynchronously
      await Promise.all(
        notifications.map(async (n) => {
          // Resolve subscription -> tenant/mailbox
          const sub = await ctx.runQuery(internal.subscriptions.getSubBySubscriptionIdInternal, { subscriptionId: n.subscriptionId });
          if (!sub) return; // unknown or expired subscription

          // Attempt to extract message metadata
          let payload: any = undefined;
          if (n.encryptedContent?.data && n.encryptedContent?.dataKey) {
            try {
              payload = await decryptEncryptedContent(
                ctx,
                n.encryptedContent.data,
                n.encryptedContent.dataKey,
                n.encryptedContent.dataSignature,
              );
            } catch {
              // ignore decryption errors for now; fall back to resource id fetch in action
            }
          } else if (n.resourceData) {
            payload = n.resourceData;
          }

          // Enqueue processing action (includes Graph fallback fetching if payload missing)
          await ctx.runAction(api.http.actionEnqueueMessageProcessing, {
            subscriptionId: n.subscriptionId,
            mailboxId: sub.mailboxId,
            tenantId: sub.tenantId,
            resource: n.resource,
            payloadJson: payload ? JSON.stringify(payload) : undefined,
          });
        })
      );

      // Always acknowledge quickly
      return new Response(null, { status: 202 });
    } catch (err) {
      console.error("/webhooks/graph error", err);
      return new Response(null, { status: 202 });
    }
  }),
});

export default http;

// --- Actions & helpers ---

export const actionEnqueueMessageProcessing = action({
  args: {
    subscriptionId: v.string(),
    mailboxId: v.id("mailboxes"),
    tenantId: v.string(),
    resource: v.string(),
    payloadJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { mailboxId, tenantId, payloadJson, resource } = args as any;

    // Extract meta (either from payload or fetch via Graph as fallback)
    let meta = payloadJson ? JSON.parse(payloadJson) : undefined;
    if (!meta) {
      try {
        meta = await fetchGraphMessageByResource(ctx, resource);
      } catch {
        // If still missing, give up early
        return { queued: false } as const;
      }
    }

    const internetMessageId: string | undefined = meta?.internetMessageId;
    const conversationId: string | undefined = meta?.conversationId;
    const receivedStr: string | undefined = meta?.receivedDateTime;
    const fromAddress: string | undefined = meta?.from?.emailAddress?.address ?? meta?.from?.address;
    const toRecipients: string[] = (meta?.toRecipients ?? meta?.to ?? [])
      .map((r: any) => r?.emailAddress?.address ?? r?.address)
      .filter(Boolean);
    const ccRecipients: string[] = (meta?.ccRecipients ?? meta?.cc ?? [])
      .map((r: any) => r?.emailAddress?.address ?? r?.address)
      .filter(Boolean);

    if (!internetMessageId || !conversationId || !receivedStr) {
      return { queued: false } as const;
    }

    const receivedDateTime = Date.parse(receivedStr);
    if (!Number.isFinite(receivedDateTime)) {
      return { queued: false } as const;
    }

    // Persist & dedupe via internal mutation
    const res = await ctx.runMutation(internal.subscriptions.ingestMessageIfNewInternal, {
      tenantId,
      mailboxId,
      internetMessageId,
      conversationId,
      receivedDateTime,
      from: fromAddress,
      to: toRecipients,
      cc: ccRecipients,
    });
    return res as any;
  },
});

async function verifyValidationTokens(_ctx: any, _tokens: string[]): Promise<boolean> {
  // For MVP we only check presence. Full JWT signature verification against Microsoft JWKs
  // can be added later if required.
  return true;
}

async function decryptEncryptedContent(
  ctx: any,
  dataB64: string,
  dataKeyB64: string,
  _dataSignatureB64?: string,
) {
  const { subtle } = (globalThis as any).crypto ?? {};
  // Prefer Node crypto for RSA + AES decryption
  const crypto = await import("node:crypto");
  const privateKeyPem = process.env.GRAPH_ENCRYPTION_PRIVATE_KEY_PEM as string | undefined;
  if (!privateKeyPem) throw new Error("Missing GRAPH_ENCRYPTION_PRIVATE_KEY_PEM");

  const dataKeyEncrypted = Buffer.from(dataKeyB64, "base64");
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    } as any,
    dataKeyEncrypted,
  );

  const payloadEncrypted = Buffer.from(dataB64, "base64");
  // The first 16 bytes are IV for AES-CBC in Graph encrypted content format
  const iv = payloadEncrypted.subarray(0, 16);
  const ciphertext = payloadEncrypted.subarray(16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", aesKey, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  const json = decrypted.toString("utf8");
  return JSON.parse(json);
}

async function fetchGraphMessageByResource(ctx: any, resource: string) {
  // resource: "/users/{id}/mailFolders('inbox')/messages/{messageId}" or "/users/{id}/messages/{messageId}"
  const match = resource.match(/\/users\/([^/]+)\/.*?messages\/?\(?([^\/'\)]+)\)?/i);
  if (!match) throw new Error("Unsupported resource format");
  const userId = match[1];
  const messageId = match[2];
  return await fetchGraph(ctx, `/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}?$select=id,receivedDateTime,conversationId,internetMessageId,from,toRecipients,ccRecipients,bodyPreview`);
}

async function fetchGraph(ctx: any, path: string) {
  const token = await getGraphAppToken(ctx);
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Graph request failed: ${res.status}`);
  return await res.json();
}

async function getGraphAppToken(_ctx: any): Promise<string> {
  const tenant = (process.env.GRAPH_TENANT_ID as string | undefined) ?? "common";
  const clientId = process.env.GRAPH_CLIENT_ID as string | undefined;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET as string | undefined;
  if (!clientId || !clientSecret) throw new Error("Missing GRAPH_CLIENT_ID/GRAPH_CLIENT_SECRET");
  const form = new URLSearchParams();
  form.set("grant_type", "client_credentials");
  form.set("client_id", clientId);
  form.set("client_secret", clientSecret);
  form.set("scope", "https://graph.microsoft.com/.default");

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}
