import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface JobSchedule {
  id: string;
  character_id: string | null;
  scope: Record<string, unknown> | null;
  cron: string;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string;
}

export const CRON_PRESETS = [
  { label: "Diário (às 04:00)", cron: "0 4 * * *" },
  { label: "Semanal (Segunda-feira às 04:00)", cron: "0 4 * * 1" },
  { label: "A cada 3 dias", cron: "0 4 */3 * *" },
  { label: "Personalizado", cron: "custom" },
];

/**
 * Hook para obter e monitorar agendamentos de busca em tempo real
 */
export function useJobSchedules(characterId?: string) {
  const [schedules, setSchedules] = useState<JobSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchSchedules() {
      let query = supabase.from("job_schedules").select("*").order("created_at", { ascending: false });
      if (characterId) {
        query = query.or(`character_id.eq.${characterId},character_id.is.null`);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Erro ao carregar agendamentos:", error);
      } else if (active && data) {
        setSchedules(data as unknown as JobSchedule[]);
      }
      if (active) setLoading(false);
    }

    fetchSchedules();

    const channel = supabase
      .channel(`job_schedules-${characterId ?? "all"}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "job_schedules",
        },
        () => fetchSchedules()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [characterId]);

  return { schedules, loading };
}

/**
 * Cria ou salva um novo agendamento
 */
export async function createSchedule(params: {
  character_id: string | null;
  cron: string;
  scope: Record<string, unknown>;
  enabled?: boolean;
}) {
  const { data, error } = await supabase
    .from("job_schedules")
    .insert({
      character_id: params.character_id,
      cron: params.cron,
      scope: params.scope as unknown as Json,
      enabled: params.enabled ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar agendamento:", error);
    throw new Error("Erro ao salvar agendamento: " + error.message);
  }

  return data as unknown as JobSchedule;
}

/**
 * Alterna agendamento entre ativado/desativado
 */
export async function toggleSchedule(scheduleId: string, enabled: boolean) {
  const { error } = await supabase
    .from("job_schedules")
    .update({ enabled })
    .eq("id", scheduleId);

  if (error) {
    throw new Error("Erro ao alterar agendamento: " + error.message);
  }
}

/**
 * Exclui um agendamento
 */
export async function deleteSchedule(scheduleId: string) {
  const { error } = await supabase
    .from("job_schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) {
    throw new Error("Erro ao excluir agendamento: " + error.message);
  }
}
