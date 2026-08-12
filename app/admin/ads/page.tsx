import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getAdminAdvertisements,
  getAdvertisementMediaOptions,
} from "@/src/db/queries/advertisements";
import { advertisementAssignments, advertisements } from "@/src/db/schema";
import { getSession } from "@/src/session";

export const dynamic = "force-dynamic";

const adStatuses = ["DRAFT", "ACTIVE", "PAUSED", "EXPIRED"] as const;
const adSlots = [
  "HOMEPAGE_TOP",
  "HOMEPAGE_MIDDLE",
  "ARTICLE_INLINE",
  "ARTICLE_SIDEBAR",
  "CATEGORY_TOP",
] as const;

function canManageAds(role?: string) {
  return role === "SUPER_ADMIN" || role === "ADMIN" || role === "EDITOR";
}

async function requireAdManager() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!canManageAds(session.user.role)) {
    throw new Error("Forbidden");
  }

  return session;
}

function stringValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalStringValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  return value.length > 0 ? value : null;
}

function dateValue(formData: FormData, key: string) {
  const value = stringValue(formData, key);
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${key} is required`);
  }

  return date;
}

function numberValue(formData: FormData, key: string) {
  const value = Number.parseInt(stringValue(formData, key), 10);

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${key} must be a positive number`);
  }

  return value;
}

function statusValue(formData: FormData) {
  const status = stringValue(formData, "status");

  if (!adStatuses.includes(status as (typeof adStatuses)[number])) {
    throw new Error("Invalid status");
  }

  return status as (typeof adStatuses)[number];
}

function slotValue(formData: FormData) {
  const slot = stringValue(formData, "slot");

  if (!adSlots.includes(slot as (typeof adSlots)[number])) {
    throw new Error("Invalid slot");
  }

  return slot as (typeof adSlots)[number];
}

function adValues(formData: FormData) {
  const startsAt = dateValue(formData, "startsAt");
  const endsAt = dateValue(formData, "endsAt");

  if (endsAt <= startsAt) {
    throw new Error("End date must be after start date");
  }

  return {
    name: stringValue(formData, "name"),
    status: statusValue(formData),
    targetUrl: stringValue(formData, "targetUrl"),
    mediaId: optionalStringValue(formData, "mediaId"),
    startsAt,
    endsAt,
    slot: slotValue(formData),
    position: numberValue(formData, "position"),
  };
}

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function prettySlot(slot: string | null) {
  return (slot ?? "UNASSIGNED").replaceAll("_", " ").toLowerCase();
}

async function createAdvertisement(formData: FormData) {
  "use server";

  await requireAdManager();
  const values = adValues(formData);
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  const [ad] = await db
    .insert(advertisements)
    .values({
      name: values.name,
      status: values.status,
      targetUrl: values.targetUrl,
      mediaId: values.mediaId,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
    })
    .returning({ id: advertisements.id });

  await db.insert(advertisementAssignments).values({
    advertisementId: ad.id,
    slot: values.slot,
    position: values.position,
    startsAt: values.startsAt,
    endsAt: values.endsAt,
  });

  revalidatePath("/");
  revalidatePath("/admin/ads");
}

async function updateAdvertisement(adId: string, assignmentId: string | null, formData: FormData) {
  "use server";

  await requireAdManager();
  const values = adValues(formData);
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  await db
    .update(advertisements)
    .set({
      name: values.name,
      status: values.status,
      targetUrl: values.targetUrl,
      mediaId: values.mediaId,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
    })
    .where(eq(advertisements.id, adId));

  if (assignmentId) {
    await db
      .update(advertisementAssignments)
      .set({
        slot: values.slot,
        position: values.position,
        startsAt: values.startsAt,
        endsAt: values.endsAt,
      })
      .where(
        and(
          eq(advertisementAssignments.id, assignmentId),
          eq(advertisementAssignments.advertisementId, adId),
        ),
      );
  } else {
    await db.insert(advertisementAssignments).values({
      advertisementId: adId,
      slot: values.slot,
      position: values.position,
      startsAt: values.startsAt,
      endsAt: values.endsAt,
    });
  }

  revalidatePath("/");
  revalidatePath("/admin/ads");
}

async function deleteAdvertisement(adId: string) {
  "use server";

  await requireAdManager();
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  await db.delete(advertisements).where(eq(advertisements.id, adId));

  revalidatePath("/");
  revalidatePath("/admin/ads");
}

