/**
 * Strip anything that looks like PII before it hits the LLM.
 * Lightweight — not a security boundary, just a safety net.
 */

const PHONE_REGEX = /(\+91[\s-]?)?[6-9]\d{9}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const ADDRESS_MARKERS = /\b(flat|house|floor|street|road|colony|sector|pin\s*code)\b/gi;

export function sanitizePrompt(input: string): string {
  let cleaned = input;

  cleaned = cleaned.replace(PHONE_REGEX, "[REDACTED]");
  cleaned = cleaned.replace(EMAIL_REGEX, "[REDACTED]");

  // if address-like content detected, strip the whole sentence
  if (ADDRESS_MARKERS.test(cleaned)) {
    cleaned = cleaned
      .split(/[.!?\n]/)
      .filter((sentence) => !ADDRESS_MARKERS.test(sentence))
      .join(". ");
  }

  return cleaned.trim();
}
