import { query } from "./_generated/server";
import { v } from "convex/values";

async function resolveTenantId(ctx: any, explicitTenantId: string | undefined, userId: string) {
  const tenantId = explicitTenantId ?? `user:${userId}`;
  if (tenantId === `user:${userId}`) return tenantId;
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [] as any[];
    }
    const userId = identity.subject;
    const tenantId = await resolveTenantId(ctx, args.tenantId, userId);

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_lastName_firstName", (q: any) => q.eq("tenantId", tenantId))
      .collect();

    // Group contacts by company
    const companyMap = new Map<string, any[]>();
    
    contacts.forEach(contact => {
      const companyName = contact.company?.trim() || "Ohne Firma";
      if (!companyMap.has(companyName)) {
        companyMap.set(companyName, []);
      }
      companyMap.get(companyName)!.push(contact);
    });

    // Convert to array format with company info
    let companies = Array.from(companyMap.entries()).map(([name, contacts]) => ({
      name,
      contactCount: contacts.length,
      contacts: contacts.sort((a, b) => {
        const an = `${a.lastName} ${a.firstName}`.toLowerCase();
        const bn = `${b.lastName} ${b.firstName}`.toLowerCase();
        return an.localeCompare(bn);
      }),
      // Get some aggregate info
      industries: [...new Set(contacts.map(c => c.industry).filter(Boolean))],
      locations: [...new Set(contacts.map(c => c.location).filter(Boolean))],
    }));

    // Apply search filter if provided
    const search = (args.search ?? "").trim().toLowerCase();
    if (search) {
      companies = companies.filter(company => {
        const searchableText = [
          company.name,
          ...company.contacts.flatMap(c => [c.firstName, c.lastName, c.email, c.notes || ""]),
          ...company.industries,
          ...company.locations,
        ].join(" ").toLowerCase();
        
        return searchableText.includes(search);
      });
    }

    // Sort companies by contact count (desc) then by name
    companies.sort((a, b) => {
      if (b.contactCount !== a.contactCount) {
        return b.contactCount - a.contactCount;
      }
      return a.name.localeCompare(b.name);
    });

    return companies;
  },
});

export const getCompanyContacts = query({
  args: {
    tenantId: v.optional(v.string()),
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [] as any[];
    }
    const userId = identity.subject;
    const tenantId = await resolveTenantId(ctx, args.tenantId, userId);

    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_tenant_lastName_firstName", (q: any) => q.eq("tenantId", tenantId))
      .collect();

    const targetCompany = args.companyName === "Ohne Firma" ? "" : args.companyName;
    
    return contacts
      .filter(contact => {
        const company = contact.company?.trim() || "";
        return company === targetCompany;
      })
      .sort((a, b) => {
        const an = `${a.lastName} ${a.firstName}`.toLowerCase();
        const bn = `${b.lastName} ${b.firstName}`.toLowerCase();
        return an.localeCompare(bn);
      });
  },
});
