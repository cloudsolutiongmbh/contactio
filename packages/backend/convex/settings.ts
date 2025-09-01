import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function assertMember(ctx: any, tenantId: string, userId: string) {
  const m = await ctx.db
    .query("memberships")
    .withIndex("by_tenant_user", (q: any) => q.eq("tenantId", tenantId).eq("userId", userId))
    .unique();
  if (!m && tenantId !== `user:${userId}`) throw new Error("Kein Zugriff");
  return m ?? { role: "owner" };
}

export const get = query({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    const userId = identity.subject;
    await assertMember(ctx, args.tenantId, userId);

    const s = await ctx.db
      .query("tenantSettings")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
      .unique();
    return (
      s ?? {
        tenantId: args.tenantId,
        ownedDomains: [],
        doNotCapture: [],
        defaultCountryHint: undefined,
        groupScope: undefined,
        llmProvider: undefined,
        createdAt: 0,
        updatedAt: 0,
      }
    );
  },
});

export const put = mutation({
  args: {
    tenantId: v.string(),
    ownedDomains: v.optional(v.array(v.string())),
    doNotCapture: v.optional(v.array(v.string())),
    defaultCountryHint: v.optional(v.string()),
    groupScope: v.optional(v.string()),
    llmProvider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    const userId = identity.subject;
    const m = await assertMember(ctx, args.tenantId, userId);
    if (m.role !== "owner") throw new Error("Nur Admins drfen Einstellungen ndern");

    const existing = await ctx.db
      .query("tenantSettings")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
      .unique();

    if (!existing) {
      await ctx.db.insert("tenantSettings", {
        tenantId: args.tenantId,
        ownedDomains: args.ownedDomains ?? [],
        doNotCapture: args.doNotCapture ?? [],
        defaultCountryHint: args.defaultCountryHint,
        groupScope: args.groupScope,
        llmProvider: args.llmProvider,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existing._id, {
        ownedDomains: args.ownedDomains ?? existing.ownedDomains ?? [],
        doNotCapture: args.doNotCapture ?? existing.doNotCapture ?? [],
        defaultCountryHint: args.defaultCountryHint,
        groupScope: args.groupScope,
        llmProvider: args.llmProvider,
        updatedAt: Date.now(),
      });
    }
    return { success: true } as const;
  },
});

