import { describe, it, expect } from "vitest";
import { sanitizePrompt } from "../src/utils/sanitize.js";

describe("sanitizePrompt", () => {
  it("strips phone numbers", () => {
    const input = "make dal for 4, call me at 9876543210";
    const result = sanitizePrompt(input);
    expect(result).not.toContain("9876543210");
    expect(result).toContain("dal");
  });

  it("strips +91 prefixed numbers", () => {
    const result = sanitizePrompt("paneer recipe, contact +91-9876543210");
    expect(result).not.toContain("9876543210");
  });

  it("strips emails", () => {
    const input = "butter chicken recipe, email: user@example.com";
    const result = sanitizePrompt(input);
    expect(result).not.toContain("user@example.com");
  });

  it("strips address-like sentences", () => {
    const input = "paneer tikka. deliver to flat 302 sector 5. for 4 people";
    const result = sanitizePrompt(input);
    expect(result).not.toContain("flat 302");
    expect(result).toContain("paneer tikka");
  });

  it("leaves clean prompts unchanged", () => {
    const input = "butter chicken for 4 people under 800 rupees";
    expect(sanitizePrompt(input)).toBe(input);
  });

  it("handles repeated calls without regex state leak", () => {
    const addr1 = "deliver to flat 5. make dal";
    const addr2 = "send to road 12. cook rice";

    const r1 = sanitizePrompt(addr1);
    const r2 = sanitizePrompt(addr2);

    expect(r1).not.toContain("flat 5");
    expect(r2).not.toContain("road 12");
    expect(r1).toContain("dal");
    expect(r2).toContain("rice");
  });
});
