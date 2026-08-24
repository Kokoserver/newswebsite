import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/src/db";
import { newsletterCampaigns, newsletterDeliveries, newsletterSubscribers } from "@/src/db/schema";
import { sendNewsletterCampaignEmail } from "@/src/email/templates";

const deliveryBatchSize = 8;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "Email provider rejected the message.";
}

export async function deliverNewsletterCampaign(campaignId: string) {
  const db = await getDb();
  const [campaign] = await db
    .update(newsletterCampaigns)
    .set({ status: "SENDING", startedAt: new Date(), errorSummary: null })
    .where(and(eq(newsletterCampaigns.id, campaignId), eq(newsletterCampaigns.status, "QUEUED")))
    .returning();

  if (!campaign) return;

  try {
    const subscribers = await db.query.newsletterSubscribers.findMany({
      columns: { id: true, email: true },
      where: eq(newsletterSubscribers.status, "ACTIVE"),
    });

    await db
      .update(newsletterCampaigns)
      .set({ recipientCount: subscribers.length })
      .where(eq(newsletterCampaigns.id, campaignId));

    let deliveredCount = 0;
    let failedCount = 0;
    const failures: string[] = [];

    for (let offset = 0; offset < subscribers.length; offset += deliveryBatchSize) {
      const batch = subscribers.slice(offset, offset + deliveryBatchSize);
      const results = await Promise.allSettled(
        batch.map((subscriber) =>
          sendNewsletterCampaignEmail({
            email: subscriber.email,
            subject: campaign.subject,
            previewText: campaign.previewText,
            content: campaign.content,
            articleUrl: campaign.articleUrl,
          }),
        ),
      );

      const sentAt = new Date();
      const deliveries = results.map((result, index) => {
        const subscriber = batch[index];
        if (result.status === "fulfilled") deliveredCount += 1;
        else {
          failedCount += 1;
          if (failures.length < 3) failures.push(errorMessage(result.reason));
        }

        return {
          campaignId,
          subscriberId: subscriber.id,
          email: subscriber.email,
          status: result.status === "fulfilled" ? "SENT" as const : "FAILED" as const,
          error: result.status === "rejected" ? errorMessage(result.reason) : null,
          sentAt: result.status === "fulfilled" ? sentAt : null,
        };
      });

      if (deliveries.length > 0) await db.insert(newsletterDeliveries).values(deliveries);
    }

    const status = failedCount === 0 ? "SENT" : deliveredCount === 0 ? "FAILED" : "PARTIAL";
    await db
      .update(newsletterCampaigns)
      .set({
        status,
        deliveredCount,
        failedCount,
        errorSummary: failures.length > 0 ? failures.join(" | ") : null,
        sentAt: new Date(),
      })
      .where(eq(newsletterCampaigns.id, campaignId));
  } catch (error) {
    await db
      .update(newsletterCampaigns)
      .set({ status: "FAILED", errorSummary: errorMessage(error), sentAt: new Date() })
      .where(eq(newsletterCampaigns.id, campaignId));
    console.error("Newsletter campaign delivery failed.", error);
  }
}
