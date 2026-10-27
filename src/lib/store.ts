import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, type Settings } from "./scale";
import { type CharacterRarity } from "./rarity";

export type { CharacterRarity };
export type Status = "modeling" | "done";

export interface CharacterSummon {
  id: string;
  name: string;
  image_url: string | null;
  height_m: number | null;
  scale: number | null;
  model_sheet_url: string | null;
  model_sheet_name: string | null;
  model_sheet_type: string | null;
}

export interface Character {
  id: string;
  name: string;
  rarity?: CharacterRarity;
  universe?: string | null;
  evo_enabled?: boolean;
  image_url: string | null;
  height_m: number | null;
  scale: number | null;
  anchored_ok: boolean;
  cancollide_ok: boolean;
  scale_ok: boolean;
  model_sheet_url: string | null;
  model_sheet_name: string | null;
  model_sheet_type: string | null;
  has_summon?: boolean;
  summons?: CharacterSummon[];
  summon_name?: string | null;
  summon_image_url?: string | null;
  summon_height_m?: number | null;
  summon_scale?: number | null;
  summon_model_sheet_url?: string | null;
  summon_model_sheet_name?: string | null;
  summon_model_sheet_type?: string | null;
  status: Status;
  completed_at: string | null;
  created_at: string;
}

const LEGACY_KEY = "r6sm.characters";
const SK = "r6sm.settings";
const BUCKET = "characters";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

const listeners = new Set<() => void>();
let chars: Character[] = [];
let loaded = false;
let started = false;
let settingsCache: Settings | null = null;

function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function normalize(r: Record<string, unknown>): Character {
  let summons: CharacterSummon[] = [];
  if (Array.isArray(r["summons"])) {
    summons = (r["summons"] as Record<string, unknown>[]).map((s, idx) => ({
      id: String(s["id"] || `summon-${idx}`),
      name: String(s["name"] || `Invocação ${idx + 1}`),
      image_url: (s["image_url"] as string) ?? null,
      height_m: s["height_m"] == null ? null : Number(s["height_m"]),
      scale: s["scale"] == null ? null : Number(s["scale"]),
      model_sheet_url: (s["model_sheet_url"] as string) ?? null,
      model_sheet_name: (s["model_sheet_name"] as string) ?? null,
      model_sheet_type: (s["model_sheet_type"] as string) ?? null,
    }));
  }

  if (summons.length === 0 && Boolean(r["has_summon"]) && (r["summon_name"] || r["summon_image_url"] || r["summon_height_m"] || r["summon_model_sheet_url"])) {
    summons = [{
      id: "legacy-1",
      name: (r["summon_name"] as string) || "Invocação 1",
      image_url: (r["summon_image_url"] as string) ?? null,
      height_m: r["summon_height_m"] == null ? null : Number(r["summon_height_m"]),
      scale: r["summon_scale"] == null ? null : Number(r["summon_scale"]),
      model_sheet_url: (r["summon_model_sheet_url"] as string) ?? null,
      model_sheet_name: (r["summon_model_sheet_name"] as string) ?? null,
      model_sheet_type: (r["summon_model_sheet_type"] as string) ?? null,
    }];
  }

  return {
    ...(r as unknown as Character),
    universe: (r["universe"] as string) ?? null,
    rarity: ((r["rarity"] as CharacterRarity) || "raro"),
    evo_enabled: Boolean(r["evo_enabled"]),
    height_m: r["height_m"] == null ? null : Number(r["height_m"]),
    scale: r["scale"] == null ? null : Number(r["scale"]),
    has_summon: Boolean(r["has_summon"]),
    summons,
    summon_name: (r["summon_name"] as string) ?? summons[0]?.name ?? null,
    summon_image_url: (r["summon_image_url"] as string) ?? summons[0]?.image_url ?? null,
    summon_height_m: r["summon_height_m"] == null ? (summons[0]?.height_m ?? null) : Number(r["summon_height_m"]),
    summon_scale: r["summon_scale"] == null ? (summons[0]?.scale ?? null) : Number(r["summon_scale"]),
    summon_model_sheet_url: (r["summon_model_sheet_url"] as string) ?? summons[0]?.model_sheet_url ?? null,
    summon_model_sheet_name: (r["summon_model_sheet_name"] as string) ?? summons[0]?.model_sheet_name ?? null,
    summon_model_sheet_type: (r["summon_model_sheet_type"] as string) ?? summons[0]?.model_sheet_type ?? null,
    status: r["status"] === "done" ? "done" : "modeling",
  };
}

