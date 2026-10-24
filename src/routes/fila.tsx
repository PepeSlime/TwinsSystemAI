import { createFileRoute } from "@tanstack/react-router";
import { JobQueuePanel } from "@/components/JobQueuePanel";

export const Route = createFileRoute("/fila")({
  head: () => ({
    meta: [
      { title: "Fila de Processamento — R6 Scale Manager" },
      { name: "description", content: "Acompanhamento em tempo real de buscas de referências e sugestões de habilidades com IA." },
      { property: "og:title", content: "Fila de Processamento — R6 Scale Manager" },
      { property: "og:description", content: "Acompanhamento em tempo real de buscas de referências e sugestões de habilidades com IA." },
    ],
  }),
  ssr: false,
  component: JobQueuePanel,
});
