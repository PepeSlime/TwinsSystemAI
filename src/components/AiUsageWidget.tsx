import { useState } from "react";
import { DollarSign, Cpu, AlertTriangle, ShieldCheck, Settings2, Check, Zap, Layers } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDailyAiUsage, saveDailyBudget } from "@/lib/ai-usage-store";
import { AiModelSelector } from "./AiModelSelector";
import { useActiveAiModel } from "@/lib/ai-models";

export function AiUsageWidget() {
  const { totalCost, totalCalls, budget, isBudgetExceeded, remainingBudget, loading } = useDailyAiUsage();
  const { activeModel, config: activeConfig } = useActiveAiModel();
  const [editingBudget, setEditingBudget] = useState(false);
  const [newBudgetVal, setNewBudgetVal] = useState(String(budget));

  const percentUsed = budget > 0 ? Math.min(100, Math.round((totalCost / budget) * 100)) : 0;

  const handleSaveBudget = () => {
    const val = parseFloat(newBudgetVal);
    if (isNaN(val) || val <= 0) {
      toast.error("Informe um valor numérico válido maior que 0.");
      return;
    }
    saveDailyBudget(val);
    setEditingBudget(false);
    toast.success(`Orçamento diário atualizado para $${val.toFixed(2)} USD.`);
    window.location.reload(); // atualiza o estado geral
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card/60 p-4 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded mb-2" />
        <div className="h-6 w-48 bg-muted rounded" />
      </div>
    );
  }

  const isWarning = percentUsed >= 75 && !isBudgetExceeded;

  return (
    <div
      className={`rounded-xl border p-4.5 transition-all shadow-xs ${
        isBudgetExceeded
          ? "border-destructive/40 bg-destructive/5"
          : isWarning
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border/70 bg-card/70"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isBudgetExceeded
                ? "bg-destructive/15 text-destructive"
                : isWarning
                ? "bg-amber-500/15 text-amber-500"
                : "bg-primary/15 text-primary"
            }`}
          >
            <DollarSign className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Gasto Diário com IA (Groq / Vision)
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 h-4.5 gap-1 ${
                  isBudgetExceeded
                    ? "border-destructive/40 text-destructive bg-destructive/10"
                    : isWarning
                    ? "border-amber-500/40 text-amber-500 bg-amber-500/10"
                    : "border-green-500/40 text-green-500 bg-green-500/10"
                }`}
              >
                {isBudgetExceeded ? (
                  <>
                    <AlertTriangle className="h-2.5 w-2.5" /> Limite Atingido
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-2.5 w-2.5" /> Seguro
                  </>
                )}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Orçamento de proteção para evitar custos acidentais com a API
            </p>
          </div>
        </div>

        {/* Controles de Modelo e Ajuste de Orçamento */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Modelo de IA */}
          <AiModelSelector />

          {/* Ajuste de Orçamento */}
          {editingBudget ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.5"
                min="0.1"
                className="h-7 w-20 text-xs px-2"
                value={newBudgetVal}
                onChange={(e) => setNewBudgetVal(e.target.value)}
                autoFocus
              />
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleSaveBudget}>
                <Check className="h-3.5 w-3.5 text-primary" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1 border-border/60 hover:bg-muted"
              onClick={() => {
                setNewBudgetVal(String(budget));
                setEditingBudget(true);
              }}
            >
              <Settings2 className="h-3 w-3" />
              <span>Ajustar Teto (${budget.toFixed(2)})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Métricas e Barra de Progresso */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-foreground">
              ${totalCost.toFixed(4)}
            </span>
            <span className="text-muted-foreground">de ${budget.toFixed(2)} USD</span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Cpu className="h-3 w-3" /> {totalCalls} {totalCalls === 1 ? "chamada" : "chamadas"}
            </span>
            <span>
              Restante: <strong className="text-foreground">${remainingBudget.toFixed(4)}</strong>
            </span>
            <span className="font-semibold text-foreground">{percentUsed}%</span>
          </div>
        </div>

        <Progress
          value={percentUsed}
          className={`h-2 ${
            isBudgetExceeded
              ? "[&>div]:bg-destructive"
              : isWarning
              ? "[&>div]:bg-amber-500"
              : "[&>div]:bg-primary"
          }`}
        />
      </div>

      {/* Faixa Informativa do Modelo de IA & Limites de Cota */}
      <div className="mt-3.5 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[11px] font-mono border-primary/30 text-foreground bg-primary/5 gap-1.5 py-0.5">
            <Cpu className="h-3 w-3 text-primary" />
            <span>{activeConfig.name}</span>
            <span className="text-muted-foreground">({activeConfig.params})</span>
          </Badge>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>• <strong>{activeConfig.limits.rpm}</strong> req/min</span>
            <span>• <strong>{activeConfig.limits.tpm.toLocaleString("pt-BR")}</strong> tokens/min</span>
            <span>• <strong>~{activeConfig.limits.rpd.toLocaleString("pt-BR")}</strong> req/dia</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Zap className="h-3 w-3 text-amber-400 shrink-0" />
          <span>Fallback automático ativo em caso de cota esgotada (429)</span>
        </div>
      </div>

      {isBudgetExceeded && (
        <p className="mt-2.5 text-xs text-destructive flex items-center gap-1.5 font-medium">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          O teto diário foi atingido. Novas buscas e sugestões de IA serão bloqueadas até que o teto seja aumentado ou o dia vire.
        </p>
      )}
    </div>
  );
}
