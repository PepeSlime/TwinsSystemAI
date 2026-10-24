import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const groqApiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("XAI_API_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const jobId = body.job_id;

    let targetJob = null;
    if (jobId) {
      const { data } = await supabase.from("jobs").select("*").eq("id", jobId).single();
      targetJob = data;
    } else {
      // Pega o próximo job da fila
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "queued")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      targetJob = data;
    }

    if (!targetJob) {
      return new Response(JSON.stringify({ message: "Nenhum job pendente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marca como em execução
    await supabase
      .from("jobs")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", targetJob.id);

    const characterId = targetJob.character_id;
    const { data: charData } = await supabase
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .single();

    const charName = charData?.name || "Personagem";
    const universe = charData?.universe || "";

    // Busca os slots
    const scope = targetJob.scope || {};
    let slotsQuery = supabase.from("ability_slots").select("*").eq("character_id", characterId);
    if (scope.slot_id) {
      slotsQuery = slotsQuery.eq("id", scope.slot_id);
    } else if (scope.form) {
      slotsQuery = slotsQuery.eq("form", scope.form);
    }

    const { data: slots } = await slotsQuery;
    const slotsList = slots || [];

    await supabase.from("jobs").update({ total: Math.max(1, slotsList.length) }).eq("id", targetJob.id);

    let progress = 0;
    for (const slot of slotsList) {
      if (targetJob.type === "scrape") {
        // Limpa referências antigas do slot
        await supabase.from("reference_items").delete().eq("slot_id", slot.id);

        const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
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
          }),
        });

        if (aiRes.ok) {
          const json = await aiRes.json();
          const content = JSON.parse(json.choices?.[0]?.message?.content || "{}");
          const items = content.items || [];
          for (const item of items) {
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
              snippet: item.snippet || item.description || "Referência canônica da obra original",
              content_hash: `${slot.id}-${itemTitle}-${Date.now()}`,
            });
          }
        }
      } else if (targetJob.type === "suggest") {
        // Limpa rascunhos anteriores
        await supabase
          .from("suggestions")
          .delete()
          .eq("slot_id", slot.id)
          .neq("status", "chosen");

        // Busca as referências canônicas coletadas para este slot para orientar a IA
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
                  (r: { title: string; snippet: string; source_type: string }, idx: number) =>
                    `[Referência ${idx + 1} - ${r.source_type}]: ${r.title}\nDescrição da obra: ${r.snippet}`
                )
                .join("\n\n")
            : "Nenhuma referência prévia coletada. Use seu conhecimento enciclopédico sobre a lore canônica da obra.";

        const aiRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
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
          }),
        });

        if (aiRes.ok) {
          const json = await aiRes.json();
          const content = JSON.parse(json.choices?.[0]?.message?.content || "{}");
          const suggestions = content.suggestions || [];
          let pos = 1;
          for (const s of suggestions) {
            await supabase.from("suggestions").insert({
              slot_id: slot.id,
              position: pos++,
              title: s.title || `Golpe ${pos}`,
              visual_description: s.visual_description,
              animation_beats: s.animation_beats,
              vfx: s.vfx,
              fidelity_source: s.fidelity_source,
              hype_note: s.hype_note,
              roblox_feasibility: s.roblox_feasibility,
              image_prompt: s.image_prompt,
              model: "openai/gpt-oss-120b",
              status: "draft",
            });
          }
        }
      }

      progress++;
      await supabase.from("jobs").update({ progress }).eq("id", targetJob.id);
    }

    // Finaliza job
    await supabase
      .from("jobs")
      .update({ status: "done", finished_at: new Date().toISOString() })
      .eq("id", targetJob.id);

    return new Response(JSON.stringify({ success: true, job_id: targetJob.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
