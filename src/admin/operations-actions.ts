"use server";

import { createHash, randomBytes } from "node:crypto";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";
import { z } from "zod";

import { requireAdminUser } from "@/src/admin/permissions";
import { checked, dateOrNull, optionalText, positiveInteger, textValue } from "@/src/admin/shared";
import { getSiteUrl } from "@/src/config";
import { getDb } from "@/src/db";
import {
  advertisementAssignments, advertisements, advertisementSlotValues, advertisementStatusValues,
  auditLogs, categories, comments, commentStatusValues, homepageItems, homepageSections,
  homepageSectionKindValues, navbarItems, newsletterSubscribers, newsletterSubscriberStatusValues,
  passwordResetTokens, tags, userRoleValues, users, userStatusValues,
} from "@/src/db/schema";

function invalidateAdmin(path: string, publicPaths: string[] = [], tagsToUpdate: string[] = []) {
  revalidatePath(path); revalidatePath("/admin"); publicPaths.forEach((value) => revalidatePath(value));
  tagsToUpdate.forEach((tag) => updateTag(tag));
}

export async function saveCategory(categoryId: string | null, formData: FormData) {
  const actor = await requireAdminUser("taxonomy:manage");
  const name = z.string().trim().min(2).max(160).parse(textValue(formData, "name"));
  const slug = slugify(optionalText(formData, "slug") ?? name, { lower: true, strict: true });
  const values = { name, slug, description: optionalText(formData, "description"), parentId: optionalText(formData, "parentId"), position: Number.parseInt(textValue(formData, "position"), 10) || 0, isActive: checked(formData, "isActive"), updatedAt: new Date() };
  const db = await getDb();
  await db.transaction(async (tx) => {
    let id = categoryId;
    if (id) await tx.update(categories).set(values).where(eq(categories.id, id));
    else { const [created] = await tx.insert(categories).values(values).returning({ id: categories.id }); id = created.id; }
    await tx.insert(auditLogs).values({ actorId: actor.id, action: categoryId ? "UPDATE" : "CREATE", entityType: "category", entityId: id, summary: `${categoryId ? "Updated" : "Created"} category ${name}`, metadata: {} });
  });
  invalidateAdmin("/admin/taxonomy", ["/", `/section/${slug}`], ["categories", "articles", "homepage"]);
}

export async function saveNavbar(categoryId: string, formData: FormData) {
  const actor = await requireAdminUser("taxonomy:manage");
  const db = await getDb();
  const values = { categoryId, label: z.string().trim().min(1).max(120).parse(textValue(formData, "label")), href: z.string().trim().min(1).max(240).parse(textValue(formData, "href")), position: positiveInteger(formData, "position"), isActive: checked(formData, "isActive"), updatedAt: new Date() };
  await db.transaction(async (tx) => {
    const existing = await tx.query.navbarItems.findFirst({ columns: { id: true }, where: eq(navbarItems.categoryId, categoryId) });
    if (existing) await tx.update(navbarItems).set(values).where(eq(navbarItems.id, existing.id)); else await tx.insert(navbarItems).values(values);
    await tx.insert(auditLogs).values({ actorId: actor.id, action: existing ? "UPDATE" : "CREATE", entityType: "navbar", entityId: categoryId, summary: `Updated navigation item ${values.label}`, metadata: {} });
  });
  invalidateAdmin("/admin/taxonomy", ["/"], ["categories"]);
}

export async function createTag(formData: FormData) {
  const actor = await requireAdminUser("taxonomy:manage");
  const name = z.string().trim().min(1).max(100).parse(textValue(formData, "name"));
  const slug = slugify(optionalText(formData, "slug") ?? name, { lower: true, strict: true });
  const db = await getDb();
  await db.transaction(async (tx) => { const [tag] = await tx.insert(tags).values({ name, slug }).returning({ id: tags.id }); await tx.insert(auditLogs).values({ actorId: actor.id, action: "CREATE", entityType: "tag", entityId: tag.id, summary: `Created tag ${name}`, metadata: {} }); });
  invalidateAdmin("/admin/taxonomy");
}

