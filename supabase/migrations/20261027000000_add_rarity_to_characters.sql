-- Add rarity to characters table
ALTER TABLE public.characters
ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'raro';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_character_rarity'
  ) THEN
    ALTER TABLE public.characters
    ADD CONSTRAINT check_character_rarity CHECK (rarity IN ('raro', 'epico', 'lendario', 'mitico', 'secreto'));
  END IF;
END $$;
