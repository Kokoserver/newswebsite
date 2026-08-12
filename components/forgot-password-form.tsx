"use client";

import Link from "next/link";
import { useState } from "react";

type ForgotPasswordResponse = {
  message?: string;
  resetUrl?: string;
};

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setResetUrl(null);
    setError(null);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = (await response.json().catch(() => ({}))) as ForgotPasswordResponse;

    setPending(false);

    if (!response.ok) {
      setError(data.message ?? "Could not request a reset link. Please try again.");
      return;
    }

    setMessage(data.message ?? "If an account exists, a reset link has been created.");
    setResetUrl(data.resetUrl ?? null);
  }

  return (
    <form className="auth-form" method="post" onSubmit={handleSubmit}>
      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-notice">{message}</p> : null}
      {resetUrl ? (
        <p className="auth-dev-link">
          Development reset link: <Link href={resetUrl}>Reset password</Link>
        </p>
      ) : null}
      <label>
        Email
        <input
          type="email"
          name="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          maxLength={320}
          autoComplete="email"
        />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? "Creating link…" : "Send reset link"}
      </button>
    </form>
  );
}
