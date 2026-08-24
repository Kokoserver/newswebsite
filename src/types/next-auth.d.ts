import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    expiresAt: number;
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: string;
    sessionExpiresAt?: number;
  }
}
