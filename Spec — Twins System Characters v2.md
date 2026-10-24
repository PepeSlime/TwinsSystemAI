# Spec — Twins System Characters v2

Planejamento técnico para evoluir o R6 Scale Manager: reconfigurar o Supabase, adicionar o buscador de referências de animação/VFX com IA e o gerador de OVERRIDES para o Blender.

## 1. Objetivo e escopo

O app hoje cadastra personagens R6, calcula a escala e controla o checklist de finalização. A v2 acrescenta três blocos:

1. **Etapa 0 — Reconfigurar o Supabase** (as credenciais atuais estão erradas) usando o conector MCP do Supabase.
2. **Funcionalidade A — Referências e sugestões de animação/VFX** por personagem, com *scraper* assíncrono, botão de busca, agendamento e IA (Grok/xAI) para gerar sugestões descritivas com imagem.
3. **Funcionalidade B — Gerador de OVERRIDES** a partir do model sheet, para alimentar o script do Blender (pal\_color, pal\_rough, pal\_metal).

**Fora de escopo:** login, cadastro de usuários, perfis, permissões por usuário. O app continua sendo uma ferramenta interna aberta, como já está definido no `AGENTS.md`.

## 2. Estado atual (diagnóstico do zip)

- **Stack:** TanStack Start + React 19 + Tailwind 4 + shadcn/ui, criado no Lovable, com `@supabase/supabase-js`.
- **Dados:** tabela única `public.characters` (nome, imagem, altura, escala, três flags do checklist, model sheet, status). RLS aberta para `anon` (select/insert/update/delete). Realtime ligado.
- **Arquivos:** bucket privado `characters`, com signed URLs de 10 anos geradas em `src/lib/store.ts`.
- **Credenciais:** o arquivo `env` aponta para o projeto `tnoreunmadrymajxagic` (Lovable Cloud). É esse projeto que precisa ser trocado pelo correto.
- **Migrações:** `drizzle/migrations/0000_migration.sql`, com `drizzle.config.ts` lendo `LOVABLE_DB_MIGRATION_URL`.
- **Arquivos gerados automaticamente:** `client.ts`, `types.ts`, `auth-middleware.ts`, `auth-attacher.ts`, `previewAuthStorage.ts`, `cron-auth.ts`. Não editar à mão; regenerar.
- **Rotas:** `/` (cadastro + lista) e `/personagem/$id` (detalhe + checklist + conclusão).
- **Regra de código existente:** toda a matemática de escala fica em `src/lib/scale.ts` com testes; todo acesso a dados passa por `src/lib/store.ts`. Manter.

## 3. Etapa 0 — Reconfigurar o Supabase via MCP

**Pré-requisito:** conectar o conector Supabase (MCP) à conta e informar qual projeto é o correto. Não vou assumir o project ref: quem decide é você.

**Passos (executados pela IA de desenvolvimento com o MCP):**

1. Listar organizações e projetos e confirmar o `project_ref` correto com o usuário.
2. Obter a URL do projeto e a chave publicável (publishable/anon).
3. Atualizar o arquivo de ambiente (renomear `env` para `.env`, com `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`). Garantir `.env` no `.gitignore`.
4. Aplicar a migração base (tabela `characters`, políticas, publicação realtime) e as novas migrações da seção 4, em `supabase/migrations/`. Passar a usar a CLI/MCP do Supabase no lugar do drizzle com `LOVABLE_DB_MIGRATION_URL`.
5. Criar os buckets: `characters` (existente, privado) e `references` (imagens das sugestões e miniaturas).
6. Gerar os tipos TypeScript do banco e substituir `src/integrations/supabase/types.ts`.
7. Cadastrar segredos das Edge Functions: `XAI_API_KEY` e, se for usado, o segredo de agendamento. A chave do Grok **nunca** vai para o front-end nem para o `.env` com prefixo `VITE_`.
8. Publicar as Edge Functions da seção 5 e ativar as extensões `pg_cron` e `pg_net`.
9. Rodar os advisors de segurança e performance do Supabase e corrigir os avisos relevantes.
10. Validar: cadastrar um personagem, subir imagem, ver o card atualizar em tempo real em duas abas.

**Critério de aceite:** o app abre apontando para o projeto correto, lê/grava personagens, sobe arquivos e recebe realtime. Nenhuma referência ao projeto antigo permanece no código.

