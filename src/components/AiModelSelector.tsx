import { useState } from "react";
import { Cpu, Check, AlertCircle, Zap, Shield, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AVAILABLE_AI_MODELS,
  useActiveAiModel,
  type AiModelConfig,
} from "@/lib/ai-models";

export function AiModelSelector({
  triggerButton,
}: {
  triggerButton?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { activeModel, config: activeConfig, setModel, allModels } = useActiveAiModel();

  const handleSelectModel = (modelId: string) => {
    setModel(modelId);
    const cfg = allModels.find((m) => m.id === modelId);
    toast.success(`Modelo ativo alterado para ${cfg?.name || modelId}.`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs border-border/80">
            <Cpu className="h-3.5 w-3.5 text-primary" />
            <span>Modelo: <strong>{activeConfig.name}</strong></span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Cpu className="h-5 w-5 text-primary" />
            <span>Seleção de Modelo de IA & Limites de Cota</span>
          </DialogTitle>
          <DialogDescription>
            Escolha o modelo de IA que processará as buscas, sugestões e geração de OVERRIDES. Quando a cota de um modelo atingir o limite temporário da Groq, alterne para outro sem interromper a equipe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Alerta de Fallback */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p>
              <strong className="text-foreground">Proteção de Cota Ativa:</strong> Se o modelo atual atingir o limite de requisições por minuto ou cota diária (erro 429), o sistema sugere e faz o redirecionamento automático para o próximo modelo disponível na fila.
            </p>
          </div>

          {/* Lista de Modelos */}
          <div className="grid gap-3">
            {allModels.map((model) => {
              const isSelected = model.id === activeModel;

              return (
                <div
                  key={model.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/20"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground">
                        {model.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-mono border-border">
                        {model.params}
                      </Badge>
                      {model.isDefault && (
                        <Badge variant="secondary" className="text-[10px] text-muted-foreground">
                          Recomendado
                        </Badge>
                      )}
                    </div>

                    {isSelected ? (
                      <Badge className="bg-primary text-primary-foreground text-xs gap-1 py-0.5">
                        <Check className="h-3 w-3" /> Ativo Agora
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleSelectModel(model.id)}
                      >
                        <span>Usar este modelo</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    {model.description}
                  </p>

                  {/* Limites e Métricas */}
                  <div className="grid grid-cols-3 gap-2 rounded-lg border border-border/50 bg-muted/30 p-2.5 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Velocidade Máx.</span>
                      <span className="font-mono font-bold text-foreground">{model.limits.rpm} req/min</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Tokens por Minuto</span>
                      <span className="font-mono font-bold text-foreground">
                        {model.limits.tpm.toLocaleString("pt-BR")} TPM
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Teto Diário Estimado</span>
                      <span className="font-mono font-bold text-foreground">
                        ~{model.limits.rpd.toLocaleString("pt-BR")} req/dia
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                    <strong className="text-foreground">Destaque:</strong> {model.strengths}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
