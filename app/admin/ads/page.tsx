import Image from "next/image";
import Link from "next/link";

import InfoTooltip from "@/components/admin/info-tooltip";
import MediaPickerField from "@/components/admin/media-picker-field";
import { SubmitButton } from "@/components/admin/submit-button";
import { deleteAdvertisement, saveAdvertisement } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { formatDateTimeLocal, humanize } from "@/src/admin/shared";
import {
  getAdminAdvertisementCount,
  getAdminAdvertisements,
} from "@/src/db/queries/advertisements";
import { advertisementSlotValues, advertisementStatusValues } from "@/src/db/schema";

const pageSize = 10;

type Ad = Awaited<ReturnType<typeof getAdminAdvertisements>>[number];

function AdFields({ ad }: { ad?: Ad }) {
  const now = new Date();
  const later = new Date(now.getTime() + 30 * 86_400_000);

  return (
    <>
      <label>Name<input name="name" required defaultValue={ad?.name ?? ""} /></label>
      <label>
        Status
        <select name="status" defaultValue={ad?.status ?? "DRAFT"}>
          {advertisementStatusValues.map((value) => <option key={value}>{value}</option>)}
        </select>
      </label>
      <label>Target URL<input name="targetUrl" type="url" required defaultValue={ad?.targetUrl ?? ""} /></label>
      <MediaPickerField name="mediaId" label="Creative" kind="IMAGE" initialId={ad?.mediaId} />
      <label>
        Placement
        <select name="slot" defaultValue={ad?.slot ?? "HOMEPAGE_TOP"}>
          {advertisementSlotValues.map((value) => (
            <option key={value} value={value}>{humanize(value)}</option>
          ))}
        </select>
      </label>
      <label>Position<input name="position" type="number" min="1" defaultValue={ad?.position ?? 1} /></label>
      <label>
        Starts
        <input
          name="startsAt"
          type="datetime-local"
          required
          defaultValue={formatDateTimeLocal(ad?.startsAt ?? now)}
        />
      </label>
      <label>
        Ends
        <input
          name="endsAt"
          type="datetime-local"
          required
          defaultValue={formatDateTimeLocal(ad?.endsAt ?? later)}
        />
      </label>
    </>
  );
}

export default async function AdsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdminUser("ads:manage");
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const [ads, total] = await Promise.all([
    getAdminAdvertisements(pageSize, (page - 1) * pageSize),
    getAdminAdvertisementCount(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstResult = ads.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastResult = Math.min(page * pageSize, total);

  return (
    <>
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Commercial desk</span>
          <h1>Advertisements</h1>
          <p>Schedule creative across homepage, article and category placements.</p>
        </div>
      </header>

      <section className="admin-card admin-form-section">
        <div className="admin-section-heading">
          <div><span className="admin-eyebrow">New campaign</span><h2>Create advertisement <InfoTooltip text="Choose a creative, placement and display window. Draft campaigns remain hidden; active campaigns display only while their schedule is valid." /></h2></div>
        </div>
        <form action={saveAdvertisement.bind(null, null, null)} className="admin-form-grid four">
          <AdFields />
          <SubmitButton>Create ad</SubmitButton>
        </form>
      </section>

      <section className="admin-ad-list">
        {ads.map((ad) => (
          <article className="admin-card admin-ad-row" key={`${ad.id}-${ad.assignmentId}`}>
            <div className="admin-ad-creative">
              {ad.mediaUrl ? (
                <Image src={ad.mediaUrl} alt={ad.mediaAlt ?? ad.name} width={300} height={180} />
              ) : <span>No creative</span>}
            </div>
            <form
              action={saveAdvertisement.bind(null, ad.id, ad.assignmentId)}
              className="admin-form-grid four"
            >
              <div className="admin-card-title span-four">
                <strong>{ad.name}</strong>
                <span className={`admin-status ${ad.status.toLowerCase()}`}>{humanize(ad.status)}</span>
              </div>
              <AdFields ad={ad} />
              <SubmitButton>Save campaign</SubmitButton>
            </form>
            <form action={deleteAdvertisement.bind(null, ad.id)}>
              <SubmitButton danger>Delete</SubmitButton>
            </form>
          </article>
        ))}
      </section>

      {ads.length === 0 ? <p className="admin-empty admin-card">No advertisements found.</p> : null}

      <nav className="admin-pagination" aria-label="Advertisement pages">
        <Link aria-disabled={page <= 1} href={`/admin/ads?page=${Math.max(1, page - 1)}`}>
          Previous
        </Link>
        <span>
          Showing campaigns {firstResult}-{lastResult} of {total.toLocaleString()} · Page {page} of {totalPages}
        </span>
        <Link aria-disabled={page >= totalPages} href={`/admin/ads?page=${page + 1}`}>
          Next
        </Link>
      </nav>
    </>
  );
}
