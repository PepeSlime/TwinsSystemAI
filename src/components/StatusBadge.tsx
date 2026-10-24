import { cn } from "@/lib/utils";
import type { Status } from "@/lib/store";

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", status === "done" ? "bg-success text-success-foreground" : "bg-pending/30 text-foreground", className)}>
      {status === "done" ? "Concluído" : "Em modelagem"}
    </span>
  );
}
