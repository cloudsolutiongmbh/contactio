import { mutation } from "./_generated/server";

export const backfillTenantIds = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Nicht authentifiziert");
    // Admin-only in MVP: allow anyone to backfill only their personal docs
    const userId = identity.subject;

    const contacts = await ctx.db.query("contacts").collect();
    let updated = 0;
    for (const c of contacts) {
      // Assign personal tenant to legacy docs without tenantId
      // or where tenantId is falsy
      // Note: restrict to the caller's docs to avoid cross-user edits
      if ((c as any).ownerId === userId && !(c as any).tenantId) {
        await ctx.db.patch(c._id, { tenantId: `user:${userId}` });
        updated++;
      }
    }
    return { updated } as const;
  },
});

