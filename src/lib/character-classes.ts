export type CharacterClassId =
  | "assassino"
  | "atirador"
  | "guerreiro"
  | "tank"
  | "mago"
  | "suporte";

export interface CharacterClassDetails {
  id: CharacterClassId;
  label: string;
  description: string;
  badgeClass: string;
  pillClass: string;
  dotClass: string;
  colorName: string;
}

export const CHARACTER_CLASSES: CharacterClassDetails[] = [
  {
    id: "assassino",
    label: "Assassino",
    description: "Alto dano pontual e mobilidade rápida",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]",
    pillClass: "hover:border-rose-400/70 hover:bg-rose-500/10 data-[selected=true]:border-rose-400 data-[selected=true]:bg-rose-500/20 data-[selected=true]:text-rose-300 data-[selected=true]:shadow-[0_0_14px_rgba(244,63,94,0.3)]",
    dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
    colorName: "Rosa Carmesim",
  },
  {
    id: "atirador",
    label: "Atirador",
    description: "Ataques de longa distância e dano contínuo",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]",
    pillClass: "hover:border-amber-400/70 hover:bg-amber-500/10 data-[selected=true]:border-amber-400 data-[selected=true]:bg-amber-500/20 data-[selected=true]:text-amber-200 data-[selected=true]:shadow-[0_0_14px_rgba(245,158,11,0.3)]",
    dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
    colorName: "Laranja Âmbar",
  },
  {
    id: "guerreiro",
    label: "Guerreiro",
    description: "Combate corpo a corpo equilibrado e resistente",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]",
    pillClass: "hover:border-red-400/70 hover:bg-red-500/10 data-[selected=true]:border-red-400 data-[selected=true]:bg-red-500/20 data-[selected=true]:text-red-300 data-[selected=true]:shadow-[0_0_14px_rgba(239,68,68,0.3)]",
    dotClass: "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.8)]",
    colorName: "Vermelho Fogo",
  },
  {
    id: "tank",
    label: "Tank",
    description: "Defesa extrema, controle de grupo e absorção de dano",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.25)]",
    pillClass: "hover:border-blue-400/70 hover:bg-blue-500/10 data-[selected=true]:border-blue-400 data-[selected=true]:bg-blue-500/20 data-[selected=true]:text-blue-300 data-[selected=true]:shadow-[0_0_14px_rgba(59,130,246,0.3)]",
    dotClass: "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]",
    colorName: "Azul Escudo",
  },
  {
    id: "mago",
    label: "Mago",
    description: "Habilidades mágicas de área e alto impacto",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]",
    pillClass: "hover:border-purple-400/70 hover:bg-purple-500/10 data-[selected=true]:border-purple-400 data-[selected=true]:bg-purple-500/20 data-[selected=true]:text-purple-200 data-[selected=true]:shadow-[0_0_14px_rgba(168,85,247,0.3)]",
    dotClass: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
    colorName: "Roxo Místico",
  },
  {
    id: "suporte",
    label: "Suporte",
    description: "Cura, buffs para aliados e auxílio em batalha",
    badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]",
    pillClass: "hover:border-emerald-400/70 hover:bg-emerald-500/10 data-[selected=true]:border-emerald-400 data-[selected=true]:bg-emerald-500/20 data-[selected=true]:text-emerald-200 data-[selected=true]:shadow-[0_0_14px_rgba(16,185,129,0.3)]",
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
    colorName: "Verde Esmeralda",
  },
];

export function getClassDetails(classId: string): CharacterClassDetails | undefined {
  const normalized = classId.toLowerCase().trim();
  return CHARACTER_CLASSES.find((c) => c.id === normalized || c.label.toLowerCase() === normalized);
}
