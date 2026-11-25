-- ============================================================================
-- MÓDULO DE CONTROLE DE PONTO, JORNADA E GESTÃO DE COLABORADORES
-- ============================================================================

-- 1. Tabela de Colaboradores
CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  avatar_url text,
  department text NOT NULL DEFAULT 'Geral',
  role text NOT NULL DEFAULT 'Colaborador',
  work_schedule text NOT NULL DEFAULT '09:00 - 18:00 (1h intervalo)',
  daily_hours numeric NOT NULL DEFAULT 8,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabela de Registros de Ponto Diário
CREATE TABLE IF NOT EXISTS public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  entry_time timestamptz,
  lunch_start timestamptz,
  lunch_end timestamptz,
  exit_time timestamptz,
  total_worked_minutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'lunch', 'finished', 'inconsistent')),
  inconsistency_type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_employee_date UNIQUE (employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON public.time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON public.time_entries(date);

-- 3. Tabela de Solicitações de Ajuste / Justificativas
CREATE TABLE IF NOT EXISTS public.time_adjustment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.time_entries(id) ON DELETE CASCADE,
  date date NOT NULL,
  target_punch text NOT NULL CHECK (target_punch IN ('entry_time', 'lunch_start', 'lunch_end', 'exit_time', 'full_day')),
  requested_time timestamptz,
  requested_time_str text,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  original_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_time_adjustments_employee ON public.time_adjustment_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_adjustments_status ON public.time_adjustment_requests(status);

-- 4. Tabela de Calendário / Eventos Corporativos
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE,
  title text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('holiday', 'corporate', 'day_off', 'vacation', 'absence')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  description text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(start_date, end_date);

-- Políticas RLS Abertas (design de ferramenta interna com anon)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_adjustment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team all employees" ON public.employees;
CREATE POLICY "team all employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team all time_entries" ON public.time_entries;
CREATE POLICY "team all time_entries" ON public.time_entries FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team all time_adjustments" ON public.time_adjustment_requests;
CREATE POLICY "team all time_adjustments" ON public.time_adjustment_requests FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "team all calendar_events" ON public.calendar_events;
CREATE POLICY "team all calendar_events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);

-- Dados Iniciais de Colaboradores e Eventos (Se a tabela estiver vazia)
INSERT INTO public.employees (name, email, department, role, work_schedule, daily_hours, is_admin)
VALUES 
  ('Ana Souza', 'ana.souza@twins.com', 'Recursos Humanos', 'Gestora de RH / Admin', '09:00 - 18:00 (1h intervalo)', 8, true),
  ('Pedro Santos', 'pedro.santos@twins.com', 'Desenvolvimento', 'Lead Game Developer', '09:00 - 18:00 (1h intervalo)', 8, false),
  ('Lucas Silva', 'lucas.silva@twins.com', 'Arte & 3D', 'Artista 3D / Modeler', '10:00 - 19:00 (1h intervalo)', 8, false),
  ('Beatriz Lima', 'beatriz.lima@twins.com', 'VFX & Animação', 'Animadora R6 / VFX Artist', '09:00 - 18:00 (1h intervalo)', 8, false)
ON CONFLICT DO NOTHING;

-- Feriados e Eventos de Exemplo
INSERT INTO public.calendar_events (title, event_type, start_date, end_date, description, created_by)
VALUES
  ('Confraternização da Equipe', 'corporate', current_date + 7, current_date + 7, 'Encontro de alinhamento e celebração dos lançamentos', 'RH'),
  ('Feriado Nacional', 'holiday', current_date + 15, current_date + 15, 'Feriado sem expediente', 'RH')
ON CONFLICT DO NOTHING;
