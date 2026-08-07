import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const timeoutMs = Number.parseInt(process.env.DATABASE_WAIT_TIMEOUT_MS ?? "60000", 10);
const startedAt = Date.now();

while (Date.now() - startedAt < timeoutMs) {
  const connection = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 5,
    prepare: false,
  });

  try {
    await connection`select 1`;
    await connection.end();
    process.exit(0);
  } catch {
    await connection.end({ timeout: 1 }).catch(() => undefined);
    console.log("PostgreSQL is not ready yet.");
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

throw new Error(`PostgreSQL did not become available within ${timeoutMs}ms`);
