import { cache } from "react";

import { getServerSession } from "next-auth";

import { authOptions } from "@/src/auth";

export const getSession = cache(async () => getServerSession(authOptions));
