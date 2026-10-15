import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Card, Pill, Empty, ProductThumb } from "@/components/app/ui";
import { StockMovementForm, MOVE_LABEL } from "@/components/app/StockMovementForm";
import { useStore } from "@/lib/store";
import { relDate, fcfa } from "@/lib/format";
import { exportMovementsToExcel } from "@/lib/export";
import type { StockMovementType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/stock")({
  head: () => ({ meta: [{ title: "Stock — GESTO" }, { name: "description", content: "Mouvements de stock et alertes de seuil." }, { property: "og:title", content: "Stock — GESTO" }, { property: "og:description", content: "Mouvements de stock et alertes de seuil." }] }),
  component: Page,
});

function Page() {
  const movements = useStore((s) => s.movements);
  const products = useStore((s) => s.products);
  const [type, setType] = useState<StockMovementType | "">("");
  const alerts = products.filter((p) => !p.isService && p.stock <= p.alertThreshold).sort((a, b) => a.stock - b.stock);
  const value = products.reduce((a, p) => a + (p.isService ? 0 : p.stock * p.purchasePrice), 0);
  const list = movements.filter((m) => !type || m.type === type);
  return (
    <div>
      <PageHeader
        title="Stock"
        subtitle={`Valeur du stock : ${fcfa(value)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {movements.length > 0 && (
              <button
                onClick={() => {
                  const enriched = movements.map((m) => {
                    const p = products.find((x) => x.id === m.productId);
                    return {
                      date: m.date,
                      productName: p?.name || m.productId,
                      type: m.type,
                      quantity: m.quantity,
                      reason: m.reason,
                    };
                  });
                  exportMovementsToExcel(enriched);
                  toast.success("Journal des mouvements de stock exporté vers Excel !");
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold hover:bg-muted transition"
                title="Exporter l'historique des mouvements en Excel"
              >
                <Download className="size-3.5" /> Exporter Mouvements
              </button>
            )}
            {products.length > 0 || movements.length > 0 ? (
              <button
                onClick={() => {
                  if (confirm("Supprimer tous les produits et données d'essai pour avoir un stock propre et vide ?")) {
                    useStore.getState().clearDemoStock();
                    toast.success("Stock démo supprimé ! Vous démarrez à zéro.");
                  }
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
              >
                <Trash2 className="size-3.5" /> Vider le stock démo
              </button>
            ) : null}
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Card title={`Alertes de stock (${alerts.length})`}>
            {!alerts.length ? <Empty text="Aucun produit sous le seuil." /> : <div className="grid gap-2 sm:grid-cols-2">{alerts.map((p) => (
              <Link key={p.id} to="/produits/$id" params={{ id: p.id }} className="flex items-center gap-3 rounded-lg border p-2">
                <ProductThumb emoji={p.image} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">Seuil : {p.alertThreshold}</div></div>
                <Pill tone={p.stock === 0 ? "destructive" : "warning"}>{p.stock === 0 ? "Rupture" : `${p.stock} restant(s)`}</Pill>
              </Link>))}</div>}
          </Card>
          <Card title="Historique des mouvements">
            <div className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
              {([["", "Tous"], ...Object.entries(MOVE_LABEL)] as [StockMovementType | "", string][]).map(([k, l]) => (
                <button key={k} onClick={() => setType(k)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-semibold", type === k ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{l}</button>
              ))}
            </div>
            {!list.length ? <Empty text="Aucun mouvement." /> : (
              <div className="divide-y">
                {list.slice(0, 80).map((m) => {
                  const p = products.find((x) => x.id === m.productId);
                  return (
                    <div key={m.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{p?.name ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{m.reason} · {relDate(m.date)}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={m.quantity < 0 ? "font-bold text-destructive" : "font-bold text-success"}>{m.quantity > 0 ? "+" : ""}{m.quantity}</div>
                        <Pill tone={m.quantity < 0 ? "destructive" : "success"}>{MOVE_LABEL[m.type]}</Pill>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
        <Card title="Nouveau mouvement" className="lg:self-start"><StockMovementForm /></Card>
      </div>
    </div>
  );
}