export async function deleteTag(tagId: string) {
  const actor = await requireAdminUser("taxonomy:manage"); const db = await getDb();
  await db.transaction(async (tx) => { const tag = await tx.query.tags.findFirst({ where: eq(tags.id, tagId) }); await tx.delete(tags).where(eq(tags.id, tagId)); await tx.insert(auditLogs).values({ actorId: actor.id, action: "DELETE", entityType: "tag", entityId: tagId, summary: `Deleted tag ${tag?.name ?? ""}`, metadata: {} }); });
  invalidateAdmin("/admin/taxonomy");
}

export async function saveHomepageSection(sectionId: string | null, formData: FormData) {
  const actor = await requireAdminUser("homepage:manage");
  const values = { key: slugify(textValue(formData, "key") || textValue(formData, "title"), { lower: true, strict: true }), title: z.string().trim().min(1).max(180).parse(textValue(formData, "title")), kind: z.enum(homepageSectionKindValues).parse(textValue(formData, "kind")), position: positiveInteger(formData, "position"), updatedAt: new Date() };
  const db = await getDb();
  await db.transaction(async (tx) => { let id = sectionId; if (id) await tx.update(homepageSections).set(values).where(eq(homepageSections.id, id)); else { const [created] = await tx.insert(homepageSections).values(values).returning({ id: homepageSections.id }); id = created.id; } await tx.insert(auditLogs).values({ actorId: actor.id, action: sectionId ? "UPDATE" : "CREATE", entityType: "homepage_section", entityId: id, summary: `${sectionId ? "Updated" : "Created"} homepage section ${values.title}`, metadata: {} }); });
  invalidateAdmin("/admin/homepage", ["/"], ["homepage"]);
}

export async function deleteHomepageSection(sectionId: string) {
  const actor = await requireAdminUser("homepage:manage"); const db = await getDb();
  await db.transaction(async (tx) => { const section = await tx.query.homepageSections.findFirst({ where: eq(homepageSections.id, sectionId) }); await tx.delete(homepageSections).where(eq(homepageSections.id, sectionId)); await tx.insert(auditLogs).values({ actorId: actor.id, action: "DELETE", entityType: "homepage_section", entityId: sectionId, summary: `Deleted homepage section ${section?.title ?? ""}`, metadata: {} }); });
  invalidateAdmin("/admin/homepage", ["/"], ["homepage"]);
}

export async function saveHomepageItem(itemId: string | null, formData: FormData) {
  const actor = await requireAdminUser("homepage:manage");
  const startsAt = dateOrNull(formData, "startsAt"); const endsAt = dateOrNull(formData, "endsAt"); if (startsAt && endsAt && endsAt <= startsAt) throw new Error("End time must be after start time.");
  const values = { sectionId: z.string().uuid().parse(textValue(formData, "sectionId")), articleId: optionalText(formData, "articleId"), mediaId: optionalText(formData, "mediaId"), titleOverride: optionalText(formData, "titleOverride"), dekOverride: optionalText(formData, "dekOverride"), position: positiveInteger(formData, "position"), startsAt, endsAt };
  if (!values.articleId && !values.mediaId) throw new Error("Choose an article or media item.");
  const db = await getDb(); await db.transaction(async (tx) => { let id = itemId; if (id) await tx.update(homepageItems).set(values).where(eq(homepageItems.id, id)); else { const [created] = await tx.insert(homepageItems).values(values).returning({ id: homepageItems.id }); id = created.id; } await tx.insert(auditLogs).values({ actorId: actor.id, action: itemId ? "UPDATE" : "CREATE", entityType: "homepage_item", entityId: id, summary: `${itemId ? "Updated" : "Created"} homepage placement`, metadata: { sectionId: values.sectionId } }); });
  invalidateAdmin("/admin/homepage", ["/"], ["homepage"]);
}

export async function deleteHomepageItem(itemId: string) { const actor = await requireAdminUser("homepage:manage"); const db = await getDb(); await db.transaction(async (tx) => { await tx.delete(homepageItems).where(eq(homepageItems.id, itemId)); await tx.insert(auditLogs).values({ actorId: actor.id, action: "DELETE", entityType: "homepage_item", entityId: itemId, summary: "Removed homepage placement", metadata: {} }); }); invalidateAdmin("/admin/homepage", ["/"], ["homepage"]); }

