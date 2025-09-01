import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function resolveTenantId(ctx: any, explicitTenantId: string | undefined, userId: string) {
  const tenantId = explicitTenantId ?? `user:${userId}`;
  if (tenantId === `user:${userId}`) {
    return tenantId;
  }
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_tenant_user", (q: any) => q.eq("tenantId", tenantId).eq("userId", userId))
    .unique();
  if (!membership) throw new Error("Kein Zugriff auf diesen Tenant");
  return tenantId;
}

export const list = query({
  args: {
    tenantId: v.optional(v.string()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    location: v.optional(v.string()),
    industry: v.optional(v.string()),
    sort: v.optional(v.string()), // 'newest' | 'alphabetical'
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // Not authenticated: no data
      return [] as any[];
    }
    const userId = identity.subject;
    const tenantId = await resolveTenantId(ctx, args.tenantId, userId);

    const items = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_lastName_firstName", (q: any) => q.eq("tenantId", tenantId))
      .collect();

    let results = items.slice();
    const search = (args.search ?? "").trim().toLowerCase();
    if (search) {
      results = results.filter((c) => {
        const values = [
          c.firstName,
          c.lastName,
          c.email,
          c.company ?? "",
          c.phone ?? "",
          c.linkedinUrl,
          c.notes,
          c.location ?? "",
          c.industry ?? "",
          (c.tags ?? []).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return values.includes(search);
      });
    }

    if (args.status && args.status !== "Alle") {
      results = results.filter((c) => (c.status ?? "").toLowerCase() === args.status!.toLowerCase());
    }
    if (args.location && args.location !== "Alle") {
      results = results.filter((c) => (c.location ?? "").toLowerCase() === args.location!.toLowerCase());
    }
    if (args.industry && args.industry !== "Alle") {
      results = results.filter((c) => (c.industry ?? "").toLowerCase() === args.industry!.toLowerCase());
    }

    if (args.sort === "alphabetical") {
      results.sort((a, b) => {
        const an = `${a.lastName} ${a.firstName}`.toLowerCase();
        const bn = `${b.lastName} ${b.firstName}`.toLowerCase();
        return an.localeCompare(bn);
      });
    } else {
      // newest
      results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return results;
  },
});

export const create = mutation({
  args: {
    tenantId: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    linkedinUrl: v.string(),
    notes: v.string(),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
    phones: v.optional(
      v.array(v.object({ label: v.optional(v.string()), value: v.string() }))
    ),
    emailsExtra: v.optional(
      v.array(v.object({ label: v.optional(v.string()), value: v.string() }))
    ),
    addresses: v.optional(
      v.array(
        v.object({
          label: v.optional(v.string()),
          street: v.optional(v.string()),
          city: v.optional(v.string()),
          postalCode: v.optional(v.string()),
          country: v.optional(v.string()),
        }),
      ),
    ),
    avatarUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    birthday: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
    status: v.optional(v.string()),
    location: v.optional(v.string()),
    industry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Nicht authentifiziert");
    }
    const userId = identity.subject;
    const tenantId = await resolveTenantId(ctx, args.tenantId, userId);

    const contactId = await ctx.db.insert("contacts", {
      ownerId: userId,
      tenantId,
      createdAt: Date.now(),
      ...(Object.fromEntries(Object.entries(args).filter(([k]) => k !== "tenantId")) as any),
      status: args.status ?? "Kontakt",
    });
    return await ctx.db.get(contactId);
  },
});

export const update = mutation({
  args: {
    id: v.id("contacts"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    company: v.optional(v.string()),
    phone: v.optional(v.string()),
    title: v.optional(v.string()),
    phones: v.optional(
      v.array(v.object({ label: v.optional(v.string()), value: v.string() }))
    ),
    emailsExtra: v.optional(
      v.array(v.object({ label: v.optional(v.string()), value: v.string() }))
    ),
    addresses: v.optional(
      v.array(
        v.object({
          label: v.optional(v.string()),
          street: v.optional(v.string()),
          city: v.optional(v.string()),
          postalCode: v.optional(v.string()),
          country: v.optional(v.string()),
        }),
      ),
    ),
    avatarUrl: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    twitterUrl: v.optional(v.string()),
    githubUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    birthday: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
    status: v.optional(v.string()),
    location: v.optional(v.string()),
    industry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Nicht authentifiziert");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Kontakt nicht gefunden");
    const userId = identity.subject;
    if (existing.tenantId !== `user:${userId}`) {
      const m = await ctx.db
        .query("memberships")
        .withIndex("by_tenant_user", (q: any) => q.eq("tenantId", existing.tenantId).eq("userId", userId))
        .unique();
      if (!m) throw new Error("Kein Zugriff");
    }

    const { id, ...patch } = args as any;
    await ctx.db.patch(id, patch);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Nicht authentifiziert");
    }
    const existing = await ctx.db.get(args.id);
    if (!existing) return { success: true };
    const userId = identity.subject;
    if (existing.tenantId !== `user:${userId}`) {
      const m = await ctx.db
        .query("memberships")
        .withIndex("by_tenant_user", (q: any) => q.eq("tenantId", existing.tenantId).eq("userId", userId))
        .unique();
      if (!m) throw new Error("Kein Zugriff");
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

export const get = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const userId = identity.subject;
    if (doc.tenantId !== `user:${userId}`) {
      const m = await ctx.db
        .query("memberships")
        .withIndex("by_tenant_user", (q: any) => q.eq("tenantId", doc.tenantId).eq("userId", userId))
        .unique();
      if (!m) throw new Error("Kein Zugriff");
    }
    return doc;
  },
});
