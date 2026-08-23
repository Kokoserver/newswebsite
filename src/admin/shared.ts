import "server-only";

import { auditLogs } from "@/src/db/schema";

export function textValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function optionalText(formData: FormData, key: string) {
  const value = textValue(formData, key);
  return value || null;
}

export function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function dateOrNull(formData: FormData, key: string) {
  const value = textValue(formData, key);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${key} must be a valid date.`);
  return date;
}

export function positiveInteger(formData: FormData, key: string, fallback = 1) {
  const value = Number.parseInt(textValue(formData, key), 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export async function writeAudit(
  db: { insert: (table: typeof auditLogs) => { values: (values: typeof auditLogs.$inferInsert) => Promise<unknown> } },
  input: Omit<typeof auditLogs.$inferInsert, "id" | "createdAt">,
) {
  await db.insert(auditLogs).values(input);
}

export function formatDateTimeLocal(value: Date | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

export function humanize(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/^./, (letter) => letter.toUpperCase());
}

export function dateDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
