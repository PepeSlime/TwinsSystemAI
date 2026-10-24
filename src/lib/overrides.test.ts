import { describe, it, expect } from "vitest";
import {
  parseOverridesPython,
  formatOverridesPython,
  sanitizeColor,
  sanitizeClamped,
  validateOverrides,
} from "./overrides";

describe("overrides.ts", () => {
  it("sanitizes colors correctly per Roblox guidelines", () => {
    expect(sanitizeColor("#000000")).toBe("#111111");
    expect(sanitizeColor("#FFFFFF")).toBe("#F2F2F2");
    expect(sanitizeColor("#d4a017")).toBe("#D4A017");
    expect(sanitizeColor("f1c9a5")).toBe("#F1C9A5");
    expect(sanitizeColor("#FFF")).toBe("#F2F2F2");
    expect(sanitizeColor("invalid")).toBe("#111111");
  });

  it("clamps and rounds metallic and roughness to 2 decimals", () => {
    expect(sanitizeClamped(0.556)).toBe(0.56);
    expect(sanitizeClamped(1.5)).toBe(1.0);
    expect(sanitizeClamped(-0.2)).toBe(0.0);
    expect(sanitizeClamped("0.35")).toBe(0.35);
  });

  it("parses blender overrides python block accurately", () => {
    const pythonInput = `
OVERRIDES = {
    "Metal048C_1K-PNG_NORMAL": {"color": "#C0C0C0", "metallic": 0.50, "roughness": 0.50},
    "Skin": {"color": "#FFFFFF", "metallic": 0.00, "roughness": 0.50},
    'Armor_Gold': {'color': '#D4A017', 'metallic': 1.0, 'roughness': 0.3},
}
`;
    const res = parseOverridesPython(pythonInput);
    expect(res.success).toBe(true);
    expect(res.overrides).toBeDefined();
    expect(Object.keys(res.overrides!)).toEqual([
      "Metal048C_1K-PNG_NORMAL",
      "Skin",
      "Armor_Gold",
    ]);

    expect(res.overrides!["Skin"]?.color).toBe("#F2F2F2");
    expect(res.overrides!["Armor_Gold"]?.metallic).toBe(1.0);
    expect(res.overrides!["Armor_Gold"]?.roughness).toBe(0.3);
  });

  it("validates that output matches input keys strictly", () => {
    const input = {
      Skin: { color: "#FFFFFF", metallic: 0.0, roughness: 0.5 },
      Armor: { color: "#C0C0C0", metallic: 1.0, roughness: 0.3 },
    };

    // Missing key
    const missingRes = validateOverrides(input, {
      Skin: { color: "#F1C9A5", metallic: 0.0, roughness: 0.6 },
    });
    expect(missingRes.valid).toBe(false);
    expect(missingRes.errors[0]).toContain("Chaves faltantes");

    // Extra / renamed key
    const extraRes = validateOverrides(input, {
      Skin: { color: "#F1C9A5", metallic: 0.0, roughness: 0.6 },
      Armor_Renamed: { color: "#D4A017", metallic: 1.0, roughness: 0.3 },
    });
    expect(extraRes.valid).toBe(false);

    // Exact keys
    const validRes = validateOverrides(input, {
      Skin: { color: "#F1C9A5", metallic: 0.0, roughness: 0.6 },
      Armor: { color: "#D4A017", metallic: 1.0, roughness: 0.3 },
    });
    expect(validRes.valid).toBe(true);
    expect(validRes.validated!["Skin"]?.color).toBe("#F1C9A5");
  });

  it("formats python output cleanly for blender script", () => {
    const overrides = {
      Armadura_Ouro: { color: "#D4A017", metallic: 1.0, roughness: 0.3 },
      Pele: { color: "#F1C9A5", metallic: 0.0, roughness: 0.6 },
    };

    const python = formatOverridesPython(overrides);
    expect(python).toBe(
      `OVERRIDES = {\n    "Armadura_Ouro": {"color": "#D4A017", "metallic": 1.00, "roughness": 0.30},\n    "Pele": {"color": "#F1C9A5", "metallic": 0.00, "roughness": 0.60},\n}`
    );
  });
});
