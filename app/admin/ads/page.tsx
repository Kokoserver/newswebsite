import Image from "next/image";

import { SubmitButton } from "@/components/admin/submit-button";
import { deleteAdvertisement, saveAdvertisement } from "@/src/admin/operations-actions";
import { requireAdminUser } from "@/src/admin/permissions";
import { formatDateTimeLocal, humanize } from "@/src/admin/shared";
import { getAdminAdvertisements, getAdvertisementMediaOptions } from "@/src/db/queries/advertisements";
import { advertisementSlotValues, advertisementStatusValues } from "@/src/db/schema";

type Ad = Awaited<ReturnType<typeof getAdminAdvertisements>>[number];
type MediaOptions = Awaited<ReturnType<typeof getAdvertisementMediaOptions>>;

function AdFields({ ad, mediaOptions }: { ad?: Ad; mediaOptions: MediaOptions }) {
  const now = new Date(); const later = new Date(now.getTime() + 30 * 86400000);
  return <><label>Name<input name="name" required defaultValue={ad?.name ?? ""} /></label><label>Status<select name="status" defaultValue={ad?.status ?? "DRAFT"}>{advertisementStatusValues.map((value) => <option key={value}>{value}</option>)}</select></label><label>Target URL<input name="targetUrl" type="url" required defaultValue={ad?.targetUrl ?? ""} /></label><label>Creative<select name="mediaId" defaultValue={ad?.mediaId ?? ""}><option value="">No creative</option>{mediaOptions.map((item) => <option key={item.id} value={item.id}>{item.title ?? item.altText ?? item.publicUrl}</option>)}</select></label><label>Placement<select name="slot" defaultValue={ad?.slot ?? "HOMEPAGE_TOP"}>{advertisementSlotValues.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label><label>Position<input name="position" type="number" min="1" defaultValue={ad?.position ?? 1} /></label><label>Starts<input name="startsAt" type="datetime-local" required defaultValue={formatDateTimeLocal(ad?.startsAt ?? now)} /></label><label>Ends<input name="endsAt" type="datetime-local" required defaultValue={formatDateTimeLocal(ad?.endsAt ?? later)} /></label></>;
}

export default async function AdsAdminPage() {
  await requireAdminUser("ads:manage");
  const [ads, mediaOptions] = await Promise.all([getAdminAdvertisements(), getAdvertisementMediaOptions()]);
  return <><header className="admin-page-header"><div><span className="admin-eyebrow">Commercial desk</span><h1>Advertisements</h1><p>Schedule creative across homepage, article and category placements.</p></div></header><section className="admin-card admin-form-section"><div className="admin-section-heading"><div><span className="admin-eyebrow">New campaign</span><h2>Create advertisement</h2></div></div><form action={saveAdvertisement.bind(null, null, null)} className="admin-form-grid four"><AdFields mediaOptions={mediaOptions} /><SubmitButton>Create ad</SubmitButton></form></section><section className="admin-ad-list">{ads.map((ad) => <article className="admin-card admin-ad-row" key={`${ad.id}-${ad.assignmentId}`}><div className="admin-ad-creative">{ad.mediaUrl ? <Image src={ad.mediaUrl} alt={ad.mediaAlt ?? ad.name} width={300} height={180} /> : <span>No creative</span>}</div><form action={saveAdvertisement.bind(null, ad.id, ad.assignmentId)} className="admin-form-grid four"><div className="admin-card-title span-four"><strong>{ad.name}</strong><span className={`admin-status ${ad.status.toLowerCase()}`}>{ad.status}</span></div><AdFields ad={ad} mediaOptions={mediaOptions} /><SubmitButton>Save campaign</SubmitButton></form><form action={deleteAdvertisement.bind(null, ad.id)}><SubmitButton danger>Delete</SubmitButton></form></article>)}</section></>;
}