async function refresh() {
  const { data, error } = await supabase.from("characters").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  chars = (data ?? []).map((r) => normalize(r as Record<string, unknown>));
  loaded = true;
  emit();
}

/** Envia personagens que estavam salvos só neste navegador para o banco compartilhado. */
async function migrateLegacy() {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  try {
    const list = JSON.parse(raw) as Character[];
    for (const c of list) await saveCharacter(c);
    localStorage.removeItem(LEGACY_KEY);
  } catch (e) {
    console.error("Falha ao migrar dados locais", e);
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  migrateLegacy().then(refresh);
  supabase
    .channel(`characters-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "characters" }, () => refresh())
    .subscribe();
}

export function useCharacters() {
  useEffect(start, []);
  return useSyncExternalStore(subscribe, () => chars, () => chars);
}
export function useCharactersLoaded() {
  useEffect(start, []);
  return useSyncExternalStore(subscribe, () => loaded, () => false);
}
export function useCharacter(id: string) {
  return useCharacters().find((c) => c.id === id);
}

async function uploadIfDataUrl(url: string | null, id: string, kind: string): Promise<string | null> {
  if (!url || !url.startsWith("data:")) return url;
  const blob = await (await fetch(url)).blob();
  const ext = blob.type === "application/pdf" ? "pdf" : (blob.type.split("/")[1] || "bin");
  const path = `${id}/${kind}-${Date.now()}.${ext}`;
  const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: true });
  if (up.error) throw new Error("Falha ao enviar arquivo: " + up.error.message);
  const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, TEN_YEARS);
  if (signed.error) throw new Error(signed.error.message);
  return signed.data.signedUrl;
}

export async function saveCharacter(c: Character) {
  const processedSummons: CharacterSummon[] = await Promise.all(
    (c.summons ?? []).map(async (s, idx) => {
      const summonId = s.id || crypto.randomUUID();
      return {
        ...s,
        id: summonId,
        name: s.name.trim() || `Invocação ${idx + 1}`,
        image_url: await uploadIfDataUrl(s.image_url, c.id, `summon-${summonId}-image`),
        model_sheet_url: await uploadIfDataUrl(s.model_sheet_url, c.id, `summon-${summonId}-sheet`),
      };
    })
  );

  const firstSummon = processedSummons[0] ?? null;

  const row = {
    ...c,
    rarity: c.rarity ?? "raro",
    image_url: await uploadIfDataUrl(c.image_url, c.id, "image"),
    model_sheet_url: await uploadIfDataUrl(c.model_sheet_url, c.id, "sheet"),
    summons: processedSummons,
    summon_name: firstSummon?.name ?? null,
    summon_image_url: firstSummon?.image_url ?? null,
    summon_height_m: firstSummon?.height_m ?? null,
    summon_scale: firstSummon?.scale ?? null,
    summon_model_sheet_url: firstSummon?.model_sheet_url ?? null,
    summon_model_sheet_name: firstSummon?.model_sheet_name ?? null,
    summon_model_sheet_type: firstSummon?.model_sheet_type ?? null,
  };
  const { error } = await supabase.from("characters").upsert(row);
  if (error) throw new Error("Erro ao salvar: " + error.message);
  await refresh();
}

export async function updateCharacter(id: string, patch: Partial<Character>) {
  chars = chars.map((x) => (x.id === id ? { ...x, ...patch } : x));
  emit();
  const { error } = await supabase.from("characters").update(patch).eq("id", id);
  if (error) {
    console.error(error);
    await refresh();
    throw new Error("Erro ao atualizar: " + error.message);
  }
}

export async function deleteCharacter(id: string) {
  chars = chars.filter((x) => x.id !== id);
  emit();
  await supabase.from("characters").delete().eq("id", id);
  const { data } = await supabase.storage.from(BUCKET).list(id);
  if (data?.length) await supabase.storage.from(BUCKET).remove(data.map((f) => `${id}/${f.name}`));
}

function readSettings(): Settings {
  if (settingsCache) return settingsCache;
  try {
    settingsCache = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SK) || "{}") };
  } catch {
    settingsCache = DEFAULT_SETTINGS;
  }
  return settingsCache!;
}
export function useSettings() {
  return useSyncExternalStore(subscribe, readSettings, () => DEFAULT_SETTINGS);
}
export function saveSettings(s: Settings) {
  settingsCache = s;
  localStorage.setItem(SK, JSON.stringify(s));
  emit();
}

export function fileToDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

export function pendingCount(c: Character) {
  return [c.scale_ok, c.anchored_ok, c.cancollide_ok].filter((v) => !v).length;
}