## 4. Modelo de dados (novas migrações)

**Alterações em `characters`:** `universe` (texto: franquia/obra de origem, essencial para a busca), `evo_enabled` (boolean, padrão false).

**Novas tabelas:**

| Tabela | Campos principais | Função |
| --- | --- | --- |
| `ability_slots` | id, character\_id, form (`unevo`/`evo`), slot\_type (`passive`/`basic`/`skill`/`ultimate`), slot\_index, title, notes, chosen\_suggestion\_id | Um registro por passiva, ataque básico, habilidade N e ultimate/transformação de cada forma. O usuário escolhe quantas habilidades cada forma tem. |
| `reference_items` | id, slot\_id, source\_type (`live_action`/`comic`/`animation`/`game`/`other`), url, title, snippet, thumb\_path, content\_hash (único por slot), fetched\_at | Referências encontradas pelo scraper. Guarda link e miniatura, não o conteúdo integral. |
| `suggestions` | id, slot\_id, position, title, visual\_description, animation\_beats (jsonb: antecipação, impacto, finalização), vfx (jsonb: partículas, cores, trails, beams, som), fidelity\_source, hype\_note, roblox\_feasibility, image\_prompt, image\_path, model, status (`draft`/`chosen`/`discarded`) | Sugestões criativas, mínimo 4 por slot. |
| `jobs` | id, type (`scrape`/`suggest`/`image`/`overrides`), character\_id, scope (jsonb), status (`queued`/`running`/`done`/`failed`/`canceled`), progress, total, error, cost\_estimate, created\_at, started\_at, finished\_at | Fila assíncrona; a interface acompanha por realtime. |
| `job_schedules` | id, character\_id (nulo = todos), scope (jsonb), cron, enabled, last\_run\_at | Agendamentos de busca. |
| `overrides_runs` | id, character\_id, input\_materials (texto), part\_hints (texto), result\_json, result\_python, result\_table, questions, model, prompt\_version, created\_at | Histórico do gerador de OVERRIDES. |
| `prompt_templates` | id, key, version, body, active | Guarda o prompt do OVERRIDES (apêndice) e os prompts de busca/sugestão, editáveis sem novo deploy. |
| `ai_usage` | id, day, kind, calls, est\_cost | Controle de gasto diário. |

**RLS (sem login):** `anon` lê tudo, e pode inserir/editar apenas `ability_slots` e a escolha em `suggestions`. Tabelas de resultado de IA (`reference_items`, `suggestions` geradas, `jobs`, `overrides_runs`, `ai_usage`) são **escritas só pelas Edge Functions** com a service role. Realtime ligado em `jobs`, `ability_slots`, `suggestions`, `reference_items`.

## 5. Arquitetura assíncrona (Edge Functions)

O trabalho pesado roda em Edge Functions do Supabase, não no navegador e não no servidor do TanStack (que roda em ambiente de borda com limite de tempo).

- **`enqueue-job`:** recebe tipo e escopo, valida limites, grava em `jobs` com status `queued` e responde na hora com o `job_id`. A tela não trava.
- **`run-job`:** pega o próximo job com `FOR UPDATE SKIP LOCKED`, processa **um slot por invocação** (para respeitar o limite de tempo), atualiza `progress` e se reinvoca até acabar. Em falha: até 3 tentativas com espera crescente, depois `failed` com a mensagem de erro.
- **`dispatch-schedules`:** chamada pelo `pg_cron` a cada poucos minutos; enfileira jobs dos agendamentos cujo horário chegou.
- **`overrides-generate`:** síncrona e curta (uma chamada de visão), seção 7.
- **Proteção sem login:** como não há usuário, os endpoints ficam abertos. Para evitar que qualquer pessoa com a URL gaste créditos, aplicar limite por IP (por hora), teto diário em `ai_usage` com bloqueio e aviso na tela, e o botão de cancelar job. Uma senha compartilhada da equipe (sem conta de usuário) fica como melhoria opcional.

## 6. Funcionalidade A — Referências e sugestões de animação/VFX

### 6.1 Interface

Na página do personagem, nova aba **Animações & VFX**:

