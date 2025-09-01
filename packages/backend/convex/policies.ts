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

    const p = await ctx.db
      .query("policies")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
      .unique();
    return (
      p ?? {
        tenantId: args.tenantId,
        autoApproveThreshold: 0.85,
        autoApproveOnlyEmptyFields: true,
        sensitiveFields: ["mobile"],
        createdAt: 0,
        updatedAt: 0,
      }
    );
  },
});

export const put = mutation({
  args: {
    tenantId: v.string(),
    autoApproveThreshold: v.optional(v.number()),
    autoApproveOnlyEmptyFields: v.optional(v.boolean()),
    sensitiveFields: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    const userId = identity.subject;
    const m = await assertMember(ctx, args.tenantId, userId);
    if (m.role !== "owner") throw new Error("Nur Admins drfen Policies ndern");

    const existing = await ctx.db
      .query("policies")
      .withIndex("by_tenantId", (q: any) => q.eq("tenantId", args.tenantId))
      .unique();

    if (!existing) {
      await ctx.db.insert("policies", {
        tenantId: args.tenantId,
        autoApproveThreshold: args.autoApproveThreshold ?? 0.85,
        autoApproveOnlyEmptyFields: args.autoApproveOnlyEmptyFields ?? true,
        sensitiveFields: args.sensitiveFields ?? ["mobile"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(existing._id, {
        autoApproveThreshold: args.autoApproveThreshold ?? existing.autoApproveThreshold,
        autoApproveOnlyEmptyFields: args.autoApproveOnlyEmptyFields ?? existing.autoApproveOnlyEmptyFields,
        sensitiveFields: args.sensitiveFields ?? existing.sensitiveFields,
        updatedAt: Date.now(),
      });
    }
    return { success: true } as const;
  },
});

