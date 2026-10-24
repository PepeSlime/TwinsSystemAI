import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AiUsageRecord {
  id: string;
  day: string;
  kind: string;
  calls: number;
  est_cost: number;
  created_at: string;
}

const DAILY_BUDGET_KEY = "r6sm.daily_ai_budget";
export const DEFAULT_DAILY_BUDGET = 2.0; // $2.00 USD/dia padrão para ferramenta interna

export function getDailyBudget(): number {
  if (typeof window === "undefined") return DEFAULT_DAILY_BUDGET;
  const val = localStorage.getItem(DAILY_BUDGET_KEY);
  return val ? parseFloat(val) : DEFAULT_DAILY_BUDGET;
}

export function saveDailyBudget(budget: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(DAILY_BUDGET_KEY, String(Math.max(0.1, budget)));
}

/**
 * Verifica assincronamente no Supabase se o orçamento de hoje já foi atingido
 */
export async function checkDailyBudgetExceeded(): Promise<boolean> {
  const todayStr = new Date().toISOString().split("T")[0] ?? "";
  const { data, error } = await supabase
    .from("ai_usage")
    .select("est_cost")
    .eq("day", todayStr);

  if (error || !data) return false;
  const sumCost = (data as { est_cost: number }[]).reduce(
    (acc, r) => acc + (Number(r.est_cost) || 0),
    0
  );
  const budget = getDailyBudget();
  return sumCost >= budget;
}

/**
 * Hook para monitorar o gasto de IA do dia atual
 */
export function useDailyAiUsage() {
  const [totalCost, setTotalCost] = useState(0);
  const [totalCalls, setTotalCalls] = useState(0);
  const [loading, setLoading] = useState(true);

  const todayStr = new Date().toISOString().split("T")[0] ?? "";

  useEffect(() => {
    let active = true;

    async function fetchUsage() {
      const { data, error } = await supabase
        .from("ai_usage")
        .select("*")
        .eq("day", todayStr);

      if (error) {
        console.error("Erro ao carregar uso de IA:", error);
      } else if (active && data) {
        const records = data as AiUsageRecord[];
        const sumCost = records.reduce((acc, r) => acc + (Number(r.est_cost) || 0), 0);
        const sumCalls = records.reduce((acc, r) => acc + (Number(r.calls) || 0), 0);
        setTotalCost(sumCost);
        setTotalCalls(sumCalls);
      }
      if (active) setLoading(false);
    }

    fetchUsage();

    const channel = supabase
      .channel(`ai_usage-${todayStr}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ai_usage",
        },
        () => fetchUsage()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [todayStr]);

  const budget = getDailyBudget();
  const isBudgetExceeded = totalCost >= budget;
  const remainingBudget = Math.max(0, budget - totalCost);

  return {
    totalCost,
    totalCalls,
    budget,
    isBudgetExceeded,
    remainingBudget,
    loading,
  };
}

/**
 * Registra o consumo de uma chamada de IA no dia
 */
export async function recordAiUsage(kind: "overrides" | "scrape" | "suggest" | "image", estCost = 0.002) {
  const todayStr = new Date().toISOString().split("T")[0] ?? "";

  const { data: existing } = await supabase
    .from("ai_usage")
    .select("*")
    .eq("day", todayStr)
    .eq("kind", kind)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("ai_usage")
      .update({
        calls: (existing.calls || 0) + 1,
        est_cost: Number((Number(existing.est_cost || 0) + estCost).toFixed(4)),
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("ai_usage").insert({
      day: todayStr,
      kind,
      calls: 1,
      est_cost: estCost,
    });
  }
}
