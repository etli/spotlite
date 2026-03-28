import { describe, it, expect } from "vitest";
import { pastelizeColor, deriveAccent, hslToString, rgbToHsl, hslToRgb } from "../color";

describe("rgbToHsl", () => {
  it("converts pure red", () => {
    const [h, s, l] = rgbToHsl(255, 0, 0);
    expect(h).toBeCloseTo(0); expect(s).toBeCloseTo(100); expect(l).toBeCloseTo(50);
  });
  it("converts white", () => {
    const [h, s, l] = rgbToHsl(255, 255, 255);
    expect(s).toBeCloseTo(0); expect(l).toBeCloseTo(100);
  });
  it("converts a mid-tone color", () => {
    const [h, s, l] = rgbToHsl(100, 150, 200);
    expect(h).toBeGreaterThan(200); expect(h).toBeLessThan(220);
  });
});

describe("hslToRgb", () => {
  it("round-trips through rgbToHsl", () => {
    const [h, s, l] = rgbToHsl(100, 150, 200);
    const [r, g, b] = hslToRgb(h, s, l);
    expect(r).toBeCloseTo(100, 0); expect(g).toBeCloseTo(150, 0); expect(b).toBeCloseTo(200, 0);
  });
});

describe("pastelizeColor", () => {
  it("clamps dark aggressive colors to pastel range", () => {
    const result = pastelizeColor(139, 0, 0);
    expect(result.s).toBeGreaterThanOrEqual(30); expect(result.s).toBeLessThanOrEqual(50);
    expect(result.l).toBeGreaterThanOrEqual(75); expect(result.l).toBeLessThanOrEqual(85);
  });
  it("clamps already-light colors", () => {
    const result = pastelizeColor(255, 200, 200);
    expect(result.s).toBeGreaterThanOrEqual(30); expect(result.s).toBeLessThanOrEqual(50);
    expect(result.l).toBeGreaterThanOrEqual(75); expect(result.l).toBeLessThanOrEqual(85);
  });
  it("preserves hue", () => {
    const [originalH] = rgbToHsl(0, 100, 200);
    const result = pastelizeColor(0, 100, 200);
    expect(result.h).toBeCloseTo(originalH);
  });
});

describe("deriveAccent", () => {
  it("shifts hue by ~30 degrees", () => {
    const accent = deriveAccent(180, 40, 80);
    expect(accent.h).toBeCloseTo(210);
  });
  it("wraps hue past 360", () => {
    const accent = deriveAccent(350, 40, 80);
    expect(accent.h).toBeCloseTo(20);
  });
});

describe("hslToString", () => {
  it("formats as hsl() string", () => {
    expect(hslToString(210, 40, 80)).toBe("hsl(210, 40%, 80%)");
  });
});
