import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { getAuthSecret } from "@/src/config";
import { users } from "@/src/db/schema";

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const { getDb } = await import("@/src/db");
    const db = await getDb();

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user?.passwordHash || user.status !== "ACTIVE") {
          return null;
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? "";
        session.user.role = token.role as string | undefined;
      }

      return session;
    },
  },
};