- Campo **Universo/obra** e interruptor **Tem forma Evoluída (Evo)**.
- Duas sub-abas: **Unevo** e **Evo** (Evo só aparece se ativada). Cada uma com a mesma estrutura:
  - Passiva
  - Ataque básico
  - Habilidade 1 … N, com botões para adicionar e remover (a quantidade é escolhida por forma)
  - Ultimate / Transformação
- Cada slot é um cartão com: galeria de referências (com filtro por origem: live action, HQ, animação), **4 sugestões** em cards (título, descrição, beats da animação, VFX, nota de hype, imagem), e as ações **Escolher**, **Descartar**, **Regenerar**, **Gerar mais 4**, **Editar texto**.
- Botões globais: **Buscar referências** (escopo: personagem inteiro, só uma forma ou só um slot), **Agendar busca** (diária, semanal ou cron personalizado, com escopo) e **Gerar sugestões**.
- Painel **Fila** (rota `/fila`): jobs em andamento com barra de progresso, histórico, erros, cancelar, e lista de agendamentos para ligar/desligar.

### 6.2 Pipeline do job de busca (por slot)

1. **Montar consultas:** nome + universo + forma + tipo de slot, em variações por mídia (filme/série live action, quadrinhos, animação, jogos). Ex.: `<personagem> <universo> power VFX live action`.
2. **Buscar:** usar a ferramenta de busca na web da API do Grok (Responses API com `web_search`), pedindo saída estruturada com URL, título, tipo de mídia e trecho. Se a qualidade for baixa para algum universo, o plano B é um provedor de busca dedicado (Brave, Tavily ou similar) mantendo o mesmo contrato de saída.
3. **Enriquecer:** para cada URL, ler `og:title` e `og:image` e salvar uma miniatura em `references`. Respeitar `robots.txt`, limitar a taxa por domínio e identificar o user-agent.
4. **Deduplicar** por `content_hash` e **descartar** resultados sem relação clara com o personagem.
5. **Salvar** em `reference_items` e atualizar o progresso do job.

**Cuidado legal:** guardar links e miniaturas para consulta interna, não copiar páginas nem imagens inteiras. Por se tratar de personagens de obras existentes, as imagens geradas por IA são conceito interno de produção; vale revisar direitos antes de qualquer uso público no jogo.

### 6.3 Pipeline de sugestões (por slot)

1. **Contexto:** referências já coletadas, descrição do personagem, forma (Unevo ou Evo), tipo de slot e as restrições do Roblox R6 (6 partes, 6 juntas, sem animação facial, VFX por ParticleEmitter, Beam, Trail, luz e som).
2. **Análise visual (opcional):** modelo com visão descreve as miniaturas das referências (cores, formas, energia, enquadramento) para dar fidelidade ao prompt.
3. **Geração de texto:** modelo de raciocínio do Grok gera **no mínimo 4** sugestões em JSON, cada uma fiel a uma fonte (live action, HQ ou animação) ou a um mix declarado, com foco em **hype para o jogador**: antecipação, impacto, finalização, VFX, cores, som e a justificativa do hype. Também devolve a viabilidade no Roblox e um `image_prompt`.
4. **Geração de imagem:** modelo de imagem do Grok cria uma imagem por sugestão, salva em `references`. Falha de imagem não derruba a sugestão; fica com botão **Regenerar imagem**.
5. **Validação:** JSON conferido por schema (zod). Respostas inválidas têm uma nova tentativa com a mensagem de erro.

**Modelos:** não fixar nomes no código. Ler a lista de modelos disponíveis na conta (`/v1/models`) e guardar os escolhidos (texto/raciocínio, visão, imagem) em configuração editável, porque a oferta da xAI muda com frequência e a disponibilidade depende da conta. Confirmar na documentação oficial da xAI antes de implementar.

### 6.4 Critérios de aceite

- Clicar em **Buscar referências** devolve o controle à tela em menos de 2 segundos e o progresso aparece em tempo real.
- Cada slot tem no mínimo 4 sugestões com texto e imagem após o job de sugestões.
- É possível configurar 0 a N habilidades por forma e alternar entre Unevo e Evo sem perder dados.
- Um agendamento criado dispara sozinho no horário e aparece na fila.
- Falhas aparecem na fila com mensagem legível e botão de tentar de novo.

## 7. Funcionalidade B — Gerador de OVERRIDES para o Blender

### 7.1 Interface

Nova aba **Overrides Blender** na página do personagem:

