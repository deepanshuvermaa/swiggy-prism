import { describe, it, expect } from "vitest";
import { normalize, convertToUnit } from "../src/utils/units.js";

describe("normalize", () => {
  it("converts kg to g", () => {
    const result = normalize(2, "kg");
    expect(result).toEqual({ quantity: 2000, unit: "g" });
  });

  it("converts liters to ml", () => {
    const result = normalize(1.5, "l");
    expect(result).toEqual({ quantity: 1500, unit: "ml" });
  });

  it("converts cups to ml", () => {
    const result = normalize(1, "cup");
    expect(result).toEqual({ quantity: 240, unit: "ml" });
  });

  it("converts tbsp to ml", () => {
    const result = normalize(2, "tbsp");
    expect(result).toEqual({ quantity: 30, unit: "ml" });
  });

  it("passes through grams unchanged", () => {
    const result = normalize(500, "g");
    expect(result).toEqual({ quantity: 500, unit: "g" });
  });

  it("normalizes piece units", () => {
    const result = normalize(6, "pcs");
    expect(result).toEqual({ quantity: 6, unit: "pcs" });
  });

  it("passes unknown units through", () => {
    const result = normalize(3, "bunch");
    expect(result).toEqual({ quantity: 3, unit: "bunch" });
  });
});

describe("convertToUnit", () => {
  it("converts grams to kg-equivalent", () => {
    const result = convertToUnit(2000, "g", "kg");
    expect(result).toBe(2);
  });

  it("returns original for incompatible units", () => {
    const result = convertToUnit(500, "g", "ml");
    expect(result).toBe(500);
  });
});
