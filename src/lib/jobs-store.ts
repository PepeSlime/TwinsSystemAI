import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { getGroqApiKey } from "./overrides-store";
import { recordAiUsage, checkDailyBudgetExceeded } from "./ai-usage-store";
import { executeGroqWithFallback, getActiveAiModel } from "./ai-models";

export type JobType = "scrape" | "suggest" | "image" | "overrides";
export type JobStatus = "queued" | "running" | "done" | "failed" | "canceled";

export interface Job {
  id: string;
  type: JobType;
  character_id: string | null;
  scope: Record<string, unknown> | null;
  status: JobStatus;
  progress: number;
  total: number;
  error: string | null;
  cost_estimate: number | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface ReferenceItem {
  id: string;
  slot_id: string;
  source_type: "live_action" | "comic" | "animation" | "game" | "other";
  url: string;
  title: string | null;
  snippet: string | null;
  thumb_path: string | null;
  content_hash: string;
  fetched_at: string;
}

export interface AnimationBeats {
  antecipacao?: string;
  impacto?: string;
  finalizacao?: string;
}

export interface VFXDetails {
  particulas?: string;
  cores?: string[];
  trails?: string;
  beams?: string;
  som?: string;
}

export interface Suggestion {
  id: string;
  slot_id: string;
  position: number;
  title: string;
  visual_description: string | null;
  animation_beats: AnimationBeats | null;
  vfx: VFXDetails | null;
  fidelity_source: string | null;
  hype_note: string | null;
  roblox_feasibility: string | null;
  image_prompt: string | null;
  image_path: string | null;
  model: string | null;
  status: "draft" | "chosen" | "discarded";
  created_at: string;
}

/**
 * Hook para listar todos os jobs do sistema em tempo real
 */
export function useJobs(characterId?: string) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchJobs() {
      let query = supabase.from("jobs").select("*").order("created_at", { ascending: false });
      if (characterId) {
        query = query.eq("character_id", characterId);
      }
      const { data, error } = await query;
      if (error) {
        console.error("Erro ao carregar jobs:", error);
      } else if (active && data) {
        setJobs(data as unknown as Job[]);
      }
      if (active) setLoading(false);
    }

    fetchJobs();

    const channel = supabase
      .channel(`jobs-${characterId ?? "all"}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "jobs",
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [characterId]);

  return { jobs, loading };
}

/**
 * Enfileira um novo job assíncrono
 */
export async function enqueueJob(params: {
  type: JobType;
  character_id: string;
  scope: Record<string, unknown>;
  total?: number;
}): Promise<Job> {
  if (await checkDailyBudgetExceeded()) {
    throw new Error(
      "Limite diário de IA atingido. Ajuste o teto no painel da fila se desejar continuar."
    );
  }

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      type: params.type,
      character_id: params.character_id,
      scope: params.scope as unknown as Json,
      status: "queued",
      progress: 0,
      total: params.total ?? 1,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao enfileirar job:", error);
    throw new Error("Erro ao iniciar processamento: " + error.message);
  }

  const job = data as unknown as Job;

  // Dispara o processamento em background sem travar a interface
  triggerJobExecution(job.id).catch((err) => {
    console.error("Erro na execução em background:", err);
  });

  return job;
}

/**
 * Cancela um job em andamento
 */
export async function cancelJob(jobId: string) {
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "canceled",
      finished_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) {
    throw new Error("Falha ao cancelar job: " + error.message);
  }
}

/**
 * Hook para obter referências de um slot em tempo real
 */
export function useSlotReferences(slotId: string | undefined) {
  const [references, setReferences] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slotId) return;
    const sid = slotId;
    let active = true;

    async function fetchRefs() {
      const { data, error } = await supabase
        .from("reference_items")
        .select("*")
        .eq("slot_id", sid)
        .order("fetched_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar referências:", error);
      } else if (active && data) {
        setReferences(data as unknown as ReferenceItem[]);
      }
      if (active) setLoading(false);
    }

    fetchRefs();

    const channel = supabase
      .channel(`reference_items-${sid}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reference_items",
          filter: `slot_id=eq.${sid}`,
        },
        () => fetchRefs()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [slotId]);

  return { references, loading };
}

