"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, danger = false, id }: { children: React.ReactNode; danger?: boolean; id?: string }) {
  const { pending } = useFormStatus();
  return <button id={id} type="submit" className={danger ? "admin-button danger" : "admin-button"} disabled={pending}>{pending ? "Working..." : children}</button>;
}
