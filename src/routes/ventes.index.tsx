import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader, Card, SaleStatusPill, inputCls, Empty } from "@/components/app/ui";
import { useSalesView } from "@/lib/selectors";
import { fcfa, relDate, METHOD_LABEL } from "@/lib/format";
import type { SaleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ventes/")({
  head: () => ({ meta: [{ title: "Ventes — GESTO" }, { name: "description", content: "Historique de toutes les ventes de votre commerce." }, { property: "og:title", content: "Ventes — GESTO" }, { property: "og:description", content: "Historique de toutes les ventes de votre commerce." }] }),
  component: Page,
});

function Page() {
  const sales = useSalesView();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<SaleStatus | "">("");
  const list = sales.filter((s) => (!st || s.status === st) && `${s.invoiceNumber} ${s.customer?.name ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Ventes" subtitle={`${sales.length} ventes`} actions={<Link to="/ventes/nouvelle" className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="size-4" />Nouvelle vente</Link>} />
      <Card>
        <div className="mb-3 flex flex-wrap gap-2">
          <input className={cn(inputCls, "max-w-xs")} placeholder="N° facture ou client…" value={q} onChange={(e) => setQ(e.target.value)} />
          {([["", "Toutes"], ["payee", "Payées"], ["partielle", "Partielles"], ["impayee", "Impayées"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSt(k)} className={cn("rounded-full border px-3 text-xs font-semibold", st === k ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{l}</button>
          ))}
        </div>
        {!list.length ? <Empty text="Aucune vente." /> : (
          <div className="divide-y">
            {list.map((s) => (
              <Link key={s.id} to="/factures/$id" params={{ id: s.id }} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{s.customer?.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{s.invoiceNumber} · {s.items.length} article(s) · {METHOD_LABEL[s.method]} · {relDate(s.date)}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold">{fcfa(s.total)}</div>
                  <SaleStatusPill status={s.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