export async function moderateComment(commentId: string, formData: FormData) {
  const actor = await requireAdminUser("comments:moderate"); const status = z.enum(commentStatusValues).parse(textValue(formData, "status")); const db = await getDb();
  const articleId = await db.transaction(async (tx) => { const [updated] = await tx.update(comments).set({ status, moderatedById: actor.id, moderatedAt: new Date(), deletedAt: status === "DELETED" ? new Date() : null }).where(eq(comments.id, commentId)).returning({ articleId: comments.articleId }); await tx.insert(auditLogs).values({ actorId: actor.id, articleId: updated?.articleId, action: "UPDATE", entityType: "comment", entityId: commentId, summary: `Marked comment as ${status.toLowerCase()}`, metadata: { status } }); return updated?.articleId; });
  invalidateAdmin("/admin/comments", ["/"]);
  if (articleId) revalidatePath(`/admin/articles/${articleId}/details`);
}

const adSchema = z.object({ name: z.string().trim().min(2).max(200), status: z.enum(advertisementStatusValues), targetUrl: z.url(), mediaId: z.string().uuid().nullable(), slot: z.enum(advertisementSlotValues), position: z.number().int().positive(), startsAt: z.date(), endsAt: z.date() });
export async function saveAdvertisement(adId: string | null, assignmentId: string | null, formData: FormData) {
  const actor = await requireAdminUser("ads:manage"); const startsAt = dateOrNull(formData, "startsAt"); const endsAt = dateOrNull(formData, "endsAt");
  const input = adSchema.parse({ name: textValue(formData, "name"), status: textValue(formData, "status"), targetUrl: textValue(formData, "targetUrl"), mediaId: optionalText(formData, "mediaId"), slot: textValue(formData, "slot"), position: positiveInteger(formData, "position"), startsAt, endsAt }); if (input.endsAt <= input.startsAt) throw new Error("End time must be after start time.");
  const db = await getDb(); await db.transaction(async (tx) => { let id = adId; const adValues = { name: input.name, status: input.status, targetUrl: input.targetUrl, mediaId: input.mediaId, startsAt: input.startsAt, endsAt: input.endsAt }; if (id) await tx.update(advertisements).set(adValues).where(eq(advertisements.id, id)); else { const [created] = await tx.insert(advertisements).values(adValues).returning({ id: advertisements.id }); id = created.id; } const assignment = { advertisementId: id!, slot: input.slot, position: input.position, startsAt: input.startsAt, endsAt: input.endsAt }; if (assignmentId) await tx.update(advertisementAssignments).set(assignment).where(and(eq(advertisementAssignments.id, assignmentId), eq(advertisementAssignments.advertisementId, id!))); else await tx.insert(advertisementAssignments).values(assignment); await tx.insert(auditLogs).values({ actorId: actor.id, action: adId ? "UPDATE" : "CREATE", entityType: "advertisement", entityId: id, summary: `${adId ? "Updated" : "Created"} advertisement ${input.name}`, metadata: { slot: input.slot } }); }); invalidateAdmin("/admin/ads", ["/"], ["advertisements"]);
}
export async function deleteAdvertisement(adId: string) { const actor = await requireAdminUser("ads:manage"); const db = await getDb(); await db.transaction(async (tx) => { const ad = await tx.query.advertisements.findFirst({ where: eq(advertisements.id, adId) }); await tx.delete(advertisements).where(eq(advertisements.id, adId)); await tx.insert(auditLogs).values({ actorId: actor.id, action: "DELETE", entityType: "advertisement", entityId: adId, summary: `Deleted advertisement ${ad?.name ?? ""}`, metadata: {} }); }); invalidateAdmin("/admin/ads", ["/"], ["advertisements"]); }

