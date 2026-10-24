import { describe, it, expect } from "vitest";
import { DEFAULT_SLOT_LABELS, type SlotType } from "./abilities-store";

describe("abilities-store", () => {
  it("defines default labels for all slot types", () => {
    const types: SlotType[] = ["passive", "basic", "skill", "ultimate"];
    for (const type of types) {
      expect(DEFAULT_SLOT_LABELS[type]).toBeDefined();
      expect(DEFAULT_SLOT_LABELS[type].length).toBeGreaterThan(0);
    }
    expect(DEFAULT_SLOT_LABELS.passive).toBe("Passiva");
    expect(DEFAULT_SLOT_LABELS.basic).toBe("Ataque Básico");
    expect(DEFAULT_SLOT_LABELS.skill).toBe("Habilidade");
    expect(DEFAULT_SLOT_LABELS.ultimate).toBe("Ultimate / Transformação");
  });
});
