import Image from "next/image";

export default function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      className={className}
      src="/heritage-voice-news.png"
      alt="HERITAGE VOICE NEWS"
      width={2889}
      height={1221}
      priority={priority}
    />
  );
}
