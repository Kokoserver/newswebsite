"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" className={danger ? "admin-button danger" : "admin-button"} disabled={pending}>{pending ? "Working..." : children}</button>;
}
