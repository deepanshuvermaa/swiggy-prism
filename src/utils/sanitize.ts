const PHONE_REGEX = /(\+91[\s-]?)?[6-9]\d{9}/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// no 'g' flag — avoids stateful lastIndex bug when used with .test()
const ADDRESS_MARKERS = /\b(flat|house|floor|street|road|colony|sector|pin\s*code)\b/i;

export function sanitizePrompt(input: string): string {
  let cleaned = input;

  cleaned = cleaned.replace(PHONE_REGEX, "[REDACTED]");
  cleaned = cleaned.replace(EMAIL_REGEX, "[REDACTED]");

  if (ADDRESS_MARKERS.test(cleaned)) {
    cleaned = cleaned
      .split(/[.!?\n]/)
      .filter((sentence) => !ADDRESS_MARKERS.test(sentence))
      .join(". ");
  }

  return cleaned.trim();
}
