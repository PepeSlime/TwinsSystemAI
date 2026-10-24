import { useState } from "react";
import { Check, Copy, Download, HelpCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { type OverridesResult as ResultType, translatePart, translateDoubt } from "@/lib/overrides";

export function OverridesResult({
  result,
  characterName,
  onAnswerQuestion,
}: {
  result: ResultType;
  characterName: string;
  onAnswerQuestion?: (question: string, answer: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.pythonCode);
      setCopied(true);
      toast.success("Código Python copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Falha ao copiar código.");
    }
  };

  const handleDownloadPy = () => {
    const filename = `overrides_${characterName.toLowerCase().replace(/\s+/g, "_")}.py`;
    const blob = new Blob([result.pythonCode], { type: "text/x-python;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Arquivo ${filename} baixado!`);
  };

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Resultado do OVERRIDES</h3>
          <p className="text-sm text-muted-foreground">
            Dicionário formatado e pronto para o script do Blender.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="mr-1.5 h-4 w-4 text-green-500" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </Button>
          <Button size="sm" onClick={handleDownloadPy}>
            <Download className="mr-1.5 h-4 w-4" /> Baixar .py
          </Button>
        </div>
      </div>

      {/* Código Python */}
      <div className="relative">
        <pre className="max-h-[300px] overflow-auto rounded-lg border border-border/80 bg-zinc-950 p-4 font-mono text-xs text-zinc-100">
          <code>{result.pythonCode}</code>
        </pre>
      </div>

      {/* Dúvidas levantadas pela IA */}
      {result.questions && result.questions.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <HelpCircle className="h-5 w-5 text-amber-400" />
            <span>A IA possui dúvidas sobre os materiais:</span>
          </div>
          <div className="mt-3 space-y-3">
            {result.questions.map((q, idx) => (
              <div key={idx} className="space-y-1.5">
                <p className="text-sm text-amber-100">{q}</p>
                {onAnswerQuestion && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Sua resposta / esclarecimento..."
                      className="h-8 flex-1 rounded border border-border bg-background px-3 text-sm text-foreground"
                      value={answers[q] || ""}
                      onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (answers[q]) onAnswerQuestion(q, answers[q]);
                      }}
                    >
                      Responder e gerar
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Não mapeados */}
      {result.unmapped && result.unmapped.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-4 w-4" /> Materiais não mapeados no model sheet:
          </div>
          <p className="mt-1 text-xs">
            {result.unmapped.join(", ")} (mantidos com os valores originais)
          </p>
        </div>
      )}

      {/* Tabela de correspondência com amostra visual */}
      <div>
        <h4 className="mb-2 font-semibold">Mapeamento Visual de Materiais</h4>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Parte do Personagem</TableHead>
                <TableHead>Amostra</TableHead>
                <TableHead>Cor (Hex)</TableHead>
                <TableHead>Metal / Rugosidade</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.table.map((row, idx) => {
                const mat = result.overrides[row.material];
                return (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-xs font-medium">
                      {row.material}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{translatePart(row.part)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-5 w-5 rounded border border-border/80 shadow-sm"
                          style={{ backgroundColor: row.color }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{row.color}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {mat ? `M: ${mat.metallic.toFixed(2)} | R: ${mat.roughness.toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {translateDoubt(row.doubt) !== "nenhuma" ? (
                        <Badge variant="outline" className="text-amber-400 border-amber-500/30">
                          {translateDoubt(row.doubt)}
                        </Badge>
                      ) : (
                        "Sem dúvidas"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
