import { describe, it, expect } from "vitest";
import { parseIntent } from "../src/core/intent-parser.js";

describe("parseIntent", () => {
  it("extracts dish name from known dishes", () => {
    const result = parseIntent("butter chicken for 4, budget 800");
    expect(result.dishName).toBe("butter chicken");
  });

  it("extracts servings from 'for N' pattern", () => {
    const result = parseIntent("biryani for 6 people");
    expect(result.servings).toBe(6);
  });

  it("extracts budget from ₹ prefix", () => {
    const result = parseIntent("paneer tikka ₹500");
    expect(result.budget).toBe(500);
  });

  it("extracts budget from 'rs' prefix", () => {
    const result = parseIntent("dal tadka rs 300");
    expect(result.budget).toBe(300);
  });

  it("extracts time constraint", () => {
    const result = parseIntent("pasta under 20 min");
    expect(result.timeConstraintMin).toBe(20);
  });

  it("detects date occasion", () => {
    const result = parseIntent("romantic dinner for 2");
    expect(result.occasion).toBe("date");
  });

  it("detects quick occasion", () => {
    const result = parseIntent("quick lunch under 15 min");
    expect(result.occasion).toBe("quick");
  });

  it("detects party occasion", () => {
    const result = parseIntent("party food for 8 people budget 3000");
    expect(result.occasion).toBe("party");
    expect(result.servings).toBe(8);
    expect(result.budget).toBe(3000);
  });

  it("defaults to 2 servings when not specified", () => {
    const result = parseIntent("maggi");
    expect(result.servings).toBe(2);
  });

  it("matches longer dish names over shorter ones", () => {
    const result = parseIntent("chicken biryani for 3");
    expect(result.dishName).toBe("chicken biryani");
  });
});
