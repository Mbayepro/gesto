import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, FileSpreadsheet, Plus, FileText } from "lucide-react";
import { PageHeader, Card, Empty, SaleStatusPill, inputCls } from "@/components/app/ui";
import { useSalesView } from "@/lib/selectors";
import { fcfa, relDate } from "@/lib/format";
import { exportSalesToExcel } from "@/lib/export";
import type { SaleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/factures/")({
  head: () => ({ meta: [{ title: "Factures — GESTO" }, { name: "description", content: "Toutes les factures de votre commerce avec GESTO." }, { property: "og:title", content: "Factures — GESTO" }, { property: "og:description", content: "Toutes les factures de votre commerce." }] }),
  component: Page,
});

type DocFilter = "all" | "facture" | "proforma";
const TABS: [SaleStatus | "", string][] = [["", "Tous statuts"], ["payee", "Payées"], ["partielle", "Partielles"], ["impayee", "Impayées"]];

function Page() {
  const sales = useSalesView();
  const [q, setQ] = useState("");
  const [st, setSt] = useState<SaleStatus | "">("");
  const [docFilter, setDocFilter] = useState<DocFilter>("all");

  const list = sales.filter((s) => {
    const matchDoc = docFilter === "all" ? true : docFilter === "proforma" ? s.docType === "proforma" : s.docType !== "proforma";
    const matchStatus = !st || s.status === st;
    const matchQuery = `${s.invoiceNumber} ${s.customer?.name ?? ""} ${s.customer?.phone ?? ""}`.toLowerCase().includes(q.toLowerCase());
    return matchDoc && matchStatus && matchQuery;
  });

  const onExport = () => {
    if (!sales.length) {
      toast.error("Aucune facture à exporter");
      return;
    }
    exportSalesToExcel(sales);
    toast.success("Fichier Excel (.csv) téléchargé avec succès !");
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <PageHeader title="Factures & Devis" subtitle={`${sales.length} document(s) enregistré(s)`} />
        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
            title="Télécharger toutes les données dans un fichier prêt pour Microsoft Excel"
          >
            <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span>Exporter vers Excel</span>
          </button>
          <Link
            to="/ventes/nouvelle"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:brightness-105"
          >
            <Plus className="size-4" />
            <span>Créer</span>
          </Link>
        </div>
      </div>

      <Card>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <input className={cn(inputCls, "pl-9")} placeholder="Rechercher par N° de facture, client, téléphone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {/* Filtre Type Document */}
        <div className="mb-2 flex gap-1.5 border-b pb-2">
          <button
            onClick={() => setDocFilter("all")}
            className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition", docFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            Tous les documents
          </button>
          <button
            onClick={() => setDocFilter("facture")}
            className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition", docFilter === "facture" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            Factures
          </button>
          <button
            onClick={() => setDocFilter("proforma")}
            className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition", docFilter === "proforma" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            Devis & Proformas
          </button>
        </div>

        {/* Filtre Statut */}
        <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
          {TABS.map(([k, l]) => (
            <button key={k} onClick={() => setSt(k)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition", st === k ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted")}>
              {l}
            </button>
          ))}
        </div>

        {!list.length ? (
          <Empty text="Aucune facture ou proforma trouvée." />
        ) : (
          <div className="divide-y">
            {list.map((s) => {
              const isProforma = s.docType === "proforma";
              return (
                <Link key={s.id} to="/factures/$id" params={{ id: s.id }} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/30 px-2 rounded-lg transition">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{s.invoiceNumber}</span>
                      {isProforma && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Devis Proforma
                        </span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.customer?.name} · {relDate(s.date)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-bold">{fcfa(s.total)}</div>
                    {isProforma ? (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">En attente d'accord</span>
                    ) : (
                      <SaleStatusPill status={s.status} />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