function AdForm({
  action,
  mediaOptions,
  submitLabel,
  ad,
  defaultStartsAt,
  defaultEndsAt,
}: {
  action: (formData: FormData) => Promise<void>;
  mediaOptions: Awaited<ReturnType<typeof getAdvertisementMediaOptions>>;
  submitLabel: string;
  ad?: Awaited<ReturnType<typeof getAdminAdvertisements>>[number];
  defaultStartsAt?: Date;
  defaultEndsAt?: Date;
}) {
  const startsAt = ad?.startsAt ?? defaultStartsAt;
  const endsAt = ad?.endsAt ?? defaultEndsAt;

  return (
    <form className="admin-ad-form" action={action}>
      <label>
        Name
        <input name="name" required maxLength={200} defaultValue={ad?.name ?? ""} />
      </label>
      <label>
        Status
        <select name="status" defaultValue={ad?.status ?? "DRAFT"}>
          {adStatuses.map((status) => (
            <option value={status} key={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="wide">
        Target URL
        <input name="targetUrl" required type="url" defaultValue={ad?.targetUrl ?? ""} />
      </label>
      <label>
        Slot
        <select name="slot" defaultValue={ad?.slot ?? "HOMEPAGE_TOP"}>
          {adSlots.map((slot) => (
            <option value={slot} key={slot}>
              {prettySlot(slot)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Position
        <input name="position" required type="number" min={1} defaultValue={ad?.position ?? 1} />
      </label>
      <label>
        Starts at
        <input
          name="startsAt"
          required
          type="datetime-local"
          defaultValue={startsAt ? toDateTimeLocal(startsAt) : ""}
        />
      </label>
      <label>
        Ends at
        <input
          name="endsAt"
          required
          type="datetime-local"
          defaultValue={endsAt ? toDateTimeLocal(endsAt) : ""}
        />
      </label>
      <label className="wide">
        Creative media
        <select name="mediaId" defaultValue={ad?.mediaId ?? ""}>
          <option value="">No media / placeholder</option>
          {mediaOptions.map((item) => (
            <option value={item.id} key={item.id}>
              {item.title ?? item.altText ?? item.publicUrl}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">{submitLabel}</button>
    </form>
  );
}

export default async function AdsAdminPage() {
  await requireAdManager();
  const [ads, mediaOptions] = await Promise.all([
    getAdminAdvertisements(),
    getAdvertisementMediaOptions(),
  ]);
  const defaultStartsAt = new Date();
  const defaultEndsAt = new Date(defaultStartsAt.getTime() + 30 * 24 * 60 * 60 * 1000);

  return (
    <main className="route-page admin-ads-page">
      <div className="route-header">
        <Link href="/" className="route-brand">
          Daily Chronicle
        </Link>
        <Link href="/">View site</Link>
      </div>

      <p className="route-kicker">Admin</p>
      <h1>Advertisements</h1>
      <p>Create, update, pause, and delete ad placements used across the homepage and article/category slots.</p>

      <section className="admin-panel">
        <h2>Create advertisement</h2>
        <AdForm
          action={createAdvertisement}
          mediaOptions={mediaOptions}
          submitLabel="Create ad"
          defaultStartsAt={defaultStartsAt}
          defaultEndsAt={defaultEndsAt}
        />
      </section>

      <section className="admin-panel">
        <h2>Existing advertisements</h2>
        <div className="admin-ad-list">
          {ads.map((ad) => {
            const updateAction = updateAdvertisement.bind(null, ad.id, ad.assignmentId);
            const deleteAction = deleteAdvertisement.bind(null, ad.id);

            return (
              <article className="admin-ad-card" key={`${ad.id}-${ad.assignmentId ?? "none"}`}>
                <div className="admin-ad-preview">
                  {ad.mediaUrl ? (
                    <Image
                      src={ad.mediaUrl}
                      alt={ad.mediaAlt ?? ad.name}
                      width={320}
                      height={180}
                      sizes="220px"
                    />
                  ) : (
                    <span>No creative</span>
                  )}
                </div>
                <div className="admin-ad-card-body">
                  <div className="admin-ad-title-row">
                    <h3>{ad.name}</h3>
                    <span className={`ad-status ${ad.status.toLowerCase()}`}>{ad.status}</span>
                  </div>
                  <p>
                    {prettySlot(ad.slot)} · position {ad.position ?? 1}
                  </p>
                  <AdForm
                    action={updateAction}
                    mediaOptions={mediaOptions}
                    submitLabel="Save changes"
                    ad={ad}
                  />
                  <form action={deleteAction} className="admin-delete-form">
                    <button type="submit">Delete ad</button>
                  </form>
                </div>
              </article>
            );
          })}
          {ads.length === 0 ? <p>No advertisements yet.</p> : null}
        </div>
      </section>
    </main>
  );
}
