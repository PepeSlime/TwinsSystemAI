export const R6_PARTS = [
  { name: "Head", label: "Cabeça", size: [2, 1, 1] },
  { name: "Torso", label: "Torso", size: [2, 2, 1] },
  { name: "Left Arm", label: "Braço esquerdo", size: [1, 2, 1] },
  { name: "Right Arm", label: "Braço direito", size: [1, 2, 1] },
  { name: "Left Leg", label: "Perna esquerda", size: [1, 2, 1] },
  { name: "Right Leg", label: "Perna direita", size: [1, 2, 1] },
] as const;

export const MAX_PART_STUDS = 2048;

export interface Settings {
  studMeters: number;
  baseStuds: number;
}
export const DEFAULT_SETTINGS: Settings = { studMeters: 0.28, baseStuds: 5 };

/** Aceita "1,85", "1.85", "185" (cm). Valores > 10 são tratados como centímetros. */
export function parseHeight(input: string): number | null {
  const t = input.trim().replace(",", ".").replace(/\s*(m|cm)$/i, "");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 10 ? n / 100 : n;
}

export interface ScaleCalc {
  heightM: number;
  studs: number;
  scale: number;
  parts: { name: string; label: string; base: number[]; scaled: number[] }[];
  warnings: string[];
}

export function round3(n: number) {
  return Math.round(n * 1000) / 1000;
}

export function calculateScale(heightM: number, s: Settings = DEFAULT_SETTINGS): ScaleCalc {
  const studs = heightM / s.studMeters;
  const scale = studs / s.baseStuds;
  const parts = R6_PARTS.map((p) => ({
    name: p.name,
    label: p.label,
    base: [...p.size],
    scaled: p.size.map((v) => v * scale),
  }));
  const warnings: string[] = [];
  if (heightM < 0.5) warnings.push("Altura menor que 0,5 m — verifique o valor digitado.");
  if (heightM > 3) warnings.push("Altura maior que 3 m — verifique o valor digitado.");
  if (parts.some((p) => p.scaled.some((v) => v > MAX_PART_STUDS)))
    warnings.push(`Alguma parte ultrapassa ${MAX_PART_STUDS} studs (limite do Roblox).`);
  return { heightM, studs, scale, parts, warnings };
}

export function fmt(n: number, d = 3) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
}
