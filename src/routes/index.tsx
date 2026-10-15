import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { TrendingUp, ShoppingCart, AlertTriangle, Package, Plus, Zap } from "lucide-react";
import { PageHeader, StatCard, Card, SaleStatusPill } from "@/components/app/ui";
import { useSalesView } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { fcfa, relDate } from "@/lib/format";
import { DailyBars, lastDays } from "@/components/app/DailyBars";
import { BarcodeScanner } from "@/components/app/BarcodeScanner";
import { toast } from "sonner";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — GESTO" },
      { name: "description", content: "Activité du jour, statistiques et encaissements de votre commerce." },
      { property: "og:title", content: "Tableau de bord — GESTO" },
      { property: "og:description", content: "Activité du jour, statistiques et encaissements de votre commerce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const sales = useSalesView();
  const products = useStore((s) => s.products);
  const payments = useStore((s) => s.payments);
  const owner = useStore((s) => s.business.owner || "Gérant");
  const business = useStore((s) => s.business);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<Product | null>(null);

  const low = products.filter((p) => !p.isService && p.stock <= p.alertThreshold);
  const ca = sales.reduce((a, s) => a + s.total, 0);
  const unpaid = sales.reduce((a, s) => a + s.remaining, 0);

  // Répartition des encaissements par mode
  const waveTotal = payments.filter((p) => p.method === "wave").reduce((a, p) => a + p.amount, 0);
  const omTotal = payments.filter((p) => p.method === "orange_money").reduce((a, p) => a + p.amount, 0);
  const cashTotal = payments.filter((p) => p.method === "especes").reduce((a, p) => a + p.amount, 0);

  const handleScan = (code: string) => {
    setScannerOpen(false);
    const cleaned = code.trim().toLowerCase();
    const found = products.find(
      (p) =>
        p.reference.toLowerCase() === cleaned ||
        (p.serialNumber && p.serialNumber.toLowerCase() === cleaned) ||
        p.id.toLowerCase() === cleaned ||
        p.name.toLowerCase().includes(cleaned),
    );

    if (found) {
      setScannedProduct(found);
      toast.success(`Produit identifié : ${found.name}`, {
        description: `Prix: ${fcfa(found.salePrice)} · Stock: ${found.stock}`,
      });
    } else {
      toast.error(`Code "${code}" non trouvé`, {
        description: "Ce code-barres ne correspond à aucun produit de votre stock.",
      });
    }
  };

  return (
    <div className="space-y-5">
      {scannerOpen && <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />}

      {/* Modal produit scanné */}
      {scannedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-bold text-accent uppercase tracking-wider">Produit scanné</span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">{scannedProduct.name}</h3>
                <p className="text-xs text-muted-foreground">{scannedProduct.brand} · Réf: {scannedProduct.reference}</p>
              </div>
              <span className="text-2xl">{scannedProduct.image || "📦"}</span>
            </div>

            <div className="rounded-xl bg-muted/40 p-3 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Prix de vente :</span>
                <span className="font-bold text-sm text-primary">{fcfa(scannedProduct.salePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stock disponible :</span>
                <span className={`font-semibold ${scannedProduct.stock <= scannedProduct.alertThreshold ? "text-warning" : "text-emerald-500"}`}>
                  {scannedProduct.stock} unité(s)
                </span>
              </div>
              {scannedProduct.warrantyMonths > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Garantie :</span>
                  <span>{scannedProduct.warrantyMonths} mois</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setScannedProduct(null)}
                className="flex-1 h-10 rounded-lg border text-xs font-semibold hover:bg-muted"
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setScannedProduct(null);
                  navigate({ to: "/ventes/nouvelle" });
                }}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-1.5 hover:brightness-105"
              >
                <Plus className="size-3.5" /> Vendre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header avec bienvenue et actions rapides */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-[28px]">
            Bonjour, {owner} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {business.name} · Activité commerciale en direct.
          </p>
        </div>

        {/* Boutons d'action rapide */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScannerOpen(true)}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted transition shadow-2xs"
            title="Scanner le code-barres d'un produit pour vérifier prix et stock"
          >
            <Zap className="size-4 text-accent" />
            Scanner article
          </button>
          <Link
            to="/ventes/nouvelle"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-xs font-bold text-accent-foreground shadow-sm transition hover:brightness-105"
          >
            <Plus className="size-4" />
            Nouvelle vente
          </Link>
        </div>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Chiffre d'affaires" value={fcfa(ca)} icon={TrendingUp} />
        <StatCard label="Ventes réalisées" value={String(sales.length)} icon={ShoppingCart} tone="success" />
        <StatCard label="Factures impayées" value={fcfa(unpaid)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Alertes stock" value={`${low.length} produit(s)`} icon={Package} tone="warning" />
      </div>

      {/* Récapitulatif Encaissements Mobile Money & Espèces */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-2xs">
          <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-500 font-bold text-xs shrink-0">
            🌊
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium">Wave Mobile Money</div>
            <div className="text-sm font-bold truncate text-foreground">{fcfa(waveTotal)}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-2xs">
          <div className="grid size-10 place-items-center rounded-xl bg-orange-500/10 text-orange-500 font-bold text-xs shrink-0">
            🍊
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium">Orange Money</div>
            <div className="text-sm font-bold truncate text-foreground">{fcfa(omTotal)}</div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-card p-3.5 shadow-2xs">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500 font-bold text-xs shrink-0">
            💵
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground font-medium">Espèces en caisse</div>
            <div className="text-sm font-bold truncate text-foreground">{fcfa(cashTotal)}</div>
          </div>
        </div>
      </div>

      {/* Ventes récentes */}
      <Card title="Ventes récentes" action={<Link to="/ventes" className="text-sm font-medium text-primary">Tout voir</Link>}>
        <div className="divide-y">
          {sales.slice(0, 6).map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{s.customer?.name}</div>
                <div className="truncate text-xs text-muted-foreground">{s.invoiceNumber} · {s.items[0]?.name} · {relDate(s.date)}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-bold">{fcfa(s.total)}</div>
                <SaleStatusPill status={s.status} />
              </div>
            </div>
          ))}
          {sales.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune vente enregistrée pour l'instant.</p>
          )}
        </div>
      </Card>

      {/* Graphique et Produits faibles */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Ventes des 7 derniers jours">
          <DailyBars data={lastDays(7, sales)} height={180} />
        </Card>
        <Card title="Produits bientôt en rupture" action={<Link to="/stock" className="text-sm font-medium text-primary">Gérer le stock</Link>}>
          {low.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tous vos produits sont bien approvisionnés.</p>
          ) : (
            <div className="divide-y">
              {low.slice(0, 6).map((p) => (
                <Link key={p.id} to="/produits/$id" params={{ id: p.id }} className="flex items-center justify-between gap-3 py-3 hover:bg-muted/40 transition rounded-lg px-1">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  <span className={"shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold " + (p.stock === 0 ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning")}>
                    {p.stock === 0 ? "Rupture" : `${p.stock} restant${p.stock > 1 ? "s" : ""}`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
