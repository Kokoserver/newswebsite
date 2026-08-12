import NextAuth from "next-auth";

import { authOptions } from "@/src/auth";
import { getAuthSecret, getSiteUrl } from "@/src/config";

process.env.NEXTAUTH_URL ??= getSiteUrl();
process.env.NEXTAUTH_SECRET ??= getAuthSecret();

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