function newSetupToken() { const token = randomBytes(32).toString("hex"); return { token, tokenHash: createHash("sha256").update(token).digest("hex") }; }
export async function inviteUser(formData: FormData) {
  const actor = await requireAdminUser("users:manage"); const role = z.enum(userRoleValues).parse(textValue(formData, "role")); if (role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") throw new Error("Only a super administrator can assign that role.");
  const email = z.email().parse(textValue(formData, "email").toLowerCase()); const name = z.string().trim().min(2).max(200).parse(textValue(formData, "name")); const setup = newSetupToken(); const db = await getDb();
  const existing = await db.query.users.findFirst({ columns: { id: true }, where: eq(users.email, email) });
  if (existing) redirect(`/admin/users?q=${encodeURIComponent(email)}&existing=${encodeURIComponent(email)}`);
  await db.transaction(async (tx) => { const [created] = await tx.insert(users).values({ email, name, role, status: "INVITED" }).returning({ id: users.id }); await tx.insert(passwordResetTokens).values({ userId: created.id, tokenHash: setup.tokenHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }); await tx.insert(auditLogs).values({ actorId: actor.id, action: "CREATE", entityType: "user", entityId: created.id, summary: `Invited ${name} as ${role}`, metadata: {} }); }); revalidatePath("/admin/users"); redirect(`/admin/users?invite=${encodeURIComponent(`${getSiteUrl()}/reset-password?token=${setup.token}`)}`);
}

export async function updateUser(userId: string, formData: FormData) {
  const actor = await requireAdminUser("users:manage"); const role = z.enum(userRoleValues).parse(textValue(formData, "role")); const status = z.enum(userStatusValues).parse(textValue(formData, "status")); if (userId === actor.id && status !== "ACTIVE") throw new Error("You cannot disable your own account.");
  const db = await getDb(); const target = await db.query.users.findFirst({ where: eq(users.id, userId) }); if (!target) throw new Error("User not found."); if ((target.role === "SUPER_ADMIN" || role === "SUPER_ADMIN") && actor.role !== "SUPER_ADMIN") throw new Error("Only a super administrator can change that account.");
  if (target.role === "SUPER_ADMIN" && (status !== "ACTIVE" || role !== "SUPER_ADMIN")) { const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.role, "SUPER_ADMIN"), eq(users.status, "ACTIVE"), ne(users.id, userId))); if (Number(count) === 0) throw new Error("The last active super administrator cannot be changed."); }
  await db.transaction(async (tx) => { await tx.update(users).set({ name: textValue(formData, "name"), role, status, updatedAt: new Date() }).where(eq(users.id, userId)); await tx.insert(auditLogs).values({ actorId: actor.id, action: "UPDATE", entityType: "user", entityId: userId, summary: `Updated account ${target.email}`, metadata: { role, status } }); }); invalidateAdmin("/admin/users");
}

export async function issueSetupLink(userId: string) { const actor = await requireAdminUser("users:manage"); const setup = newSetupToken(); const db = await getDb(); await db.transaction(async (tx) => { await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.userId, userId), sql`${passwordResetTokens.usedAt} IS NULL`)); await tx.insert(passwordResetTokens).values({ userId, tokenHash: setup.tokenHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) }); await tx.insert(auditLogs).values({ actorId: actor.id, action: "UPDATE", entityType: "user", entityId: userId, summary: "Issued a password setup link", metadata: {} }); }); redirect(`/admin/users?invite=${encodeURIComponent(`${getSiteUrl()}/reset-password?token=${setup.token}`)}`); }

export async function updateSubscriber(subscriberId: string, formData: FormData) { const actor = await requireAdminUser("subscribers:manage"); const status = z.enum(newsletterSubscriberStatusValues).parse(textValue(formData, "status")); const db = await getDb(); await db.transaction(async (tx) => { await tx.update(newsletterSubscribers).set({ status, confirmedAt: status === "ACTIVE" ? new Date() : null, unsubscribedAt: status === "UNSUBSCRIBED" ? new Date() : null }).where(eq(newsletterSubscribers.id, subscriberId)); await tx.insert(auditLogs).values({ actorId: actor.id, action: "UPDATE", entityType: "subscriber", entityId: subscriberId, summary: `Changed subscriber status to ${status}`, metadata: {} }); }); invalidateAdmin("/admin/subscribers"); }
export async function deleteSubscriber(subscriberId: string) { const actor = await requireAdminUser("subscribers:manage"); const db = await getDb(); await db.transaction(async (tx) => { const subscriber = await tx.query.newsletterSubscribers.findFirst({ where: eq(newsletterSubscribers.id, subscriberId) }); await tx.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, subscriberId)); await tx.insert(auditLogs).values({ actorId: actor.id, action: "DELETE", entityType: "subscriber", entityId: subscriberId, summary: `Deleted subscriber ${subscriber?.email ?? ""}`, metadata: {} }); }); invalidateAdmin("/admin/subscribers"); }
