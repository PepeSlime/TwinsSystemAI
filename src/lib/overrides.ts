export interface MaterialOverride {
  color: string;
  metallic: number;
  roughness: number;
}

export type OverridesMap = Record<string, MaterialOverride>;

export interface TableRow {
  material: string;
  part: string;
  color: string;
  doubt?: string;
  unmapped?: boolean;
}

export interface OverridesResult {
  overrides: OverridesMap;
  pythonCode: string;
  table: TableRow[];
  unmapped: string[];
  questions?: string[];
  modelUsed?: string;
}

export interface ParseResult {
  success: boolean;
  overrides?: OverridesMap;
  error?: string;
}

export function sanitizeColor(hex: string): string {
  if (!hex) return "#111111";
  let clean = hex.trim().toUpperCase();
  if (!clean.startsWith("#")) {
    clean = "#" + clean;
  }
  if (/^#[0-9A-F]{3}$/i.test(clean)) {
    const c1 = clean[1] ?? "0";
    const c2 = clean[2] ?? "0";
    const c3 = clean[3] ?? "0";
    clean = `#${c1}${c1}${c2}${c2}${c3}${c3}`;
  }
  if (!/^#[0-9A-F]{6}$/i.test(clean)) {
    return "#111111";
  }
  if (clean === "#000000") return "#111111";
  if (clean === "#FFFFFF") return "#F2F2F2";
  return clean;
}

export function sanitizeClamped(n: unknown, fallback = 0.5): number {
  const num = typeof n === "number" ? n : parseFloat(String(n));
  if (isNaN(num)) return fallback;
  const clamped = Math.max(0, Math.min(1, num));
  return Math.round(clamped * 100) / 100;
}

