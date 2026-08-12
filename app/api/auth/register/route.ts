import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { users } from "@/src/db/schema";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(200),
  email: z.email("Please provide a valid email address.").max(320),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters."),
});

export async function POST(request: Request) {
  const { getDb } = await import("@/src/db");
    const db = await getDb();

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid registration details.";

    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password } = parsed.data;

  const existingUser = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(users.email, email),
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "An account with that email address already exists." },
      { status: 409 },
    );
  }

  const passwordHash = await hash(password, 12);

  const [createdUser] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash,
      role: "READER",
      status: "ACTIVE",
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  return NextResponse.json(
    {
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
      },
    },
    { status: 201 },
  );
}
