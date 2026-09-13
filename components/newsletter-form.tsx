"use client";

import { useState } from "react";

type NewsletterMessage = {
  type: "success" | "error" | "info";
  text: string;
};

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<NewsletterMessage | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const response = await fetch("/api/newsletter/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await response.json().catch(() => ({}));

    setPending(false);

    if (!response.ok) {
      setMessage({
        type: "error",
        text: data?.error ?? "Could not subscribe. Please try again.",
      });
      return;
    }

    if (data?.alreadySubscribed) {
      setMessage({
        type: "info",
        text: "You are already subscribed to The Current Brief.",
      });
      return;
    }

    setEmail("");
    setMessage({
      type: "success",
      text: "Thanks! You are now subscribed to The Current Brief.",
    });
  }

  return (
    <form className="newsletter-form" onSubmit={handleSubmit}>
      <input
        aria-label="Email address"
        placeholder="Email address"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        maxLength={320}
        autoComplete="email"
      />
      <button type="submit" disabled={pending}>
        {pending ? "Signing up…" : "Sign up"}
      </button>
      {message ? (
        <p className={`newsletter-status ${message.type}`}>{message.text}</p>
      ) : null}
    </form>
  );
}