export function parseOverridesPython(pythonText: string): ParseResult {
  if (!pythonText || !pythonText.trim()) {
    return { success: false, error: "O texto está vazio." };
  }

  try {
    let text = pythonText.trim();
    const eqIdx = text.indexOf("=");
    if (eqIdx !== -1 && text.slice(0, eqIdx).includes("OVERRIDES")) {
      text = text.slice(eqIdx + 1).trim();
    }

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      return { success: false, error: "Nenhum dicionário {...} encontrado no texto." };
    }
    const dictText = text.slice(firstBrace, lastBrace + 1);

    const cleaned = dictText
      .split("\n")
      .map((line) => line.replace(/#.*$/, ""))
      .join("\n");

    const jsonCandidate = cleaned
      .replace(/'/g, '"')
      .replace(/,\s*([}\]])/g, "$1");

    const parsed = JSON.parse(jsonCandidate) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { success: false, error: "O conteúdo não é um dicionário Python válido." };
    }

    const overrides: OverridesMap = {};
    for (const [matName, val] of Object.entries(parsed)) {
      if (typeof val === "object" && val !== null) {
        const v = val as Record<string, unknown>;
        overrides[matName] = {
          color: sanitizeColor(String(v["color"] ?? "#C0C0C0")),
          metallic: sanitizeClamped(v["metallic"], 0.0),
          roughness: sanitizeClamped(v["roughness"], 0.5),
        };
      }
    }

    if (Object.keys(overrides).length === 0) {
      return { success: false, error: "Nenhum material encontrado no bloco." };
    }

    return { success: true, overrides };
  } catch (err: unknown) {
    const regex = /["']([^"']+)["']\s*:\s*\{([^}]+)\}/g;
    const overrides: OverridesMap = {};
    let match: RegExpExecArray | null;

    while ((match = regex.exec(pythonText)) !== null) {
      const matName = match[1];
      const body = match[2];
      if (!matName || !body) continue;

      const colorMatch = body.match(/["']color["']\s*:\s*["']([^"']+)["']/i);
      const metalMatch = body.match(/["']metallic["']\s*:\s*([0-9.]+)/i);
      const roughMatch = body.match(/["']roughness["']\s*:\s*([0-9.]+)/i);

      overrides[matName] = {
        color: sanitizeColor(colorMatch?.[1] ?? "#C0C0C0"),
        metallic: sanitizeClamped(metalMatch?.[1] ? parseFloat(metalMatch[1]) : 0.0),
        roughness: sanitizeClamped(roughMatch?.[1] ? parseFloat(roughMatch[1]) : 0.5),
      };
    }

    if (Object.keys(overrides).length > 0) {
      return { success: true, overrides };
    }

    return { success: false, error: `Erro ao processar sintaxe Python: ${(err as Error).message}` };
  }
}

export function validateOverrides(
  inputOverrides: OverridesMap,
  outputData: unknown
): { valid: boolean; errors: string[]; validated?: OverridesMap } {
  const errors: string[] = [];
  if (!outputData || typeof outputData !== "object" || Array.isArray(outputData)) {
    return { valid: false, errors: ["A resposta não é um objeto/dicionário."] };
  }

  const outputObj = outputData as Record<string, unknown>;
  const inputKeys = Object.keys(inputOverrides);
  const outputKeys = Object.keys(outputObj);

  const missingKeys = inputKeys.filter((k) => !(k in outputObj));
  if (missingKeys.length > 0) {
    errors.push(`Chaves faltantes na saída: ${missingKeys.join(", ")}`);
  }

  const extraKeys = outputKeys.filter((k) => !(k in inputOverrides));
  if (extraKeys.length > 0) {
    errors.push(`Chaves inesperadas ou alteradas na saída: ${extraKeys.join(", ")}`);
  }

  const validated: OverridesMap = {};

  for (const key of inputKeys) {
    const inputItem = inputOverrides[key];
    const val = outputObj[key];
    if (!val || typeof val !== "object" || Array.isArray(val) || !inputItem) {
      errors.push(`Material "${key}" possui valor inválido.`);
      continue;
    }
    const item = val as Record<string, unknown>;
    const color = sanitizeColor(String(item["color"] ?? inputItem.color));
    const metallic = sanitizeClamped(item["metallic"] !== undefined ? item["metallic"] : inputItem.metallic);
    const roughness = sanitizeClamped(item["roughness"] !== undefined ? item["roughness"] : inputItem.roughness);

    validated[key] = { color, metallic, roughness };
  }

  if (errors.length > 0) {
    return { valid: false, errors, validated };
  }

  return { valid: true, errors: [], validated };
}

export function formatOverridesPython(overrides: OverridesMap): string {
  const lines: string[] = ["OVERRIDES = {"];
  for (const [key, val] of Object.entries(overrides)) {
    const metalStr = val.metallic.toFixed(2);
    const roughStr = val.roughness.toFixed(2);
    lines.push(`    "${key}": {"color": "${val.color}", "metallic": ${metalStr}, "roughness": ${roughStr}},`);
  }
  lines.push("}");
  return lines.join("\n");
}

export async function extractDominantColors(
  source: HTMLImageElement | HTMLCanvasElement,
  count = 6
): Promise<string[]> {
  const canvas = source instanceof HTMLCanvasElement ? source : document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];

  if (source instanceof HTMLImageElement) {
    const maxDim = 150;
    const scale = Math.min(maxDim / (source.naturalWidth || 1), maxDim / (source.naturalHeight || 1), 1);
    canvas.width = Math.max(10, Math.floor((source.naturalWidth || 100) * scale));
    canvas.height = Math.max(10, Math.floor((source.naturalHeight || 100) * scale));
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const colorBuckets = new Map<string, number>();

  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3] ?? 0;
    if (a < 128) continue;
    const r = Math.round((data[i] ?? 0) / 16) * 16;
    const g = Math.round((data[i + 1] ?? 0) / 16) * 16;
    const b = Math.round((data[i + 2] ?? 0) / 16) * 16;
    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
    colorBuckets.set(hex, (colorBuckets.get(hex) || 0) + 1);
  }

  const sorted = Array.from(colorBuckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([hex]) => sanitizeColor(hex));

  return sorted;
}

const PART_TRANSLATIONS: Record<string, string> = {
  torso: "Tronco / Peito",
  chest: "Peito / Tronco",
  head: "Cabeça",
  hair: "Cabelo",
  skin: "Pele",
  body: "Corpo",
  eyes: "Olhos",
  eye: "Olhos",
  face: "Rosto",
  arm: "Braço",
  arms: "Braços",
  hand: "Mão",
  hands: "Mãos",
  leg: "Perna",
  legs: "Pernas",
  foot: "Pé",
  feet: "Pés",
  armor: "Armadura",
  cape: "Capa",
  cloth: "Tecido / Roupa",
  clothes: "Roupas",
  shoes: "Sapatos",
  boots: "Botas",
  gloves: "Luvas",
  metal: "Metal / Armadura",
  gold: "Ouro",
  unknown: "Geral",
};

export function translatePart(part: string | undefined): string {
  if (!part) return "Geral";
  const lower = part.toLowerCase().trim();
  if (PART_TRANSLATIONS[lower]) return PART_TRANSLATIONS[lower];
  return part;
}

export function translateDoubt(doubt: string | undefined): string {
  if (!doubt) return "nenhuma";
  const lower = doubt.toLowerCase().trim();
  if (lower === "none" || lower === "no" || lower === "no doubt" || lower === "sem duvidas") {
    return "nenhuma";
  }
  return doubt;
}
