import type { ReferenceCategory } from "./store";

export interface ReferenceCategoryConfig {
  id: ReferenceCategory;
  label: string;
  shortLabel: string;
  description: string;
}

export const REFERENCE_CATEGORIES: ReferenceCategoryConfig[] = [
  {
    id: "model_sheet",
    label: "Model Sheet",
    shortLabel: "Model Sheet",
    description: "Model sheets técnicos, proporções e vistas ortográficas frente/lado/costas.",
  },
  {
    id: "character",
    label: "Fotos Personagem",
    shortLabel: "Personagem",
    description: "Foto principal, poses, detalhes visuais e roupas do personagem.",
  },
  {
    id: "summon",
    label: "Invocações",
    shortLabel: "Invocações",
    description: "Fotos, model sheets e referências das invocações, pets ou stands.",
  },
  {
    id: "weapon",
    label: "Arma",
    shortLabel: "Arma",
    description: "Armas, espadas, cajados, relíquias, escudos e itens de combate.",
  },
];

export function getReferenceCategoryLabel(category?: ReferenceCategory | null): string {
  const found = REFERENCE_CATEGORIES.find((c) => c.id === category);
  return found ? found.label : "Fotos Personagem";
}

