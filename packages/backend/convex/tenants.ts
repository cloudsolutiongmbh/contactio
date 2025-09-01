import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function ensurePersonalTenant(ctx: any, userId: string) {
  const tenantId = `user:${userId}`;
  const existing = await ctx.db
    .query("tenants")
    .withIndex("by_externalId", (q: any) => q.eq("externalId", tenantId))
    .unique();
  if (!existing) {
    await ctx.db.insert("tenants", {
      externalId: tenantId,
      name: "Persönlich",
      createdAt: Date.now(),
    });
  }
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_tenant_user", (q: any) => q.eq("tenantId", tenantId).eq("userId", userId))
    .unique();
  if (!membership) {
    await ctx.db.insert("memberships", {
      tenantId,
      userId,
      role: "owner",
      createdAt: Date.now(),
    });
  }
  return tenantId;
}

export const me = mutation({
  args: {
    tenantId: v.optional(v.string()), // Clerk org id or personal workspace id
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { authenticated: false } as const;
    const userId = identity.subject;

    const requestedTenant = args.tenantId ?? `user:${userId}`;

    // Ensure tenant & membership for personal workspace
    if (requestedTenant.startsWith("user:")) {
      await ensurePersonalTenant(ctx, userId);
    } else {
      // For org tenants, ensure tenant row exists; trust client-provided active org (Clerk UI)
      const t = await ctx.db
        .query("tenants")
        .withIndex("by_externalId", (q: any) => q.eq("externalId", requestedTenant))
        .unique();
      if (!t) {
        await ctx.db.insert("tenants", {
          externalId: requestedTenant,
          name: undefined,
          createdAt: Date.now(),
        });
      }
      // Ensure membership exists (role default 'viewer')
      const m = await ctx.db
        .query("memberships")
        .withIndex("by_tenant_user", (q: any) => q.eq("tenantId", requestedTenant).eq("userId", userId))
        .unique();
      if (!m) {
        await ctx.db.insert("memberships", {
          tenantId: requestedTenant,
          userId,
          role: "viewer",
          createdAt: Date.now(),
        });
      }
    }

    const membership = await ctx.db
      .query("memberships")
      .withIndex("by_tenant_user", (q: any) => q.eq("tenantId", requestedTenant).eq("userId", userId))
      .unique();

    const role = membership?.role ?? (requestedTenant === `user:${userId}` ? "owner" : "none");

    return {
      authenticated: true,
      userId,
      tenantId: requestedTenant,
      role,
    } as const;
  },
});

export const upsertMembership = mutation({
  args: {
    tenantId: v.string(),
    role: v.string(), // 'owner' | 'reviewer' | 'viewer'
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    const userId = identity.subject;

    // Allow users to self-provision personal workspace membership only
    if (args.tenantId !== `user:${userId}`) {
      throw new Error("Nur persönliche Tenants können selbst angelegt werden");
    }

    await ensurePersonalTenant(ctx, userId);
    return { success: true } as const;
  },
});