/**
 * Exclui um item de referência
 */
export async function deleteReferenceItem(referenceId: string) {
  const { error } = await supabase
    .from("reference_items")
    .delete()
    .eq("id", referenceId);

  if (error) {
    throw new Error("Erro ao excluir referência: " + error.message);
  }
}

/**
 * Hook para obter sugestões de um slot em tempo real
 */
export function useSlotSuggestions(slotId: string | undefined) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slotId) return;
    const sid = slotId;
    let active = true;

    async function fetchSuggestions() {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("slot_id", sid)
        .order("position", { ascending: true });

      if (error) {
        console.error("Erro ao carregar sugestões:", error);
      } else if (active && data) {
        setSuggestions(data as unknown as Suggestion[]);
      }
      if (active) setLoading(false);
    }

    fetchSuggestions();

    const channel = supabase
      .channel(`suggestions-${sid}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "suggestions",
          filter: `slot_id=eq.${sid}`,
        },
        () => fetchSuggestions()
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [slotId]);

  return { suggestions, loading };
}

/**
 * Atualiza status da sugestão (draft, chosen, discarded)
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  slotId: string,
  status: "draft" | "chosen" | "discarded"
) {
  const { error } = await supabase
    .from("suggestions")
    .update({ status })
    .eq("id", suggestionId);

  if (error) {
    throw new Error("Erro ao atualizar status: " + error.message);
  }

  // Se for escolhida, salva a chave no slot
  if (status === "chosen") {
    await supabase
      .from("ability_slots")
      .update({ chosen_suggestion_id: suggestionId })
      .eq("id", slotId);
  }
}

/**
 * Execução assíncrona do pipeline de busca e geração de sugestões
 */
export async function triggerJobExecution(jobId: string) {
  const { data: jobData, error: jobErr } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobErr || !jobData) return;
  const job = jobData as unknown as Job;

  if (await checkDailyBudgetExceeded()) {
    await supabase
      .from("jobs")
      .update({
        status: "failed",
        error: "Limite diário de IA atingido. Ajuste o teto no painel de fila para continuar.",
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return;
  }

  // Marca como running
  await supabase
    .from("jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  try {
    const scope = job.scope ?? {};
    const characterId = job.character_id;

    if (!characterId) {
      throw new Error("Job sem ID de personagem.");
    }

    // Busca dados do personagem
    const { data: charData } = await supabase
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .single();

    const charName = charData?.name || "Personagem";
    const universe = charData?.universe || "";

    // Slots a processar
    let targetSlotsQuery = supabase
      .from("ability_slots")
      .select("*")
      .eq("character_id", characterId);

    if (scope["slot_id"]) {
      targetSlotsQuery = targetSlotsQuery.eq("id", scope["slot_id"] as string);
    } else if (scope["form"]) {
      targetSlotsQuery = targetSlotsQuery.eq("form", scope["form"] as string);
    }

    const { data: slotsToProcess } = await targetSlotsQuery;
    const slotsList = slotsToProcess ?? [];

    await supabase
      .from("jobs")
      .update({ total: Math.max(1, slotsList.length) })
      .eq("id", jobId);

    const apiKey = getGroqApiKey();

    if (job.type === "scrape") {
      // Pipeline de Referências
      let completed = 0;
      for (const slot of slotsList) {
        // Limpa referências antigas do slot para evitar misturar com alucinações passadas
        await supabase.from("reference_items").delete().eq("slot_id", slot.id);

        const execRes = await executeGroqWithFallback({
          apiKey,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Você é um enciclopedista e pesquisador especialista em animes, mangás, quadrinhos, jogos e lore oficial.
Sua função é fornecer referências de fontes oficiais (Fandom Wiki, Wikipédia, mangá original, cenas de anime).

REGRAS CRÍTICAS DE FIDELIDADE CANÔNICA (MANDATÓRIO):
1. NUNCA invente afinidades elementais literais por causa do nome, signo ou constelação!
   - Exemplo clássico e inegociável: Em Saint Seiya (Cavaleiros do Zodíaco / The Lost Canvas), Albafica de Peixes e Cavaleiros de Peixes JAMAIS manipulam água, marés ou ondas! Eles lutam exclusivamente com ROSAS VENENOSAS e SANGUE (Rosas Diabólicas Reais vermelhas, Rosas Piranhas negras, Rosa Sangrenta branca e Espinhos Carmesim de sangue).
   - Para qualquer outro personagem: consulte a lore oficial da franquia e use o arsenal e técnicas verdadeiras do cânone.
2. Formato de URLs:
   - Priorize links enciclopédicos úteis (Fandom Wiki da obra, Wikipédia, páginas de técnicas).
   - NUNCA use example.com. Use buscas focadas na Wiki/Fandom da obra no formato: https://www.google.com/search?q=NOME+DO+PERSONAGEM+UNIVERSO+WIKI+NOME+DO+GOLPE
3. Idioma: Escreva TODOS os títulos e descrições (snippet) 100% EM PORTUGUÊS DO BRASIL (pt-BR).`,
            },
            {
              role: "user",
              content: `Encontre 3 referências canônicas detalhadas de fontes como Fandom Wiki, Wikipédia e mangá para o personagem "${charName}" da obra "${universe}".
Slot: "${slot.title}" (${slot.slot_type}). Forma: ${slot.form === "evo" ? "Evoluída" : "Base/Normal"}.
Notas/Conceito do usuário: "${slot.notes || "Use a técnica canônica oficial mais icônica do personagem adequada para este slot"}".
Retorne um JSON com a chave "items", onde cada item tem:
- "title": Nome canônico da técnica ou referência em português
- "source_type": "wiki" (Wiki/Fandom/Wikipédia), "comic" (Mangá/HQ), "animation" (Anime) ou "game" (Jogo)
- "url": Link de pesquisa na Wiki/Google ou URL enciclopédica direta
- "snippet": Descrição precisa de como a técnica funciona na obra original e seu impacto visual.`,
            },
          ],
        });

        const content = JSON.parse(execRes.content || "{}");
        const items = content.items || [];

          for (const item of items) {
            const hash = `${slot.id}-${item.title}-${Date.now()}`;
            const itemTitle = item.title || "Referência Canônica";
            const rawUrl = item.url || "";
            const isInvalidUrl =
              !rawUrl ||
              rawUrl.includes("example.com") ||
              rawUrl.includes("example.org") ||
              !rawUrl.startsWith("http");

            const finalUrl = isInvalidUrl
              ? `https://www.google.com/search?q=${encodeURIComponent(
                  `${charName} ${universe} wiki ${itemTitle} técnica`
                )}`
              : rawUrl;

            await supabase.from("reference_items").insert({
              slot_id: slot.id,
              source_type: item.source_type || "wiki",
              url: finalUrl,
              title: itemTitle,
              snippet: item.snippet || item.description || "Referência visual canônica da obra original",
              content_hash: hash,
            });
          }

        await recordAiUsage("scrape", 0.002);
        completed++;
        await supabase
          .from("jobs")
          .update({ progress: completed })
          .eq("id", jobId);
      }
    } else if (job.type === "suggest") {
      // Pipeline de Sugestões de Animação/VFX
      let completed = 0;
      for (const slot of slotsList) {
        // Remove sugestões anteriores que não foram escolhidas
        await supabase
          .from("suggestions")
          .delete()
          .eq("slot_id", slot.id)
          .neq("status", "chosen");

        // Busca as referências reais coletadas para este slot para alimentar a IA
        const { data: slotRefs } = await supabase
          .from("reference_items")
          .select("title, snippet, source_type")
          .eq("slot_id", slot.id)
          .order("fetched_at", { ascending: false })
          .limit(6);

        const refsContext =
          slotRefs && slotRefs.length > 0
            ? slotRefs
                .map(
                  (r, idx) =>
                    `[Referência ${idx + 1} - ${r.source_type}]: ${r.title}\nDescrição/Lore: ${r.snippet}`
                )
                .join("\n\n")
            : "Nenhuma referência prévia coletada. Use seu conhecimento enciclopédico sobre a lore canônica da obra.";

        const execRes = await executeGroqWithFallback({
          apiKey,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Você é o diretor criativo de combate de um jogo de anime no Roblox R6 (6 partes de corpo: Head, Torso, Arms, Legs, sem articulação facial).
REGRAS CRÍTICAS DE LORE E CÂNONE (MANDATÓRIO):
1. Respeite com RIGOR ABSOLUTO o cânone oficial da obra "${universe}" para o personagem "${charName}".
2. NUNCA invente elementos ou poderes que o personagem não possui na obra (exemplo: Albafica de Peixes de Saint Seiya NUNCA usa água ou marés; ele luta com ROSAS VENENOSAS vermelhas, ROSAS PIRANHAS negras, ROSA SANGRENTA branca e ESPINHOS CARMESIM de sangue).
3. OBRIGATÓRIO: Se houver referências coletadas fornecidas na mensagem do usuário, você DEVE utilizá-las como fonte e inspiração primordial para as sugestões.
4. Adapte as técnicas canônicas do personagem para o formato R6 de forma cinematográfica, com antecipação clara, impacto explosivo e recuperação elegante.
5. Responda 100% EM PORTUGUÊS DO BRASIL (pt-BR).

O retorno DEVE ser um JSON estrito:
{
  "suggestions": [
    {
      "title": "Nome oficial/canônico da técnica em português",
      "visual_description": "Descrição cinematográfica da técnica e atuação do personagem",
      "animation_beats": {
        "antecipacao": "Preparação e pose no R6",
        "impacto": "Quadro de impacto ou liberação da técnica",
        "finalizacao": "Pose de finalização e recuperação"
      },
      "vfx": {
        "particulas": "Partículas emitidas (ex: pétalas de rosas, névoa de sangue, cosmo dourado)",
        "cores": ["#HEX1", "#HEX2"],
        "trails": "Rastro visual das mãos/armas",
        "beams": "Feixes de energia ou projéteis",
        "som": "Efeito sonoro sugerido"
      },
      "fidelity_source": "Fonte canônica oficial (ex: Saint Seiya: The Lost Canvas - Mangá Capítulo 20)",
      "hype_note": "Por que o jogador vai amar essa habilidade no jogo",
      "roblox_feasibility": "Como implementar com alta performance no R6",
      "image_prompt": "Prompt em inglês para arte conceitual da técnica"
    }
  ]
}`,
            },
            {
              role: "user",
              content: `Personagem: ${charName} (Universo: ${universe}).
Forma: ${slot.form === "evo" ? "Evoluída / Transformação" : "Normal / Unevo"}.
Slot: ${slot.title} (${slot.slot_type}).
Conceito/Notas do usuário: ${slot.notes || "Gere as variações mais icônicas e fiéis à lore oficial do personagem para esta habilidade"}.

REFERÊNCIAS COLETADAS DA OBRA PARA ESTE GOLPE (USE COMO BASE OBRIGATÓRIA):
${refsContext}

INSTRUÇÃO: Use as referências canônicas acima como base mandatória para estruturar as 4 sugestões, adaptando os efeitos visuais, mecânica e impacto para o formato R6!`,
            },
          ],
        });

        const content = JSON.parse(execRes.content || "{}");
        const suggestionsList = content.suggestions || [];

        let pos = 1;
        for (const s of suggestionsList) {
          await supabase.from("suggestions").insert({
            slot_id: slot.id,
            position: pos++,
            title: s.title || `Sugestão ${pos}`,
            visual_description: s.visual_description,
            animation_beats: s.animation_beats as unknown as Json,
            vfx: s.vfx as unknown as Json,
            fidelity_source: s.fidelity_source,
            hype_note: s.hype_note,
            roblox_feasibility: s.roblox_feasibility,
            image_prompt: s.image_prompt,
            model: execRes.modelUsed,
            status: "draft",
          });
        }

        await recordAiUsage("suggest", 0.003);
        completed++;
        await supabase
          .from("jobs")
          .update({ progress: completed })
          .eq("id", jobId);
      }
    }

    // Marca como done
    await supabase
      .from("jobs")
      .update({
        status: "done",
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (err: unknown) {
    console.error("Erro no processamento do job:", err);
    await supabase
      .from("jobs")
      .update({
        status: "failed",
        error: (err as Error).message || "Erro desconhecido durante execução.",
        finished_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}