1. **Model sheet:** usa o arquivo já anexado ao personagem (imagem). Se for PDF, converter a primeira página em imagem no navegador antes de enviar. Permitir trocar a imagem aqui mesmo.
2. **Bloco OVERRIDES do script:** caixa de texto grande para colar o bloco que o script do Blender imprime (com os nomes exatos dos materiais).
3. **Descrição opcional** de qual material é qual parte do personagem.
4. Botão **Gerar OVERRIDES**.
5. Resultado: bloco de código Python com **Copiar** e **Baixar .py**, tabela (material, parte, cor com amostra visual, dúvida) e lista de **não mapeados**.
6. Se a IA fizer uma pergunta, mostrar a pergunta com um campo de resposta e um botão **Responder e gerar de novo**.
7. **Histórico** das execuções por personagem, com restaurar e comparar.

### 7.2 Como funciona

- O prompt do apêndice é guardado em `prompt_templates` (chave `overrides`, versionado) e usado como instrução de sistema, sem alterações de conteúdo.
- A Edge Function envia imagem + bloco colado + descrição a um modelo do Grok com visão, com temperatura baixa e pedindo também uma saída estruturada em JSON (lista de materiais, tabela, perguntas), que o app transforma no texto final.
- **Validação em código (determinística), antes de mostrar:**
  - O conjunto de chaves da saída é **idêntico** ao do bloco de entrada (nenhuma chave nova, renomeada ou faltando).
  - `color` no formato `#RRGGBB` em maiúsculas; sem `#000000` e `#FFFFFF` (trocar por `#111111` e `#F2F2F2`).
  - `metallic` e `roughness` entre 0.00 e 1.00, com duas casas.
  - Python válido: aspas duplas, vírgulas, chaves fechadas e sem comentários dentro do dicionário.
  - Em caso de erro: uma nova tentativa automática enviando a lista de problemas; se persistir, mostrar o erro e a saída bruta.
- O app renderiza o bloco `OVERRIDES = { ... }` por código a partir do JSON validado, garantindo o formato exato exigido pelo script.
- Melhoria opcional: contagem de cores dominantes do model sheet feita no navegador (canvas) e enviada como dica, para reduzir erro de estimativa por olho.

### 7.3 Critérios de aceite

- Com um model sheet e um bloco de entrada de exemplo, o resultado cola direto no script do Blender sem edição manual.
- Nenhum nome de material é alterado, e materiais sem correspondência no model sheet aparecem como "não mapeado" com os valores originais.
- A execução fica salva no histórico do personagem.

## 8. Estrutura de código sugerida

- **Rotas:** `/personagem/$id?tab=checklist|animacoes|overrides` e `/fila`.
- **Componentes novos:** `AbilityTabs`, `AbilitySlotCard`, `SuggestionCard`, `ReferenceGallery`, `ScheduleDialog`, `JobQueuePanel`, `OverridesGenerator`, `OverridesResult`.
- **Camada de dados:** manter o padrão do `store.ts`, criando `abilities-store.ts`, `jobs-store.ts` e `overrides-store.ts`, todos com realtime.
- **Servidor:** `supabase/functions/{enqueue-job,run-job,dispatch-schedules,overrides-generate}` e `supabase/migrations/`.
- **Testes:** validador de OVERRIDES em `src/lib/overrides.ts` com testes (mesmo padrão do `scale.test.ts`); schemas zod das respostas da IA.

## 9. Ordem de entrega

1. **Fase 0:** Supabase correto, migrações, tipos, buckets, segredos.
2. **Fase 1:** Overrides Blender (menor, valor imediato, não depende de scraper).
3. **Fase 2:** Abas Unevo/Evo e slots de habilidade (só dados e interface, sem IA).
4. **Fase 3:** Fila assíncrona + busca de referências + botão de busca.
5. **Fase 4:** Sugestões com imagem (mínimo 4 por slot).
6. **Fase 5:** Agendamento, limites de custo e painel de fila.

## 10. Pendências para você decidir

1. Qual é o **project ref** correto do Supabase?
2. Você já tem a **chave da API da xAI** (e quanto quer gastar por dia no máximo)?
3. Cada personagem vem de qual **universo/obra**? Isso melhora muito a precisão da busca.
4. Quer manter o app 100% aberto ou aceita uma **senha única da equipe** só para proteger o gasto de IA?

