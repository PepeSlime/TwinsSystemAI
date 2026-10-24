import { describe, it, expect } from "vitest";
import {
  parseOverridesPython,
  formatOverridesPython,
  validateOverrides,
  sanitizeColor,
  sanitizeClamped,
} from "./overrides";

describe("Overrides End-to-End Logic", () => {
  it("processes a real Blender script snippet end-to-end", () => {
    const rawBlenderSnippet = `
OVERRIDES = {
    "Armadura_Ouro": {"color": "#C0C0C0", "metallic": 0.50, "roughness": 0.50},
    "Pele": {"color": "#FFFFFF", "metallic": 0.00, "roughness": 0.50},
    "Olhos_Negros": {"color": "#000000", "metallic": 0.00, "roughness": 0.50},
    "Capa_Branca": {"color": "#FFFFFF", "metallic": 0.00, "roughness": 0.50},
}
`;

    // 1. Parse do Python colado
    const parsed = parseOverridesPython(rawBlenderSnippet);
    expect(parsed.success).toBe(true);
    expect(parsed.overrides).toBeDefined();

    const inputOverrides = parsed.overrides!;

    // 2. Simulação de resposta da IA
    const aiResponseOverrides = {
      Armadura_Ouro: { color: "#D4A017", metallic: 1.0, roughness: 0.3 },
      Pele: { color: "#F1C9A5", metallic: 0.0, roughness: 0.6 },
      Olhos_Negros: { color: "#000000", metallic: 0.0, roughness: 0.5 }, // Deve virar #111111
      Capa_Branca: { color: "#FFFFFF", metallic: 0.0, roughness: 0.85 }, // Deve virar #F2F2F2
    };

    // 3. Validação determinística
    const validation = validateOverrides(inputOverrides, aiResponseOverrides);
    expect(validation.valid).toBe(true);
    expect(validation.validated).toBeDefined();

    const result = validation.validated!;

    // Verificações de regras Roblox
    expect(result["Olhos_Negros"]?.color).toBe("#111111");
    expect(result["Capa_Branca"]?.color).toBe("#F2F2F2");
    expect(result["Armadura_Ouro"]?.metallic).toBe(1.0);
    expect(result["Armadura_Ouro"]?.roughness).toBe(0.3);

    // 4. Formatação do código Python final
    const finalPython = formatOverridesPython(result);
    expect(finalPython).toContain('OVERRIDES = {');
    expect(finalPython).toContain('"Armadura_Ouro": {"color": "#D4A017", "metallic": 1.00, "roughness": 0.30},');
    expect(finalPython).toContain('"Olhos_Negros": {"color": "#111111", "metallic": 0.00, "roughness": 0.50},');
    expect(finalPython).toContain('}');

    // 5. Teste de formato Python válido (consegue ser re-parseado perfeitamente)
    const reparsed = parseOverridesPython(finalPython);
    expect(reparsed.success).toBe(true);
    expect(reparsed.overrides!["Armadura_Ouro"]?.color).toBe("#D4A017");
  });
});
