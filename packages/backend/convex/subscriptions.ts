import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

// Helpers to access Graph
async function getGraphAppToken(): Promise<string> {
  const tenant = (process.env.GRAPH_TENANT_ID as string | undefined) ?? "common";
  const clientId = process.env.GRAPH_CLIENT_ID as string | undefined;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET as string | undefined;
  if (!clientId || !clientSecret) throw new Error("Fehlende GRAPH_CLIENT_ID/GRAPH_CLIENT_SECRET");
  const body = new URLSearchParams();
  body.set("grant_type", "client_credentials");
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", "https://graph.microsoft.com/.default");
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Tokenfehler: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function graphGet(path: string) {
  const token = await getGraphAppToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph GET fehlgeschlagen: ${res.status}`);
  return (await res.json()) as any;
}

async function graphPost(path: string, body: any) {
  const token = await getGraphAppToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph POST fehlgeschlagen: ${res.status}`);
  return (await res.json()) as any;
}

async function graphPatch(path: string, body: any) {
  const token = await getGraphAppToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph PATCH fehlgeschlagen: ${res.status}`);
  if (res.status === 204) return {};
  return (await res.json()) as any;
}

async function graphDelete(path: string) {
  const token = await getGraphAppToken();
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Graph DELETE fehlgeschlagen: ${res.status}`);
}

function computeTenantId(identity: any, explicit?: string) {
  const userId = identity.subject as string;
  return explicit ?? `user:${userId}`;
}

export const getConsentUrl = query({
  args: { redirectUri: v.optional(v.string()) },
  handler: async (_ctx, args) => {
    const clientId = process.env.GRAPH_CLIENT_ID as string | undefined;
    const tenant = (process.env.GRAPH_TENANT_ID as string | undefined) ?? "common";
    if (!clientId) return { url: null } as const;
    const redirect = args.redirectUri ?? (process.env.GRAPH_REDIRECT_URI as string | undefined) ?? "https://login.microsoftonline.com/common/adminconsent";
    const url = new URL(`https://login.microsoftonline.com/${tenant}/v2.0/adminconsent`);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("state", "contactio-admin-consent");
    url.searchParams.set("redirect_uri", redirect);
    return { url: url.toString() } as const;
  },
});

// Internal DB utilities
export const getSettingsInternal = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("tenantSettings")
        .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
        .unique()) ?? null
    );
  },
});

export const getMailboxByUserIdInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("mailboxes")
        .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
        .unique()) ?? null
    );
  },
});

export const listMailboxesByTenantInternal = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mailboxes")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const listSubsByTenantInternal = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const listSubsByMailboxInternal = internalQuery({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_mailboxId", (q: any) => q.eq("mailboxId", args.mailboxId))
      .collect();
  },
});

export const getMailboxInternal = internalQuery({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    return (await ctx.db.get(args.mailboxId)) ?? null;
  },
});

export const getSubBySubscriptionIdInternal = internalQuery({
  args: { subscriptionId: v.string() },
  handler: async (ctx, args) => {
    return (
      (await ctx.db
        .query("subscriptions")
        .withIndex("by_subscriptionId", (q: any) => q.eq("subscriptionId", args.subscriptionId))
        .unique()) ?? null
    );
  },
});

