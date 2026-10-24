import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SETTINGS, type Settings } from "./scale";

export type Status = "modeling" | "done";

export interface Character {
  id: string;
  name: string;
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
  return {
    ...(r as unknown as Character),
    universe: (r["universe"] as string) ?? null,
    evo_enabled: Boolean(r["evo_enabled"]),
    height_m: r["height_m"] == null ? null : Number(r["height_m"]),
    scale: r["scale"] == null ? null : Number(r["scale"]),
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
  const row = {
    ...c,
    image_url: await uploadIfDataUrl(c.image_url, c.id, "image"),
    model_sheet_url: await uploadIfDataUrl(c.model_sheet_url, c.id, "sheet"),
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
