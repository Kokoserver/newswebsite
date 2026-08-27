import Image from "next/image";

type Advertisement = {
  id: string;
  name: string;
  targetUrl: string;
  mediaUrl: string | null;
  mediaAlt: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
};

export default function AdvertisementSlot({
  ad,
  label = "Advertisement",
  variant = "billboard",
}: {
  ad?: Advertisement | null;
  label?: string;
  variant?: "billboard" | "rail" | "strip";
}) {
  const content = ad?.mediaUrl ? (
    <Image
      src={ad.mediaUrl}
      alt={ad.mediaAlt ?? ad.name}
      width={ad.mediaWidth ?? 1200}
      height={ad.mediaHeight ?? 320}
      sizes={variant === "rail" ? "(max-width: 1020px) 50vw, 300px" : "(max-width: 1120px) 100vw, 1120px"}
    />
  ) : (
    <strong>THE WORLD CURRENT</strong>
  );

  return (
    <aside className={`ad-module ${variant}`} aria-label={label}>
      {ad ? (
        <a href={ad.targetUrl} rel="nofollow noreferrer" target="_blank">
          {content}
        </a>
      ) : (
        <div>{content}</div>
      )}
    </aside>
  );
}
