-- Base table: characters
CREATE TABLE IF NOT EXISTS public.characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  universe text,
  evo_enabled boolean NOT NULL DEFAULT false,
  image_url text,
  height_m numeric,
  scale numeric,
  anchored_ok boolean NOT NULL DEFAULT false,
  cancollide_ok boolean NOT NULL DEFAULT false,
  scale_ok boolean NOT NULL DEFAULT false,
  model_sheet_url text,
  model_sheet_name text,
  model_sheet_type text,
  status text NOT NULL DEFAULT 'modeling',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ability slots
CREATE TABLE IF NOT EXISTS public.ability_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
  form text NOT NULL CHECK (form IN ('unevo', 'evo')),
  slot_type text NOT NULL CHECK (slot_type IN ('passive', 'basic', 'skill', 'ultimate')),
  slot_index integer NOT NULL DEFAULT 0,
  title text,
  notes text,
  chosen_suggestion_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ability_slots_character_id ON public.ability_slots(character_id);

-- Reference items found by scraper
CREATE TABLE IF NOT EXISTS public.reference_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.ability_slots(id) ON DELETE CASCADE,
  source_type text NOT NULL DEFAULT 'other' CHECK (source_type IN ('live_action', 'comic', 'animation', 'game', 'other')),
  url text NOT NULL,
  title text,
  snippet text,
  thumb_path text,
  content_hash text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_reference_items_slot_hash UNIQUE (slot_id, content_hash)
);
CREATE INDEX IF NOT EXISTS idx_reference_items_slot_id ON public.reference_items(slot_id);

-- Suggestions (at least 4 per slot)
CREATE TABLE IF NOT EXISTS public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.ability_slots(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  visual_description text,
  animation_beats jsonb,
  vfx jsonb,
  fidelity_source text,
  hype_note text,
  roblox_feasibility text,
  image_prompt text,
  image_path text,
  model text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'chosen', 'discarded')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_suggestions_slot_id ON public.suggestions(slot_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON public.suggestions(status);

-- FK for chosen_suggestion_id on ability_slots
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_ability_slots_chosen_suggestion'
  ) THEN
    ALTER TABLE public.ability_slots
      ADD CONSTRAINT fk_ability_slots_chosen_suggestion
      FOREIGN KEY (chosen_suggestion_id) REFERENCES public.suggestions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Background jobs
CREATE TABLE IF NOT EXISTS public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('scrape', 'suggest', 'image', 'overrides')),
  character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE,
  scope jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed', 'canceled')),
  progress integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  error text,
  cost_estimate numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_jobs_character_id ON public.jobs(character_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

-- Job schedules
CREATE TABLE IF NOT EXISTS public.job_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE,
  scope jsonb,
  cron text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_schedules_character_id ON public.job_schedules(character_id);

-- Overrides runs history
CREATE TABLE IF NOT EXISTS public.overrides_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES public.characters(id) ON DELETE CASCADE,
  input_materials text,
  part_hints text,
  result_json jsonb,
  result_python text,
  result_table jsonb,
  questions jsonb,
  model text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_overrides_runs_character_id ON public.overrides_runs(character_id);

-- Prompt templates
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  version text NOT NULL,
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_prompt_templates_key_version UNIQUE (key, version)
);

-- AI Usage tracking
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL DEFAULT CURRENT_DATE,
  kind text NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  est_cost numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_usage_day ON public.ai_usage(day);

-- RLS setup (internal tool, no login)
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overrides_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- Characters policies
CREATE POLICY "team read characters" ON public.characters FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team insert characters" ON public.characters FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "team update characters" ON public.characters FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team delete characters" ON public.characters FOR DELETE TO anon, authenticated USING (true);

-- Ability slots policies
CREATE POLICY "team read ability_slots" ON public.ability_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team insert ability_slots" ON public.ability_slots FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "team update ability_slots" ON public.ability_slots FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team delete ability_slots" ON public.ability_slots FOR DELETE TO anon, authenticated USING (true);

-- Suggestions policies
CREATE POLICY "team read suggestions" ON public.suggestions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team insert suggestions" ON public.suggestions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "team update suggestions" ON public.suggestions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team delete suggestions" ON public.suggestions FOR DELETE TO anon, authenticated USING (true);

-- Reference items policies
CREATE POLICY "team read reference_items" ON public.reference_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team insert reference_items" ON public.reference_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "team update reference_items" ON public.reference_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team delete reference_items" ON public.reference_items FOR DELETE TO anon, authenticated USING (true);

-- Jobs policies
CREATE POLICY "team read jobs" ON public.jobs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team insert jobs" ON public.jobs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "team update jobs" ON public.jobs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Job schedules policies
CREATE POLICY "team read job_schedules" ON public.job_schedules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team insert job_schedules" ON public.job_schedules FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "team update job_schedules" ON public.job_schedules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team delete job_schedules" ON public.job_schedules FOR DELETE TO anon, authenticated USING (true);

-- Overrides runs policies
CREATE POLICY "team read overrides_runs" ON public.overrides_runs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team insert overrides_runs" ON public.overrides_runs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Prompt templates policies
CREATE POLICY "team read prompt_templates" ON public.prompt_templates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team write prompt_templates" ON public.prompt_templates FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- AI usage policies
CREATE POLICY "team read ai_usage" ON public.ai_usage FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "team write ai_usage" ON public.ai_usage FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'characters'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.characters;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'ability_slots'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ability_slots;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'suggestions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.suggestions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reference_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reference_items;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;
END $$;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('characters', 'characters', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('references', 'references', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "team files read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id IN ('characters', 'references'));
CREATE POLICY "team files insert" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id IN ('characters', 'references'));
CREATE POLICY "team files update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id IN ('characters', 'references'));
CREATE POLICY "team files delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id IN ('characters', 'references'));

-- Seed Overrides prompt
INSERT INTO public.prompt_templates (key, version, body, active)
VALUES (
  'overrides',
  'v1',
  $$Você é um assistente que gera o dicionário OVERRIDES de um script do Blender que cria paletas de textura (pal_color, pal_rough, pal_metal) para personagens do Roblox. Seu trabalho é preencher cor, metal e rugosidade de cada material a partir de um model sheet.

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

Responda sempre em português.$$,
  true
) ON CONFLICT (key, version) DO NOTHING;
