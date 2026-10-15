import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Trash2, Download, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Card, Pill, Empty, ProductThumb, inputCls, NativeSelect } from "@/components/app/ui";
import { ProductForm } from "@/components/app/ProductForm";
import { useStore, categories, categoryName } from "@/lib/store";
import { fcfa } from "@/lib/format";
import { exportProductsToExcel } from "@/lib/export";
import { BarcodeScanner, ScanButton } from "@/components/app/BarcodeScanner";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produits/")({
  head: () => ({ meta: [{ title: "Produits — GESTO" }, { name: "description", content: "Catalogue, prix et stock de vos produits électroniques et électroménagers." }, { property: "og:title", content: "Produits — GESTO" }, { property: "og:description", content: "Catalogue, prix et stock de vos produits." }] }),
  component: Page,
});

export function StockPill({ p }: { p: Product }) {
  if (p.isService) return <Pill tone="primary">Service</Pill>;
  if (p.stock === 0) return <Pill tone="destructive">Rupture</Pill>;
  if (p.stock <= p.alertThreshold) return <Pill tone="warning">Stock faible · {p.stock}</Pill>;
  return <Pill tone="success">En stock · {p.stock}</Pill>;
}

function Page() {
  const products = useStore((s) => s.products);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");
  const [st, setSt] = useState("");
  const [open, setOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();

  const handleScan = (code: string) => {
    setScannerOpen(false);
    setQ(code.trim());
    const match = products.find(
      (p) =>
        p.reference.toLowerCase() === code.trim().toLowerCase() ||
        (p.serialNumber && p.serialNumber.toLowerCase() === code.trim().toLowerCase()),
    );
    if (match) {
      toast.success(`Produit trouvé : ${match.name}`, { description: `Réf: ${match.reference}` });
    } else {
      toast.info(`Filtre code-barres appliqué : "${code}"`);
    }
  };

  const list = products.filter((p) =>
    (!cat || p.categoryId === cat) && (!brand || p.brand === brand) &&
    (!st || (st === "out" ? !p.isService && p.stock === 0 : st === "low" ? !p.isService && p.stock > 0 && p.stock <= p.alertThreshold : p.isService || p.stock > p.alertThreshold)) &&
    `${p.name} ${p.reference} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      {scannerOpen && <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />}
      <PageHeader
        title="Produits"
        subtitle={`${products.length} produits`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                exportProductsToExcel(products);
                toast.success("Catalogue exporté au format Excel (.csv) !");
              }}
              title="Exporter le catalogue en Excel"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold hover:bg-muted transition"
            >
              <Download className="size-4" /> Exporter Excel
            </button>
            {products.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Supprimer tous les articles et mouvements démo pour démarrer avec un catalogue vide ?")) {
                    useStore.getState().clearDemoStock();
                    toast.success("Articles et stock démo supprimés !");
                  }
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
              >
                <Trash2 className="size-4" /> Vider la démo
              </button>
            )}
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="size-4" />
              Ajouter
            </button>
          </div>
        }
      />
      <Card>
        <div className="mb-4 grid gap-2 sm:grid-cols-4">
          <div className="flex gap-2 sm:col-span-4 lg:col-span-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
              <input className={cn(inputCls, "pl-9")} placeholder="Rechercher nom, réf…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <ScanButton onClick={() => setScannerOpen(true)} />
          </div>
          <NativeSelect value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Toutes catégories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>
          <NativeSelect value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">Toutes marques</option>{brands.map((b) => <option key={b}>{b}</option>)}</NativeSelect>
          <NativeSelect value={st} onChange={(e) => setSt(e.target.value)}><option value="">Tout le stock</option><option value="ok">En stock</option><option value="low">Stock faible</option><option value="out">Rupture</option></NativeSelect>
        </div>
        {!list.length ? <Empty text="Aucun produit trouvé." /> : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Produit</th><th>Catégorie</th><th>Prix d'achat</th><th>Prix de vente</th><th>Stock</th></tr></thead>
                <tbody className="divide-y">
                  {list.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="py-2"><Link to="/produits/$id" params={{ id: p.id }} className="flex items-center gap-3"><ProductThumb emoji={p.image} /><div><div className="font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">{p.brand} · {p.reference}</div></div></Link></td>
                      <td>{categoryName(p.categoryId)}</td>
                      <td className="text-muted-foreground">{fcfa(p.purchasePrice)}</td>
                      <td className="font-semibold">{fcfa(p.salePrice)}</td>
                      <td><StockPill p={p} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-2 md:hidden">
              {list.map((p) => (
                <Link key={p.id} to="/produits/$id" params={{ id: p.id }} className="flex items-center gap-3 rounded-lg border p-3">
                  <ProductThumb emoji={p.image} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.brand} · {categoryName(p.categoryId)}</div>
                    <div className="mt-1 flex items-center justify-between gap-2"><span className="text-sm font-bold text-primary">{fcfa(p.salePrice)}</span><StockPill p={p} /></div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </Card>
      {open && <ProductForm onClose={() => setOpen(false)} />}
    </div>
  );
}
