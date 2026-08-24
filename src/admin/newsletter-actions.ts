"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";

import { requireAdminUser } from "@/src/admin/permissions";
import { optionalText, textValue } from "@/src/admin/shared";
import { getDb } from "@/src/db";
import { auditLogs, newsletterCampaigns, newsletterSubscribers } from "@/src/db/schema";
import { emailConfigured } from "@/src/email";
import { deliverNewsletterCampaign } from "@/src/newsletter/delivery";

const optionalUrl = z.union([
  z.literal(""),
  z.url().max(2_000).refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "The featured article URL must use HTTP or HTTPS.",
  }),
]);

export async function createNewsletterCampaign(formData: FormData) {
  const actor = await requireAdminUser("subscribers:manage");
  if (!emailConfigured()) throw new Error("Configure SMTP email delivery before sending a newsletter.");

  const values = {
    subject: z.string().trim().min(5).max(160).parse(textValue(formData, "subject")),
    previewText: optionalText(formData, "previewText"),
    content: z.string().trim().min(10).max(10_000).parse(textValue(formData, "content")),
    articleUrl: optionalUrl.parse(textValue(formData, "articleUrl")) || null,
  };
  if (values.previewText && values.previewText.length > 240) {
    throw new Error("Preview text must be 240 characters or fewer.");
  }

  const db = await getDb();
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as integer)` })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.status, "ACTIVE"));
  if (Number(count) === 0) throw new Error("There are no active subscribers to receive this campaign.");

  const campaign = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(newsletterCampaigns)
      .values({ ...values, createdById: actor.id, recipientCount: Number(count) })
      .returning({ id: newsletterCampaigns.id });
    await tx.insert(auditLogs).values({
      actorId: actor.id,
      action: "CREATE",
      entityType: "newsletter_campaign",
      entityId: created.id,
      summary: `Queued newsletter campaign ${values.subject}`,
      metadata: { recipientCount: Number(count) },
    });
    return created;
  });

  after(async () => {
    await deliverNewsletterCampaign(campaign.id);
  });
  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers?campaign=queued");
}