export const upsertMailboxInternal = internalMutation({
  args: {
    tenantId: v.string(),
    userId: v.string(),
    address: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mailboxes")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
      .unique();
    if (!existing) {
      const id = await ctx.db.insert("mailboxes", {
        tenantId: args.tenantId,
        userId: args.userId,
        address: args.address,
        displayName: args.displayName,
        enabled: true,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.get(id);
    } else {
      await ctx.db.patch(existing._id, {
        enabled: true,
        updatedAt: now,
        address: args.address,
        displayName: args.displayName,
      });
      return await ctx.db.get(existing._id);
    }
  },
});

export const setMailboxEnabledInternal = internalMutation({
  args: { mailboxId: v.id("mailboxes"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.mailboxId, { enabled: args.enabled, updatedAt: Date.now() });
  },
});

export const insertSubscriptionInternal = internalMutation({
  args: {
    tenantId: v.string(),
    mailboxId: v.id("mailboxes"),
    subscriptionId: v.string(),
    expiresAt: v.number(),
    clientState: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    await ctx.db.insert("subscriptions", {
      tenantId: args.tenantId,
      mailboxId: args.mailboxId,
      subscriptionId: args.subscriptionId,
      expiresAt: args.expiresAt,
      clientState: args.clientState,
      deltaToken: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteSubscriptionInternal = internalMutation({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const patchSubscriptionInternal = internalMutation({
  args: { id: v.id("subscriptions"), expiresAt: v.optional(v.number()), deltaToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...(args.expiresAt ? { expiresAt: args.expiresAt } : {}),
      ...(args.deltaToken ? { deltaToken: args.deltaToken } : {}),
      updatedAt: Date.now(),
    });
  },
});

export const listMailboxes = action({
  args: { tenantId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as const;
    const tenantId = computeTenantId(identity, args.tenantId);

    const settings = await ctx.runQuery(internal.subscriptions.getSettingsInternal, { tenantId });

    let items: { id: string; address: string; displayName: string }[] = [];
    if (settings?.groupScope) {
      const members = await graphGet(`/groups/${encodeURIComponent(settings.groupScope)}/members?$select=id,displayName,mail,userPrincipalName`);
      const values = (members.value ?? []) as any[];
      items = values
        .map((m) => ({ id: m.id as string, address: (m.mail ?? m.userPrincipalName) as string, displayName: (m.displayName ?? m.userPrincipalName) as string }))
        .filter((x) => x.address);
    } else {
      const users = await graphGet(`/users?$select=id,displayName,mail,userPrincipalName&$top=50`);
      const values = (users.value ?? []) as any[];
      items = values
        .map((u) => ({ id: u.id as string, address: (u.mail ?? u.userPrincipalName) as string, displayName: (u.displayName ?? u.userPrincipalName) as string }))
        .filter((x) => x.address);
    }

    const dbMailboxes = await ctx.runQuery(internal.subscriptions.listMailboxesByTenantInternal, { tenantId });
    const byUserId = new Map(dbMailboxes.map((m) => [m.userId, m] as const));
    return items.map((it) => {
      const mb = byUserId.get(it.id);
      return { ...it, enabled: mb?.enabled ?? false, mailboxId: mb?._id ?? null } as const;
    });
  },
});

export const listSubscriptions = query({
  args: { tenantId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [] as const;
    const tenantId = computeTenantId(identity, args.tenantId);
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", tenantId))
      .collect();
    return subs.map((s) => ({
      id: s._id,
      subscriptionId: s.subscriptionId,
      mailboxId: s.mailboxId,
      expiresAt: s.expiresAt,
      clientState: s.clientState,
      deltaToken: s.deltaToken ?? null,
    }));
  },
});

export const enableMailbox = action({
  args: {
    tenantId: v.optional(v.string()),
    userId: v.string(),
    address: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    const tenantId = computeTenantId(identity, args.tenantId);

    // Upsert mailbox via internal mutation
    const mailbox = await ctx.runMutation(internal.subscriptions.upsertMailboxInternal, {
      tenantId,
      userId: args.userId,
      address: args.address,
      displayName: args.displayName,
    });

    const webhookUrl = process.env.GRAPH_WEBHOOK_URL as string | undefined;
    const pubCert = process.env.GRAPH_ENCRYPTION_PUBLIC_CERT_PEM as string | undefined;
    if (!webhookUrl) throw new Error("Missing GRAPH_WEBHOOK_URL");
    if (!pubCert) throw new Error("Missing GRAPH_ENCRYPTION_PUBLIC_CERT_PEM");

    // Create subscription in Graph
    const expires = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const clientState = `${args.userId}:${Date.now().toString(36)}`;
    const body = {
      changeType: "created",
      notificationUrl: webhookUrl,
      resource: `/users/${args.userId}/mailFolders('inbox')/messages`,
      expirationDateTime: expires,
      clientState,
      includeResourceData: true,
      encryptionCertificate: pubCert,
      latestSupportedTlsVersion: "v1_2",
    } as const;
    const created = await graphPost("/subscriptions", body);

    // Persist subscription
    await ctx.runMutation(internal.subscriptions.insertSubscriptionInternal, {
      tenantId,
      mailboxId: mailbox!._id,
      subscriptionId: created.id as string,
      expiresAt: Date.parse(created.expirationDateTime as string),
      clientState,
    });

    return { success: true } as const;
  },
});

export const disableMailbox = action({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    const mailbox = await ctx.runQuery(internal.subscriptions.getMailboxInternal, { mailboxId: args.mailboxId });
    if (!mailbox) return { success: true } as const;
    const subs = await ctx.runQuery(internal.subscriptions.listSubsByMailboxInternal, { mailboxId: args.mailboxId });
    for (const s of subs) {
      await graphDelete(`/subscriptions/${s.subscriptionId}`);
      await ctx.runMutation(internal.subscriptions.deleteSubscriptionInternal, { id: s._id });
    }
    await ctx.runMutation(internal.subscriptions.setMailboxEnabledInternal, { mailboxId: mailbox._id, enabled: false });
    return { success: true } as const;
  },
});

export const renewExpiring = action({
  args: { withinHours: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const within = (args.withinHours ?? 72) * 60 * 60 * 1000;
    const now = Date.now();
    const due = await ctx.runQuery(internal.subscriptions.listSubsByTenantInternal, { tenantId: "*" as any } as any).catch(async () => {
      // Fallback: scan all via action is not supported; instead fetch all subs via a public query per tenant if needed.
      // In MVP we simply fetch all subscriptions by skipping tenant filter using a dedicated internal query.
      const all = await ctx.runQuery(internal.subscriptions.listAllSubsInternal, {} as any);
      return all;
    });
    let renewed = 0;
    for (const s of due) {
      if (s.expiresAt - now <= within) {
        const newExpires = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
        await graphPatch(`/subscriptions/${s.subscriptionId}`, { expirationDateTime: newExpires });
        await ctx.runMutation(internal.subscriptions.patchSubscriptionInternal, { id: s._id, expiresAt: Date.parse(newExpires) });
        renewed++;
      }
    }
    return { renewed } as const;
  },
});

export const deltaSyncMailbox = action({
  args: { mailboxId: v.id("mailboxes") },
  handler: async (ctx, args) => {
    const mailbox = await ctx.runQuery(internal.subscriptions.getMailboxInternal, { mailboxId: args.mailboxId });
    if (!mailbox) throw new Error("Mailbox nicht gefunden");
    const subs = await ctx.runQuery(internal.subscriptions.listSubsByMailboxInternal, { mailboxId: args.mailboxId });
    const sub = subs[0];
    const tenantId = mailbox.tenantId as string;
    const userGraphId = mailbox.userId as string;
    let nextLink: string | undefined;
    let deltaToken: string | undefined = sub?.deltaToken;
    let processed = 0;

    const select = "$select=id,receivedDateTime,conversationId,internetMessageId,from,toRecipients,ccRecipients,bodyPreview";

    while (true) {
      let url: string;
      if (nextLink) {
        url = nextLink;
      } else if (deltaToken) {
        url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userGraphId)}/mailFolders('inbox')/messages/delta?${select}&$deltatoken=${encodeURIComponent(deltaToken)}`;
      } else {
        url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userGraphId)}/mailFolders('inbox')/messages/delta?${select}`;
      }
      const token = await getGraphAppToken();
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Delta fehlgeschlagen: ${res.status}`);
      const json = (await res.json()) as any;
      const values: any[] = json.value ?? [];
      for (const m of values) {
        // Enqueue processing using existing logic
        await ctx.runAction(api.http.actionEnqueueMessageProcessing, {
          subscriptionId: sub?.subscriptionId ?? "delta",
          mailboxId: mailbox._id,
          tenantId,
          resource: `/users/${userGraphId}/messages/${m.id}`,
          payloadJson: JSON.stringify(m),
        });
        processed++;
      }
      nextLink = json["@odata.nextLink"] as string | undefined;
      const deltaLink = json["@odata.deltaLink"] as string | undefined;
      if (deltaLink) {
        const tokenParam = new URL(deltaLink).searchParams.get("$deltatoken") ?? undefined;
        if (sub) {
          await ctx.runMutation(internal.subscriptions.patchSubscriptionInternal, { id: sub._id, deltaToken: tokenParam });
        }
        break;
      }
      if (!nextLink) break;
    }

    return { processed } as const;
  },
});

export const reconcileGroupScope = action({
  args: { tenantId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    const tenantId = computeTenantId(identity, args.tenantId);
    const settings = await ctx.runQuery(internal.subscriptions.getSettingsInternal, { tenantId });
    if (!settings?.groupScope) return { created: 0 } as const;

    const members = await graphGet(`/groups/${encodeURIComponent(settings.groupScope)}/members?$select=id,displayName,mail,userPrincipalName`);
    const values = (members.value ?? []) as any[];
    const list = values
      .map((m) => ({ id: m.id as string, address: (m.mail ?? m.userPrincipalName) as string, displayName: (m.displayName ?? m.userPrincipalName) as string }))
      .filter((x) => x.address);

    let created = 0;
    for (const item of list) {
      const existing = await ctx.runQuery(internal.subscriptions.getMailboxByUserIdInternal, { userId: item.id });
      if (existing?.enabled) continue;
      const mailbox = await ctx.runMutation(internal.subscriptions.upsertMailboxInternal, {
        tenantId,
        userId: item.id,
        address: item.address,
        displayName: item.displayName,
      });

      const webhookUrl = process.env.GRAPH_WEBHOOK_URL as string | undefined;
      const pubCert = process.env.GRAPH_ENCRYPTION_PUBLIC_CERT_PEM as string | undefined;
      if (!webhookUrl || !pubCert) continue;

      const expires = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const clientState = crypto.randomUUID();
      const body = {
        changeType: "created",
        notificationUrl: webhookUrl,
        resource: `/users/${item.id}/mailFolders('inbox')/messages`,
        expirationDateTime: expires,
        clientState,
        includeResourceData: true,
        encryptionCertificate: pubCert,
        latestSupportedTlsVersion: "v1_2",
      } as const;
      const createdRes = await graphPost("/subscriptions", body);
      await ctx.runMutation(internal.subscriptions.insertSubscriptionInternal, {
        tenantId,
        mailboxId: mailbox!._id,
        subscriptionId: createdRes.id as string,
        expiresAt: Date.parse(createdRes.expirationDateTime as string),
        clientState,
      });
      created++;
    }

    return { created } as const;
  },
});

// Helper internal to list all subs (used in renew action fallback)
export const listAllSubsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("subscriptions").collect();
  },
});

export const ingestMessageIfNewInternal = internalMutation({
  args: {
    tenantId: v.string(),
    mailboxId: v.id("mailboxes"),
    internetMessageId: v.string(),
    conversationId: v.string(),
    receivedDateTime: v.number(),
    from: v.optional(v.string()),
    to: v.optional(v.array(v.string())),
    cc: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const lockKey = `msg:${args.tenantId}:${args.internetMessageId}`;
    const existingLock = await ctx.db
      .query("locks")
      .withIndex("by_key", (q: any) => q.eq("key", lockKey))
      .unique();
    if (existingLock && existingLock.expiresAt > now) {
      return { queued: false, duplicate: true } as const;
    }
    const ttlMs = 48 * 60 * 60 * 1000;
    if (!existingLock) {
      await ctx.db.insert("locks", { key: lockKey, createdAt: now, expiresAt: now + ttlMs });
    } else {
      await ctx.db.patch(existingLock._id, { expiresAt: now + ttlMs });
    }

    // Determine inbound by owned domains
    const settings = await ctx.db
      .query("tenantSettings")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
      .unique();
    const fromAddress = args.from;
    const inbound = (() => {
      if (!fromAddress) return true;
      const domain = fromAddress.split("@")[1]?.toLowerCase();
      if (!domain) return true;
      const set = new Set((settings?.ownedDomains ?? []).map((d) => d.toLowerCase()));
      return !set.has(domain);
    })();

    if (inbound) {
      const conv = await ctx.db
        .query("conversations")
        .withIndex("by_tenant_conversation", (q: any) => q.eq("tenantId", args.tenantId).eq("conversationId", args.conversationId))
        .unique();
      if (!conv) {
        await ctx.db.insert("conversations", {
          tenantId: args.tenantId,
          conversationId: args.conversationId,
          maxReceivedInbound: args.receivedDateTime,
          updatedAt: now,
        });
      } else if (args.receivedDateTime <= conv.maxReceivedInbound) {
        return { queued: false, older: true } as const;
      } else {
        await ctx.db.patch(conv._id, { maxReceivedInbound: args.receivedDateTime, updatedAt: now });
      }
    }

    await ctx.db.insert("messages", {
      tenantId: args.tenantId,
      internetMessageId: args.internetMessageId,
      conversationId: args.conversationId,
      receivedDateTime: args.receivedDateTime,
      from: args.from,
      to: args.to,
      cc: args.cc,
      mailboxOwnerId: args.mailboxId,
      status: "pending",
      createdAt: now,
    });

    return { queued: true } as const;
  },
});
