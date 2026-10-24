import { Copy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fmt, round3, type ScaleCalc } from "@/lib/scale";

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => toast.success("Copiado!", { description: text }));
}

export function ScaleResult({ calc }: { calc: ScaleCalc }) {
  const cmd = `model:ScaleTo(${round3(calc.scale)})`;
  return (
    <div className="space-y-4 rounded-lg border border-primary/30 bg-card/60 p-4 shadow-glow">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md bg-muted p-3">
          <p className="text-xs uppercase text-muted-foreground">Altura final</p>
          <p className="font-display text-3xl font-bold">{fmt(calc.studs)} <span className="text-base text-muted-foreground">studs</span></p>
        </div>
        <div className="flex items-center justify-between rounded-md bg-muted p-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Fator de escala</p>
            <p className="font-display text-3xl font-bold text-primary">{fmt(calc.scale)}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => copy(String(round3(calc.scale)))}>
            <Copy className="h-4 w-4" /> Copiar
          </Button>
        </div>
      </div>

      {calc.warnings.map((w) => (
        <div key={w} className="flex items-center gap-2 rounded-md border border-warning/50 bg-warning/10 p-2 text-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {w}
        </div>
      ))}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-2 text-left">Parte</th>
              <th className="py-2 text-right">Base (X × Y × Z)</th>
              <th className="py-2 text-right">Escalado (X × Y × Z)</th>
            </tr>
          </thead>
          <tbody>
            {calc.parts.map((p) => (
              <tr key={p.name} className="border-b border-border/50">
                <td className="py-1.5">{p.name} <span className="text-muted-foreground">· {p.label}</span></td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">{p.base.join(" × ")}</td>
                <td className="py-1.5 text-right font-mono text-primary">{p.scaled.map((v) => fmt(v)).join(" × ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-md bg-background p-2 font-mono text-sm">
        <code className="text-success">{cmd}</code>
        <Button size="sm" variant="ghost" onClick={() => copy(cmd)}>
          <Copy className="h-4 w-4" /> Copiar
        </Button>
      </div>
    </div>
  );
}
