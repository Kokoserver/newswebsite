export function firstImageSrcFromHtml(html: string | null | undefined) {
  if (!html) return null;

  const quotedMatch = html.match(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i);
  const unquotedMatch = html.match(/<img\b[^>]*\bsrc\s*=\s*([^"'\s>]+)/i);
  const src = quotedMatch?.[2] ?? unquotedMatch?.[1] ?? null;

  return src?.trim() || null;
}
