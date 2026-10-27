export type CharacterRarity = "raro" | "epico" | "lendario" | "mitico" | "secreto";

export interface RarityDetails {
  id: CharacterRarity;
  label: string;
  shortLabel: string;
  colorName: string;
  badgeClass: string;
  pillClass: string;
  dotClass: string;
  textClass?: string;
  borderClass: string;
  isRainbow?: boolean;
}

export const RARITIES: RarityDetails[] = [
  {
    id: "raro",
    label: "Raro",
    shortLabel: "Raro",
    colorName: "Azul",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.25)]",
    pillClass: "hover:border-blue-400/70 hover:bg-blue-500/10 data-[selected=true]:border-blue-400 data-[selected=true]:bg-blue-500/20 data-[selected=true]:text-blue-300 data-[selected=true]:shadow-[0_0_15px_rgba(59,130,246,0.35)]",
    dotClass: "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]",
    borderClass: "border-blue-500/50",
  },
  {
    id: "epico",
    label: "Épico",
    shortLabel: "Épico",
    colorName: "Roxo",
    badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.25)]",
    pillClass: "hover:border-purple-400/70 hover:bg-purple-500/10 data-[selected=true]:border-purple-400 data-[selected=true]:bg-purple-500/20 data-[selected=true]:text-purple-200 data-[selected=true]:shadow-[0_0_15px_rgba(168,85,247,0.35)]",
    dotClass: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
    borderClass: "border-purple-500/50",
  },
  {
    id: "lendario",
    label: "Lendário",
    shortLabel: "Lendário",
    colorName: "Dourado",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-400/50 shadow-[0_0_14px_rgba(251,191,36,0.3)]",
    pillClass: "hover:border-amber-400/70 hover:bg-amber-500/10 data-[selected=true]:border-amber-400 data-[selected=true]:bg-amber-500/20 data-[selected=true]:text-amber-200 data-[selected=true]:shadow-[0_0_15px_rgba(251,191,36,0.35)]",
    dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]",
    borderClass: "border-amber-400/60",
  },
  {
    id: "mitico",
    label: "Mítico",
    shortLabel: "Mítico",
    colorName: "RGB Arco-íris Roxeado",
    badgeClass: "badge-mythic-gradient border-purple-400/60 shadow-[0_0_16px_rgba(192,132,252,0.4)]",
    pillClass: "hover:border-purple-400/70 hover:bg-purple-500/10 data-[selected=true]:badge-mythic-gradient data-[selected=true]:border-purple-300 data-[selected=true]:shadow-[0_0_18px_rgba(192,132,252,0.5)]",
    dotClass: "bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 animate-pulse shadow-[0_0_8px_rgba(216,180,254,0.9)]",
    textClass: "text-mythic-rainbow",
    borderClass: "border-purple-400",
    isRainbow: true,
  },
  {
    id: "secreto",
    label: "Secreto",
    shortLabel: "Secreto",
    colorName: "Vermelho",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/50 shadow-[0_0_14px_rgba(239,68,68,0.35)]",
    pillClass: "hover:border-red-400/70 hover:bg-red-500/10 data-[selected=true]:border-red-500 data-[selected=true]:bg-red-500/20 data-[selected=true]:text-red-300 data-[selected=true]:shadow-[0_0_16px_rgba(239,68,68,0.4)]",
    dotClass: "bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.9)]",
    borderClass: "border-red-500/60",
  },
];

export function getRarityDetails(rarity?: string | null): RarityDetails {
  const found = RARITIES.find((r) => r.id === rarity);
  return found ?? RARITIES[0]!;
}


export const RARITY_WEIGHT: Record<CharacterRarity, number> = {
  raro: 1,
  epico: 2,
  lendario: 3,
  mitico: 4,
  secreto: 5,
};

export function getRarityWeight(rarity?: string | null): number {
  if (!rarity) return 0;
  return RARITY_WEIGHT[rarity as CharacterRarity] ?? 0;
}

