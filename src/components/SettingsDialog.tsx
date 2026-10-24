import { useEffect, useState } from "react";
import { Settings as Cog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DEFAULT_SETTINGS } from "@/lib/scale";
import { saveSettings, useSettings } from "@/lib/store";

export function SettingsDialog() {
  const s = useSettings();
  const [open, setOpen] = useState(false);
  const [stud, setStud] = useState("");
  const [base, setBase] = useState("");
  useEffect(() => { if (open) { setStud(String(s.studMeters).replace(".", ",")); setBase(String(s.baseStuds).replace(".", ",")); } }, [open, s]);

  function save() {
    const a = Number(stud.replace(",", ".")), b = Number(base.replace(",", "."));
    if (!(a > 0) || !(b > 0)) { toast.error("Valores inválidos."); return; }
    saveSettings({ studMeters: a, baseStuds: b });
    toast.success("Configurações salvas.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm"><Cog className="h-4 w-4" /> Configurações</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display text-2xl">Configurações</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>1 stud = (metros)</Label><Input value={stud} onChange={(e) => setStud(e.target.value)} /><p className="text-xs text-muted-foreground">Padrão oficial do Roblox: 0,28</p></div>
          <div className="space-y-1.5"><Label>Altura base do rig R6 (studs)</Label><Input value={base} onChange={(e) => setBase(e.target.value)} /><p className="text-xs text-muted-foreground">Padrão: 5 (perna 2 + torso 2 + cabeça 1)</p></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setStud("0,28"); setBase(String(DEFAULT_SETTINGS.baseStuds)); }}>Restaurar padrão</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
