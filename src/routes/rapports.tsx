import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DailyBars, lastDays } from "@/components/app/DailyBars";
import { TrendingUp, ShoppingBag, Package, PiggyBank, Wallet, AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useStore, categoryName } from "@/lib/store";
import { useSalesView } from "@/lib/selectors";
import { fcfa, METHOD_LABEL } from "@/lib/format";
import { exportSalesToExcel, exportPaymentsToExcel } from "@/lib/export";
import { PageHeader, Card, StatCard, Empty } from "@/components/app/ui";

export const Route = createFileRoute("/rapports")({
  head: () => ({
    meta: [
      { title: "Rapports — GESTO" },
      { name: "description", content: "Chiffre d'affaires, bénéfice estimé, meilleurs produits et créances de votre commerce." },
      { property: "og:title", content: "Rapports — GESTO" },
      { property: "og:description", content: "Chiffre d'affaires, bénéfice estimé, meilleurs produits et créances de votre commerce." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const PERIODS = [
  { k: "7", label: "7 jours" },
  { k: "30", label: "30 jours" },
  { k: "90", label: "3 mois" },
  { k: "all", label: "Tout" },
] as const;

function Page() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["k"]>("30");
  const all = useSalesView();
  const { products, payments } = useStore();

  const r = useMemo(() => {
    const from = period === "all" ? "" : new Date(Date.now() - Number(period) * 864e5).toISOString();
    const sales = all.filter((s) => s.date >= from);
    const ids = new Set(sales.map((s) => s.id));
    const pays = payments.filter((p) => p.date >= from);
    let qty = 0, cost = 0;
    const byProduct = new Map<string, { name: string; qty: number; ca: number }>();
    const byCat = new Map<string, number>();
    for (const s of sales) for (const it of s.items) {
      const p = products.find((x) => x.id === it.productId);
      const line = it.quantity * it.unitPrice - it.discount;
      qty += it.quantity;
      cost += (p?.purchasePrice ?? 0) * it.quantity;
      const e = byProduct.get(it.name) ?? { name: it.name, qty: 0, ca: 0 };
      e.qty += it.quantity; e.ca += line; byProduct.set(it.name, e);
      const cat = p ? categoryName(p.categoryId) : "Autres";
      byCat.set(cat, (byCat.get(cat) ?? 0) + line);
    }
    const ca = sales.reduce((a, s) => a + s.total, 0);
    const byMethod = new Map<string, number>();
    for (const p of pays) byMethod.set(METHOD_LABEL[p.method], (byMethod.get(METHOD_LABEL[p.method]) ?? 0) + p.amount);
    const days = period === "all" ? 30 : Math.min(Number(period), 30);
    const daily = lastDays(days, sales);
    return {
      count: sales.length, ca, qty, profit: ca - cost,
      cashed: pays.filter((p) => ids.has(p.saleId) || true).reduce((a, p) => a + p.amount, 0),
      debts: all.reduce((a, s) => a + s.remaining, 0),
      top: [...byProduct.values()].sort((a, b) => b.ca - a.ca).slice(0, 5),
      cats: [...byCat.entries()].map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v),
      methods: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
      daily,
    };
  }, [all, products, payments, period]);

  const max = Math.max(1, ...r.cats.map((c) => c.v));
  const maxM = Math.max(1, ...r.methods.map((m) => m[1]));

  return (
    <div>
      <PageHeader
        title="Rapports"
        subtitle="Suivez la performance de votre commerce"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (!all.length) {
                  toast.error("Aucune vente à exporter");
                  return;
                }
                exportSalesToExcel(all);
                toast.success("Rapport des ventes exporté vers Excel !");
              }}
              title="Exporter toutes les ventes en Excel"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold hover:bg-muted transition"
            >
              <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
              Exporter Ventes (Excel)
            </button>
            <button
              onClick={() => {
                if (!payments.length) {
                  toast.error("Aucun encaissement à exporter");
                  return;
                }
                exportPaymentsToExcel(payments, all);
                toast.success("Journal des encaissements exporté vers Excel !");
              }}
              title="Exporter le journal des encaissements en Excel"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold hover:bg-muted transition"
            >
              <Download className="size-4" />
              Exporter Encaissements
            </button>
          </div>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button key={p.k} onClick={() => setPeriod(p.k)}
            className={"h-9 rounded-full px-4 text-sm font-semibold " + (period === p.k ? "bg-primary text-primary-foreground" : "bg-card border text-muted-foreground")}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Chiffre d'affaires" value={fcfa(r.ca)} icon={TrendingUp} />
        <StatCard label="Ventes" value={String(r.count)} icon={ShoppingBag} tone="accent" />
        <StatCard label="Articles vendus" value={String(r.qty)} icon={Package} />
        <StatCard label="Bénéfice estimé" value={fcfa(r.profit)} icon={PiggyBank} tone="success" hint="Prix de vente − prix d'achat" />
        <StatCard label="Paiements reçus" value={fcfa(r.cashed)} icon={Wallet} tone="success" />
        <StatCard label="Créances totales" value={fcfa(r.debts)} icon={AlertCircle} tone="destructive" hint="Toutes périodes" />
      </div>

      <Card title="Chiffre d'affaires par jour" className="mb-5">
        <DailyBars data={r.daily} />
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Meilleurs produits">
          {r.top.length === 0 ? <Empty text="Aucune vente sur cette période." /> : (
            <ol className="space-y-3">
              {r.top.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-accent/20 text-xs font-bold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.qty} vendu(s)</div>
                  </div>
                  <span className="text-sm font-semibold">{fcfa(p.ca)}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Ventes par catégorie">
          {r.cats.length === 0 ? <Empty text="Aucune donnée." /> : r.cats.map((c) => (
            <Bar2 key={c.name} label={c.name} value={c.v} pct={c.v / max} />
          ))}
        </Card>
        <Card title="Paiements par mode">
          {r.methods.length === 0 ? <Empty text="Aucun paiement." /> : r.methods.map(([m, v]) => (
            <Bar2 key={m} label={m} value={v} pct={v / maxM} accent />
          ))}
        </Card>
      </div>
    </div>
  );
}

function Bar2({ label, value, pct, accent }: { label: string; value: number; pct: number; accent?: boolean }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{fcfa(value)}</span></div>
      <div className="h-2 rounded-full bg-muted"><div className={"h-2 rounded-full " + (accent ? "bg-accent" : "bg-primary")} style={{ width: `${Math.max(4, pct * 100)}%` }} /></div>
    </div>
  );
}
