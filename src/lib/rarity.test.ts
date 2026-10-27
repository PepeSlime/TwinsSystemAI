import { describe, expect, it } from "vitest";
import { RARITIES, getRarityDetails, type CharacterRarity } from "./rarity";

describe("rarity.ts", () => {
  it("defines all 5 expected rarities with correct colors", () => {
    const ids = RARITIES.map((r) => r.id);
    expect(ids).toEqual(["raro", "epico", "lendario", "mitico", "secreto"]);

    const raro = getRarityDetails("raro");
    expect(raro.label).toBe("Raro");
    expect(raro.colorName).toBe("Azul");

    const epico = getRarityDetails("epico");
    expect(epico.label).toBe("Épico");
    expect(epico.colorName).toBe("Roxo");

    const lendario = getRarityDetails("lendario");
    expect(lendario.label).toBe("Lendário");
    expect(lendario.colorName).toBe("Dourado");

    const mitico = getRarityDetails("mitico");
    expect(mitico.label).toBe("Mítico");
    expect(mitico.colorName).toContain("Arco-íris");
    expect(mitico.isRainbow).toBe(true);

    const secreto = getRarityDetails("secreto");
    expect(secreto.label).toBe("Secreto");
    expect(secreto.colorName).toBe("Vermelho");
  });

  it("falls back to 'raro' on null or undefined or unknown rarity", () => {
    expect(getRarityDetails(null).id).toBe("raro");
    expect(getRarityDetails(undefined).id).toBe("raro");
    expect(getRarityDetails("desconhecido" as CharacterRarity).id).toBe("raro");
  });
});
