import { useState } from "react";
import { toast } from "sonner";
import { X, Trash2 } from "lucide-react";
import { Field, inputCls, NativeSelect } from "@/components/app/ui";
import { useStore, categories } from "@/lib/store";
import type { Product } from "@/lib/types";

const num = (v: string) => Math.max(0, Number(v.replace(/\D/g, "")) || 0);

export function ProductForm({
  product,
  onClose,
  onDelete,
}: {
  product?: Product;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const saveProduct = useStore((s) => s.saveProduct);
  const deleteProduct = useStore((s) => s.deleteProduct);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [f, setF] = useState<Omit<Product, "id">>(
    product ?? {
      name: "",
      reference: "",
      categoryId: categories[0]!.id,
      brand: "",
      serialNumber: "",
      purchasePrice: 0,
      salePrice: 0,
      stock: 0,
      alertThreshold: 2,
      warrantyMonths: 12,
      description: "",
      image: "📦",
    },
  );
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    if (f.name.trim().length < 2) {
      toast.error("Nom du produit requis");
      return;
    }
    if (!f.salePrice) {
      toast.error("Prix de vente requis");
      return;
    }
    if (f.salePrice < f.purchasePrice) toast.warning("Prix de vente inférieur au prix d'achat");
    saveProduct({ ...f, name: f.name.trim(), ...(product ? { id: product.id } : {}) });
    toast.success(product ? "Produit et stock mis à jour" : "Produit ajouté");
    onClose();
  };

  const handleDelete = () => {
    if (!product) return;
    deleteProduct(product.id);
    toast.success("Produit supprimé du catalogue");
    onClose();
    if (onDelete) onDelete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{product ? "Modifier le produit et le stock" : "Ajouter un produit"}</h2>
          <button onClick={onClose} aria-label="Fermer"><X className="size-5" /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom du produit" className="sm:col-span-2">
            <input className={inputCls} value={f.name} maxLength={100} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Référence"><input className={inputCls} value={f.reference} maxLength={40} onChange={(e) => set("reference", e.target.value)} /></Field>
          <Field label="Marque"><input className={inputCls} value={f.brand} maxLength={40} onChange={(e) => set("brand", e.target.value)} /></Field>
          <Field label="Catégorie">
            <NativeSelect value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect>
          </Field>
          <Field label="Icône (emoji)"><input className={inputCls} value={f.image} maxLength={4} onChange={(e) => set("image", e.target.value)} /></Field>
          <Field label="Prix d'achat (FCFA)"><input inputMode="numeric" className={inputCls} value={f.purchasePrice} onChange={(e) => set("purchasePrice", num(e.target.value))} /></Field>
          <Field label="Prix de vente (FCFA)"><input inputMode="numeric" className={inputCls} value={f.salePrice} onChange={(e) => set("salePrice", num(e.target.value))} /></Field>
          <Field label={product ? "Stock disponible (en magasin)" : "Stock initial"}>
            <input inputMode="numeric" className={inputCls} value={f.stock} onChange={(e) => set("stock", num(e.target.value))} />
          </Field>
          <Field label="Seuil d'alerte stock"><input inputMode="numeric" className={inputCls} value={f.alertThreshold} onChange={(e) => set("alertThreshold", num(e.target.value))} /></Field>
          <Field label="Garantie (mois)"><input inputMode="numeric" className={inputCls} value={f.warrantyMonths} onChange={(e) => set("warrantyMonths", num(e.target.value))} /></Field>
          <Field label="N° de série (optionnel)"><input className={inputCls} value={f.serialNumber ?? ""} maxLength={60} onChange={(e) => set("serialNumber", e.target.value)} /></Field>
          <Field label="Description" className="sm:col-span-2"><textarea className={`${inputCls} h-20 py-2`} value={f.description} maxLength={500} onChange={(e) => set("description", e.target.value)} /></Field>
        </div>

        {confirmDelete && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="font-bold">Confirmer la suppression ?</div>
            <p className="text-xs text-muted-foreground mt-0.5">Ce produit sera retiré du catalogue et des alertes de stock.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="h-8 rounded-lg border bg-card px-3 text-xs font-semibold text-foreground">Annuler</button>
              <button onClick={handleDelete} className="h-8 rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground">Oui, supprimer définitivement</button>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
          {product && !confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Supprimer ce produit
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={onClose} className="h-10 rounded-lg border px-4 text-sm font-medium">Annuler</button>
            <button onClick={submit} className="h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
