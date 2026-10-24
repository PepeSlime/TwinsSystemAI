import { describe, expect, it } from "vitest";
import { calculateScale, parseHeight, round3 } from "./scale";

describe("escala R6", () => {
  it("1,85 m → 6,607 studs e escala 1,321", () => {
    const r = calculateScale(1.85);
    expect(round3(r.studs)).toBe(6.607);
    expect(round3(r.scale)).toBe(1.321);
  });
  it("escala uniforme em X/Y/Z", () => {
    const r = calculateScale(1.85);
    const head = r.parts[0]!;
    expect(head.scaled[0]).toBeCloseTo(2 * r.scale);
    expect(head.scaled[1]).toBeCloseTo(1 * r.scale);
  });
  it("aceita metros com vírgula e centímetros", () => {
    expect(parseHeight("1,85")).toBe(1.85);
    expect(parseHeight("185")).toBe(1.85);
  });
  it("avisa fora de 0,5–3 m", () => {
    expect(calculateScale(0.4).warnings.length).toBeGreaterThan(0);
    expect(calculateScale(3.2).warnings.length).toBeGreaterThan(0);
    expect(calculateScale(1.8).warnings.length).toBe(0);
  });
});
