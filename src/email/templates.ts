import "server-only";

import { sendEmail } from "@/src/email";
import { createNewsletterUnsubscribeUrl } from "@/src/newsletter/unsubscribe";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p style="margin:0 0 18px;line-height:1.65">${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`)
    .join("");
}

function emailLayout(content: string, previewText?: string | null) {
  const preview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(previewText)}</div>`
    : "";

  return `<!doctype html><html><body style="margin:0;background:#eef2f5;color:#172536;font-family:Arial,sans-serif">${preview}<div style="max-width:640px;margin:0 auto;padding:32px 16px"><div style="background:#082338;color:#fff;padding:20px 28px;font-family:Georgia,serif;font-size:22px">THE WORLD CURRENT</div><main style="background:#fff;padding:32px 28px;border:1px solid #d9e1e8">${content}</main></div></body></html>`;
}

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const safeUrl = escapeHtml(resetUrl);
  return sendEmail({
    to: email,
    subject: "Reset your THE WORLD CURRENT password",
    text: `A password reset was requested for your account. Use this link within one hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: emailLayout(`<h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:28px">Reset your password</h1><p style="line-height:1.65">Use the secure link below within one hour to choose a new password.</p><p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;background:#0874c9;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p><p style="margin:0;color:#627384;font-size:13px;line-height:1.6">If you did not request this, no action is required.</p>`),
  });
}

export async function sendNewsletterWelcomeEmail(email: string) {
  const unsubscribeUrl = createNewsletterUnsubscribeUrl(email);
  return sendEmail({
    to: email,
    subject: "Welcome to THE WORLD CURRENT newsletter",
    text: `Your subscription is active. You will receive the latest reporting from THE WORLD CURRENT.\n\nUnsubscribe: ${unsubscribeUrl}`,
    html: emailLayout(`<h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:28px">You are subscribed</h1><p style="line-height:1.65">You will now receive the latest reporting and newsroom updates from THE WORLD CURRENT.</p><p style="margin:28px 0 0;color:#627384;font-size:12px"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#526b7d">Unsubscribe</a></p>`),
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
  });
}

type NewsletterCampaignMessage = {
  email: string;
  subject: string;
  previewText: string | null;
  content: string;
  articleUrl: string | null;
};

export async function sendNewsletterCampaignEmail(message: NewsletterCampaignMessage) {
  const unsubscribeUrl = createNewsletterUnsubscribeUrl(message.email);
  const articleLink = message.articleUrl
    ? `<p style="margin:26px 0"><a href="${escapeHtml(message.articleUrl)}" style="display:inline-block;padding:12px 18px;background:#0874c9;color:#fff;text-decoration:none;font-weight:700">Read the full story</a></p>`
    : "";
  const textArticle = message.articleUrl ? `\n\nRead the full story: ${message.articleUrl}` : "";

  return sendEmail({
    to: message.email,
    subject: message.subject,
    text: `${message.content}${textArticle}\n\nUnsubscribe: ${unsubscribeUrl}`,
    html: emailLayout(`${paragraphs(message.content)}${articleLink}<p style="margin:28px 0 0;padding-top:18px;border-top:1px solid #e3e8ec;color:#627384;font-size:12px"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#526b7d">Unsubscribe</a></p>`, message.previewText),
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
  });
}
