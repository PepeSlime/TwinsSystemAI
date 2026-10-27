import { Crosshair, Target, Swords, Shield, Sparkles, Heart } from "lucide-react";
import { getClassDetails, type CharacterClassId } from "@/lib/character-classes";
import { cn } from "@/lib/utils";

const CLASS_ICONS: Record<CharacterClassId, React.ComponentType<{ className?: string }>> = {
  assassino: Crosshair,
  atirador: Target,
  guerreiro: Swords,
  tank: Shield,
  mago: Sparkles,
  suporte: Heart,
};

interface ClassBadgeProps {
  classId: string;
  size?: "xs" | "sm" | "md" | undefined;
  showIcon?: boolean | undefined;
  className?: string | undefined;
}

export function ClassBadge({
  classId,
  size = "sm",
  showIcon = true,
  className,
}: ClassBadgeProps) {
  const details = getClassDetails(classId);
  const normalizedId = (details?.id || classId.toLowerCase()) as CharacterClassId;
  const IconComponent = CLASS_ICONS[normalizedId] || Swords;

  const sizeClasses = {
    xs: "px-1.5 py-0.2 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5 font-medium",
    md: "px-2.5 py-1 text-xs gap-1.5 font-semibold",
  };

  const iconSizes = {
    xs: "h-2.5 w-2.5",
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  };

  const label = details?.label || classId;
  const badgeClass = details?.badgeClass || "bg-muted text-muted-foreground border-border";

  return (
    <span
      title={details?.description ? `${label}: ${details.description}` : `Classe: ${label}`}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border transition-all select-none font-semibold uppercase tracking-wider backdrop-blur-sm",
        sizeClasses[size],
        badgeClass,
        className
      )}
    >
      {showIcon && <IconComponent className={cn(iconSizes[size], "shrink-0")} />}
      <span>{label}</span>
    </span>
  );
}
