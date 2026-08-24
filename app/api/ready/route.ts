export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { getDb } = await import("@/src/db");
    const db = await getDb();
    await Promise.race([
      db.$client.execute("select 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Readiness timed out")), 3_000)),
    ]);
    return Response.json(
      { status: "ready", timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable", timestamp: new Date().toISOString() },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
