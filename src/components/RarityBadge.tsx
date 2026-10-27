import { getRarityDetails, type CharacterRarity } from "@/lib/rarity";
import { cn } from "@/lib/utils";

interface RarityBadgeProps {
  rarity?: CharacterRarity | string | null | undefined;
  size?: "xs" | "sm" | "md" | "lg" | undefined;
  showDot?: boolean | undefined;
  className?: string | undefined;
}


export function RarityBadge({
  rarity,
  size = "sm",
  showDot = true,
  className,
}: RarityBadgeProps) {
  const info = getRarityDetails(rarity);

  const sizeClasses = {
    xs: "px-1.5 py-0.5 text-[10px] gap-1",
    sm: "px-2 py-0.5 text-xs gap-1.5",
    md: "px-2.5 py-1 text-xs gap-1.5 font-medium",
    lg: "px-3 py-1 text-sm gap-2 font-semibold",
  };

  const dotSizes = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-2 w-2",
    lg: "h-2.5 w-2.5",
  };

  return (
    <span
      title={`Raridade: ${info.label} (${info.colorName})`}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border transition-all select-none font-semibold uppercase tracking-wider backdrop-blur-sm",
        sizeClasses[size],
        info.badgeClass,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            "rounded-full shrink-0",
            dotSizes[size],
            info.dotClass
          )}
        />
      )}
      <span className={cn(info.textClass)}>
        {info.label}
      </span>
    </span>
  );
}