## Apêndice — Prompt do gerador de OVERRIDES (guardar em `prompt_templates`)

```
Você é um assistente que gera o dicionário OVERRIDES de um script do Blender que cria paletas de textura (pal_color, pal_rough, pal_metal) para personagens do Roblox. Seu trabalho é preencher cor, metal e rugosidade de cada material a partir de um model sheet.

# ENTRADAS QUE VOCÊ VAI RECEBER
1. Uma imagem do model sheet do personagem.
2. O bloco OVERRIDES impresso pelo script, com os nomes EXATOS dos materiais.
   Exemplo do que vem:
   OVERRIDES = {
       "Metal048C_1K-PNG_NORMAL": {"color": "#C0C0C0", "metallic": 0.50, "roughness": 0.50},
       "Skin": {"color": "#FFFFFF", "metallic": 0.00, "roughness": 0.50},
   }
3. Opcional: a descrição de qual material é qual parte do personagem.

# O QUE VOCÊ DEVE ENTREGAR
Um único bloco de código Python com o OVERRIDES atualizado, seguido de uma tabela curta (material, parte do personagem, cor escolhida, dúvida se houver).

# FORMATO OBRIGATÓRIO
- As chaves são os nomes dos materiais, copiados EXATAMENTE como vieram (maiúsculas, pontos, traços, números). Nunca renomeie, traduza, abrevie nem invente chaves.
- Cada valor tem exatamente três campos: "color", "metallic", "roughness".
- "color": hex em maiúsculas, com # e 6 dígitos (ex.: "#D4A017").
- "metallic" e "roughness": números de 0.0 a 1.0, com duas casas decimais.
- Python válido: aspas duplas, vírgulas entre itens, chaves fechadas. Nada de comentários dentro do dicionário.

# REGRAS PARA NÃO ERRAR
- Use somente cores que aparecem no model sheet. Não invente peças, acessórios nem cores que não estão na imagem.
- Se um material da lista não corresponde a nada visível no model sheet, mantenha os valores que vieram e liste-o como "não mapeado" na tabela. Não chute.
- Se não for possível saber qual parte do personagem é um material, faça UMA pergunta curta em vez de adivinhar.
- Escolha a cor dominante e chapada de cada região (sem sombra, brilho ou reflexo). Não faça média de várias cores.
- Você estima as cores olhando a imagem, então elas são aproximadas. Diga isso na tabela quando a imagem for pequena, escura ou comprimida.

# GUIA DE METAL E RUGOSIDADE
- Metal (armadura, joias, fivelas): metallic 1.00. Rugosidade: polido 0.20 a 0.35, escovado ou gasto 0.40 a 0.55.
- Não metal (pele, cabelo, tecido, couro, plástico): metallic 0.00.
- Rugosidade de não metais: pele 0.50 a 0.70, cabelo 0.50 a 0.70, couro 0.60 a 0.75, tecido 0.80 a 0.95, plástico 0.40 a 0.60.
- Evite valores intermediários de metallic (como 0.50), exceto em tinta sobre metal.

# GUIA DE COR PARA O ROBLOX
- Metais escurecem no Roblox: deixe a cor do metal um pouco mais clara e saturada do que parece no model sheet.
- Evite preto puro (#000000) e branco puro (#FFFFFF). Use #111111 e #F2F2F2.
- Pele: tons naturais, nunca branco puro.

# EXEMPLO
Entrada: materiais "Armadura_Ouro", "Pele", "Cabelo". Model sheet com armadura dourada polida, pele clara e cabelo azul.
Saída:
python
OVERRIDES = {
    "Armadura_Ouro": {"color": "#D4A017", "metallic": 1.00, "roughness": 0.30},
    "Pele": {"color": "#F1C9A5", "metallic": 0.00, "roughness": 0.60},
    "Cabelo": {"color": "#3F8FD9", "metallic": 0.00, "roughness": 0.60},
}

| Material | Parte | Cor | Dúvida |
|---|---|---|---|
| Armadura_Ouro | armadura | #D4A017 | nenhuma |
| Pele | rosto e ombros | #F1C9A5 | cor estimada pela imagem |
| Cabelo | cabelo | #3F8FD9 | nenhuma |

Responda sempre em português.
```
