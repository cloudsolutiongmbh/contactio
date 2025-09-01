import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	// Tenancy (B2B organizations via Clerk + personal workspaces)
	tenants: defineTable({
		// Use Clerk Organization ID or "user:{clerkUserId}" for personal workspaces
		externalId: v.string(),
		name: v.optional(v.string()),
		createdAt: v.number(),
	})
		.index("by_externalId", ["externalId"]),

	memberships: defineTable({
		tenantId: v.string(), // equals tenants.externalId
		userId: v.string(), // Clerk user id (identity.subject)
		role: v.string(), // 'owner' | 'reviewer' | 'viewer'
		createdAt: v.number(),
	})
		.index("by_userId", ["userId"]) 
		.index("by_tenant_user", ["tenantId", "userId"]) 
		.index("by_tenantId", ["tenantId"]),

	tenantSettings: defineTable({
		tenantId: v.string(),
		ownedDomains: v.optional(v.array(v.string())),
		doNotCapture: v.optional(v.array(v.string())),
		defaultCountryHint: v.optional(v.string()),
		groupScope: v.optional(v.string()), // optional M365 group id
		llmProvider: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_tenantId", ["tenantId"]),

	policies: defineTable({
		tenantId: v.string(),
		autoApproveThreshold: v.optional(v.number()),
		autoApproveOnlyEmptyFields: v.optional(v.boolean()),
		sensitiveFields: v.optional(v.array(v.string())),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_tenantId", ["tenantId"]),

	// Contacts for Contactio (now tenant-scoped)
	contacts: defineTable({
		ownerId: v.string(), // Clerk user id (kept for reference/compat)
		tenantId: v.string(), // Clerk org id or "user:{userId}"
		firstName: v.string(),
		lastName: v.string(),
		email: v.string(), // primary email
		linkedinUrl: v.string(),
		notes: v.string(),
		company: v.optional(v.string()),
		title: v.optional(v.string()),
		phone: v.optional(v.string()), // primary phone
		phones: v.optional(
			v.array(
				v.object({ label: v.optional(v.string()), value: v.string() })
			)
		),
		emailsExtra: v.optional(
			v.array(
				v.object({ label: v.optional(v.string()), value: v.string() })
			)
		),
		addresses: v.optional(
			v.array(
				v.object({
					label: v.optional(v.string()),
					street: v.optional(v.string()),
					city: v.optional(v.string()),
					postalCode: v.optional(v.string()),
					country: v.optional(v.string()),
				})
			)
		),
		avatarUrl: v.optional(v.string()),
		websiteUrl: v.optional(v.string()),
		twitterUrl: v.optional(v.string()),
		githubUrl: v.optional(v.string()),
		tags: v.optional(v.array(v.string())),
		birthday: v.optional(v.string()), // YYYY-MM-DD
		lastContactedAt: v.optional(v.number()),
		status: v.optional(v.string()),
		location: v.optional(v.string()),
		industry: v.optional(v.string()),
		createdAt: v.number(),
	})
		// Useful indexes for querying/sorting per tenant
		.index("by_tenant_lastName_firstName", ["tenantId", "lastName", "firstName"]) 
		.index("by_tenant_createdAt", ["tenantId", "createdAt"]) 
		// Legacy user-scoped indexes (kept temporarily for compatibility/use in migrations)
		.index("by_ownerId_lastName_firstName", ["ownerId", "lastName", "firstName"]) 
		.index("by_ownerId_createdAt", ["ownerId", "createdAt"]),

	// Microsoft 365 integration (Schritt 2)
	mailboxes: defineTable({
		tenantId: v.string(),
		userId: v.string(), // Microsoft Graph user id for the mailbox owner
		address: v.string(),
		displayName: v.optional(v.string()),
		enabled: v.boolean(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_tenantId", ["tenantId"]) 
		.index("by_userId", ["userId"]) 
		.index("by_address", ["address"]),

	subscriptions: defineTable({
		tenantId: v.string(),
		mailboxId: v.id("mailboxes"),
		subscriptionId: v.string(),
		expiresAt: v.number(),
		clientState: v.string(),
		deltaToken: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_subscriptionId", ["subscriptionId"]) 
		.index("by_mailboxId", ["mailboxId"]) 
		.index("by_tenantId", ["tenantId"]),

	messages: defineTable({
		tenantId: v.string(),
		internetMessageId: v.string(),
		conversationId: v.string(),
		receivedDateTime: v.number(),
		from: v.optional(v.string()),
		to: v.optional(v.array(v.string())),
		cc: v.optional(v.array(v.string())),
		mailboxOwnerId: v.optional(v.id("mailboxes")),
		status: v.optional(v.string()), // 'pending' | 'processed' | 'duplicate'
		createdAt: v.number(),
	})
		.index("by_tenant_internetId", ["tenantId", "internetMessageId"]) 
		.index("by_tenant_conversation_received", ["tenantId", "conversationId", "receivedDateTime"]),

	conversations: defineTable({
		tenantId: v.string(),
		conversationId: v.string(),
		maxReceivedInbound: v.number(),
		updatedAt: v.number(),
	})
		.index("by_tenant_conversation", ["tenantId", "conversationId"]),

	locks: defineTable({
		key: v.string(),
		expiresAt: v.number(),
		createdAt: v.number(),
	})
		.index("by_key", ["key"]),
});
