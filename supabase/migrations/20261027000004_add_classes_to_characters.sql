-- Adiciona coluna de classes (múltipla escolha) aos personagens
-- Classes possíveis: Assassino, Atirador, Guerreiro, Tank, Mago, Suporte
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS classes text[] NOT NULL DEFAULT '{}'::text[];
