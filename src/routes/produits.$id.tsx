import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Pencil, Package, TrendingUp, Wallet, ShieldCheck, Trash2 } from "lucide-react";
import { PageHeader, Card, StatCard, Empty, ProductThumb, Pill } from "@/components/app/ui";
import { ProductForm } from "@/components/app/ProductForm";
import { StockMovementForm, MOVE_LABEL } from "@/components/app/StockMovementForm";
import { StockPill } from "./produits.index";
import { useStore, categoryName } from "@/lib/store";
import { useSalesView } from "@/lib/selectors";
import { fcfa, relDate, addMonths, fullDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/produits/$id")({
  head: () => ({ meta: [{ title: "Fiche produit — GESTO" }, { name: "description", content: "Détails, stock, ventes et garanties d'un produit." }, { property: "og:title", content: "Fiche produit — GESTO" }, { property: "og:description", content: "Détails, stock, ventes et garanties d'un produit." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const deleteProduct = useStore((s) => s.deleteProduct);
  const product = useStore((s) => s.products.find((p) => p.id === id));
  const movements = useStore((s) => s.movements).filter((m) => m.productId === id);
  const sales = useSalesView().filter((s) => s.items.some((i) => i.productId === id));
  const [edit, setEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!product) return <Empty text="Produit introuvable." />;

  const handleDelete = () => {
    deleteProduct(product.id);
    toast.success("Produit supprimé avec succès");
    navigate({ to: "/produits" });
  };

  const lines = sales.flatMap((s) => s.items.filter((i) => i.productId === id).map((i) => ({ sale: s, item: i })));
  const sold = lines.reduce((a, l) => a + l.item.quantity, 0);
  const revenue = lines.reduce((a, l) => a + l.item.quantity * l.item.unitPrice - l.item.discount, 0);
  const margin = product.salePrice - product.purchasePrice;
  const warranties = lines.filter((l) => l.item.warrantyMonths > 0);
  return (
    <div>
      <Link to="/produits" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ChevronLeft className="size-4" />Produits</Link>
      <PageHeader
        title={product.name}
        subtitle={`${product.brand} · ${product.reference} · ${categoryName(product.categoryId)}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
              title="Supprimer ce produit"
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
            <button
              onClick={() => setEdit(true)}
              className="inline-flex h-10 items-center gap-1 rounded-lg border bg-card px-4 text-sm font-semibold shadow-sm hover:bg-muted"
            >
              <Pencil className="size-4" />
              <span>Modifier</span>
            </button>
          </div>
        }
      />

      {showConfirmDelete && (
        <div className="mb-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="font-bold text-destructive">Confirmer la suppression du produit ?</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Le produit <strong>« {product.name} »</strong> sera définitivement retiré du catalogue.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="h-9 rounded-lg bg-destructive px-3.5 text-xs font-semibold text-destructive-foreground shadow-sm"
            >
              Confirmer la suppression
            </button>
          </div>
        </div>
      )}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stock" value={product.isService ? "—" : String(product.stock)} icon={Package} tone={product.stock <= product.alertThreshold ? "warning" : "primary"} hint={`Alerte à ${product.alertThreshold}`} />
        <StatCard label="Vendus" value={String(sold)} icon={TrendingUp} tone="success" />
        <StatCard label="Chiffre d'affaires" value={fcfa(revenue)} icon={Wallet} tone="accent" />
        <StatCard label="Marge unitaire" value={fcfa(margin)} icon={TrendingUp} tone={margin > 0 ? "success" : "destructive"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Informations">
          <div className="flex gap-4">
            <ProductThumb emoji={product.image} className="size-16 text-3xl" />
            <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Prix d'achat</dt><dd>{fcfa(product.purchasePrice)}</dd>
              <dt className="text-muted-foreground">Prix de vente</dt><dd className="font-bold text-primary">{fcfa(product.salePrice)}</dd>
              <dt className="text-muted-foreground">Garantie</dt><dd>{product.warrantyMonths ? `${product.warrantyMonths} mois` : "Aucune"}</dd>
              <dt className="text-muted-foreground">Statut</dt><dd><StockPill p={product} /></dd>
              {product.serialNumber && <><dt className="text-muted-foreground">N° de série</dt><dd>{product.serialNumber}</dd></>}
            </dl>
          </div>
          {product.description && <p className="mt-3 text-sm text-muted-foreground">{product.description}</p>}
        </Card>
        {!product.isService && <Card title="Mouvement de stock"><StockMovementForm productId={product.id} /></Card>}
        <Card title="Historique des ventes">
          {!lines.length ? <Empty text="Pas encore vendu." /> : <div className="divide-y">{lines.map(({ sale, item }) => (
            <Link key={item.id} to="/factures/$id" params={{ id: sale.id }} className="flex justify-between gap-2 py-2 text-sm">
              <div><div className="font-semibold">{sale.customer?.name}</div><div className="text-xs text-muted-foreground">{sale.invoiceNumber} · {relDate(sale.date)}</div></div>
              <div className="text-right"><div className="font-bold">{fcfa(item.quantity * item.unitPrice - item.discount)}</div><div className="text-xs text-muted-foreground">× {item.quantity}</div></div>
            </Link>))}</div>}
        </Card>
        <Card title="Mouvements de stock">
          {!movements.length ? <Empty text="Aucun mouvement." /> : <div className="divide-y">{movements.map((m) => (
            <div key={m.id} className="flex justify-between gap-2 py-2 text-sm">
              <div><div className="font-medium">{m.reason}</div><div className="text-xs text-muted-foreground">{MOVE_LABEL[m.type]} · {relDate(m.date)}</div></div>
              <div className={m.quantity < 0 ? "font-bold text-destructive" : "font-bold text-success"}>{m.quantity > 0 ? "+" : ""}{m.quantity}</div>
            </div>))}</div>}
        </Card>
        {warranties.length > 0 && <Card title="Garanties actives" className="lg:col-span-2">
          <div className="divide-y">{warranties.map(({ sale, item }) => {
            const end = addMonths(sale.date, item.warrantyMonths);
            const active = new Date(end) > new Date();
            return (
              <div key={item.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary" /><div><div className="font-semibold">{sale.customer?.name}</div><div className="text-xs text-muted-foreground">Série {item.serialNumber || "—"} · jusqu'au {fullDate(end)}</div></div></div>
                <Pill tone={active ? "success" : "muted"}>{active ? "Active" : "Expirée"}</Pill>
              </div>);
          })}</div>
        </Card>}
      </div>
      {edit && <ProductForm product={product} onClose={() => setEdit(false)} />}
    </div>
  );
}
