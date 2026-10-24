import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SlotForm = "unevo" | "evo";
export type SlotType = "passive" | "basic" | "skill" | "ultimate";

export interface AbilitySlot {
  id: string;
  character_id: string;
  form: SlotForm;
  slot_type: SlotType;
  slot_index: number;
  title: string | null;
  notes: string | null;
  chosen_suggestion_id: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SLOT_LABELS: Record<SlotType, string> = {
  passive: "Passiva",
  basic: "Ataque Básico",
  skill: "Habilidade",
  ultimate: "Ultimate / Transformação",
};

/**
 * Hook para monitorar os slots de habilidade de um personagem em tempo real
 */
export function useAbilitySlots(characterId: string | undefined) {
  const [slots, setSlots] = useState<AbilitySlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!characterId) return;
    const cid = characterId;

    let active = true;

    async function fetchSlots() {
      const { data, error } = await supabase
        .from("ability_slots")
        .select("*")
        .eq("character_id", cid)
        .order("slot_index", { ascending: true });

      if (error) {
        console.error("Erro ao carregar slots de habilidade:", error);
      } else if (active && data) {
        setSlots(data as AbilitySlot[]);
      }
      if (active) setLoading(false);
    }

    fetchSlots();

    const channel = supabase
      .channel(`ability_slots-${cid}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ability_slots",
          filter: `character_id=eq.${cid}`,
        },
        () => {
          fetchSlots();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [characterId]);

  return { slots, loading };
}

/**
 * Cria slots padrão para uma forma caso ainda não existam:
 * - 1 Passiva (index 0)
 * - 1 Ataque Básico (index 1)
 * - 3 Habilidades (index 2, 3, 4)
 * - 1 Ultimate (index 5)
 */
export async function initializeSlotsForForm(characterId: string, form: SlotForm) {
  const { data: existing } = await supabase
    .from("ability_slots")
    .select("id")
    .eq("character_id", characterId)
    .eq("form", form);

  if (existing && existing.length > 0) return;

  const defaultTemplates: Array<{
    slot_type: SlotType;
    slot_index: number;
    title: string;
  }> = [
    { slot_type: "passive", slot_index: 0, title: "Passiva" },
    { slot_type: "basic", slot_index: 1, title: "Ataque Básico" },
    { slot_type: "skill", slot_index: 2, title: "Habilidade 1" },
    { slot_type: "skill", slot_index: 3, title: "Habilidade 2" },
    { slot_type: "skill", slot_index: 4, title: "Habilidade 3" },
    { slot_type: "ultimate", slot_index: 5, title: form === "evo" ? "Transformação / Ultimate Evo" : "Ultimate" },
  ];

  const rows = defaultTemplates.map((t) => ({
    character_id: characterId,
    form,
    slot_type: t.slot_type,
    slot_index: t.slot_index,
    title: t.title,
    notes: null,
  }));

  const { error } = await supabase.from("ability_slots").insert(rows);
  if (error) {
    console.error(`Erro ao inicializar slots para ${form}:`, error);
    throw new Error(`Falha ao criar slots padrão: ${error.message}`);
  }
}

/**
 * Adiciona uma nova habilidade (skill) dinâmica à forma
 */
export async function addSkillSlot(characterId: string, form: SlotForm, currentCount: number) {
  const nextSkillNumber = currentCount + 1;
  const newIndex = 2 + currentCount; // após passive (0) e basic (1)

  const { data, error } = await supabase
    .from("ability_slots")
    .insert({
      character_id: characterId,
      form,
      slot_type: "skill",
      slot_index: newIndex,
      title: `Habilidade ${nextSkillNumber}`,
      notes: null,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao adicionar habilidade:", error);
    throw new Error("Erro ao adicionar habilidade: " + error.message);
  }

  return data as AbilitySlot;
}

/**
 * Remove um slot de habilidade dinâmico
 */
export async function removeSlot(slotId: string) {
  const { error } = await supabase.from("ability_slots").delete().eq("id", slotId);
  if (error) {
    console.error("Erro ao remover slot:", error);
    throw new Error("Erro ao remover habilidade: " + error.message);
  }
}

/**
 * Atualiza os dados de um slot (título, notas, etc.)
 */
export async function updateSlot(slotId: string, patch: Partial<AbilitySlot>) {
  const { error } = await supabase
    .from("ability_slots")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  if (error) {
    console.error("Erro ao atualizar slot:", error);
    throw new Error("Erro ao atualizar: " + error.message);
  }
}

/**
 * Define ou limpa a sugestão escolhida para um slot
 */
export async function setChosenSuggestion(slotId: string, suggestionId: string | null) {
  const { error } = await supabase
    .from("ability_slots")
    .update({
      chosen_suggestion_id: suggestionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);

  if (error) {
    console.error("Erro ao selecionar sugestão:", error);
    throw new Error("Erro ao selecionar sugestão: " + error.message);
  }
}
