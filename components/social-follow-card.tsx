import { Camera, MessageCircle, Play, Share2, Users } from "lucide-react";

const socialLinks = [
  {
    name: "Facebook",
    href: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://www.facebook.com",
    icon: Users,
  },
  {
    name: "Instagram",
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://www.instagram.com",
    icon: Camera,
  },
  {
    name: "X",
    href: process.env.NEXT_PUBLIC_X_URL ?? "https://x.com",
    icon: Share2,
  },
  {
    name: "YouTube",
    href: process.env.NEXT_PUBLIC_YOUTUBE_URL ?? "https://www.youtube.com",
    icon: Play,
  },
  {
    name: "WhatsApp",
    href: process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "https://www.whatsapp.com",
    icon: MessageCircle,
  },
];

export default function SocialFollowCard() {
  return (
    <section className="social-follow-card" aria-label="Follow THE WORLD CURRENT">
      <h2>Follow us</h2>
      <p>Follow global headlines, video and diaspora stories across social platforms.</p>
      <div>
        {socialLinks.map(({ name, href, icon: Icon }) => (
          <a href={href} key={name} rel="noreferrer" target="_blank" aria-label={`Follow on ${name}`}>
            <Icon size={16} />
            <span>{name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
