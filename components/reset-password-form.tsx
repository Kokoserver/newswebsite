"use client";

import Link from "next/link";
import { useState } from "react";

type ResetPasswordResponse = {
  message?: string;
};

export default function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = (await response.json().catch(() => ({}))) as ResetPasswordResponse;

    setPending(false);

    if (!response.ok) {
      setError(data.message ?? "Could not reset your password. Please request a new link.");
      return;
    }

    setComplete(true);
    setMessage(data.message ?? "Password updated. You can now sign in.");
  }

  return (
    <form className="auth-form" method="post" onSubmit={handleSubmit}>
      {error ? <p className="auth-error">{error}</p> : null}
      {message ? <p className="auth-notice">{message}</p> : null}
      {complete ? (
        <Link className="auth-primary-link" href="/login">
          Continue to sign in
        </Link>
      ) : (
        <>
          <label>
            New password
            <input
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" disabled={pending}>
            {pending ? "Updating…" : "Reset password"}
          </button>
        </>
      )}
    </form>
  );
}
