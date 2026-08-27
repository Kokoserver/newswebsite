import Image from "next/image";

export default function BrandLogo({
  className,
  priority = false,
  variant = "default",
}: {
  className?: string;
  priority?: boolean;
  variant?: "default" | "dark";
}) {
  return (
    <Image
      className={className}
      src={variant === "dark" ? "/world-current-logo-dark.svg" : "/world-current-logo.svg"}
      alt="THE WORLD CURRENT"
      width={1500}
      height={600}
      priority={priority}
    />
  );
}
