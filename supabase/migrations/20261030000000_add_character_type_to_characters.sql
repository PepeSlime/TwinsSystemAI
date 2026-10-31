-- Adiciona coluna de tipo do personagem (herói ou inimigo) aos personagens
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS character_type text NOT NULL DEFAULT 'hero';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_character_type'
  ) THEN
    ALTER TABLE public.characters
    ADD CONSTRAINT check_character_type CHECK (character_type IN ('hero', 'enemy'));
  END IF;
END $$;

