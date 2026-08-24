import "server-only";

import nodemailer, { type Transporter } from "nodemailer9";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
};

const globalForEmail = globalThis as unknown as { emailTransporter?: Transporter };

export function emailConfigured() {
  return Boolean(process.env.EMAIL_SMTP_HOST && process.env.EMAIL_FROM);
}

function getTransporter() {
  if (!emailConfigured()) {
    throw new Error("Email delivery is not configured.");
  }

  if (globalForEmail.emailTransporter) return globalForEmail.emailTransporter;

  const port = Number.parseInt(process.env.EMAIL_SMTP_PORT ?? "587", 10);
  const user = process.env.EMAIL_SMTP_USER;
  const password = process.env.EMAIL_SMTP_PASSWORD;
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: Number.isFinite(port) ? port : 587,
    secure: process.env.EMAIL_SMTP_SECURE === "true",
    auth: user && password ? { user, pass: password } : undefined,
  });

  if (process.env.NODE_ENV !== "production") globalForEmail.emailTransporter = transporter;
  return transporter;
}

export async function sendEmail(message: EmailMessage) {
  return getTransporter().sendMail({
    ...message,
    from: process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO || undefined,
  });
}
