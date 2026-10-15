import { useState } from "react";
import { toast } from "sonner";
import { Field, inputCls, NativeSelect } from "@/components/app/ui";
import { useStore } from "@/lib/store";
import type { StockMovementType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const MOVE_LABEL: Record<StockMovementType, string> = { entree: "Entrée", sortie: "Sortie", retour: "Retour", ajustement: "Ajustement" };
const HINT: Record<StockMovementType, string> = { entree: "Réception fournisseur", sortie: "Casse, perte, usage interne", retour: "Retour client", ajustement: "Correction après inventaire (+ ou −)" };

export function StockMovementForm({ productId }: { productId?: string }) {
  const products = useStore((s) => s.products).filter((p) => !p.isService);
  const addMovement = useStore((s) => s.addMovement);
  const [pid, setPid] = useState(productId ?? "");
  const [type, setType] = useState<StockMovementType>("entree");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const submit = () => {
    const n = parseInt(qty, 10);
    const p = products.find((x) => x.id === pid);
    if (!p) { toast.error("Choisissez un produit"); return; }
    if (!n || (type !== "ajustement" && n < 0)) { toast.error("Quantité invalide"); return; }
    if (type === "sortie" && n > p.stock) { toast.error(`Stock insuffisant (${p.stock} dispo)`); return; }
    const r = addMovement({ productId: pid, type, quantity: n, reason: reason.trim().slice(0, 120) || MOVE_LABEL[type] });
    toast.success("Mouvement enregistré", { description: `${p.name} : stock ${r?.stock ?? ""}` });
    if (r && r.stock <= r.alertThreshold) toast.warning(`Stock faible : ${r.name}`);
    setQty(""); setReason("");
  };
  return (
    <div className="space-y-3">
      {!productId && <Field label="Produit"><NativeSelect value={pid} onChange={(e) => setPid(e.target.value)}><option value="">Choisir…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name} (stock {p.stock})</option>)}</NativeSelect></Field>}
      <div className="grid grid-cols-4 gap-1">
        {(Object.keys(MOVE_LABEL) as StockMovementType[]).map((t) => (
          <button key={t} onClick={() => setType(t)} className={cn("rounded-lg border px-1 py-2 text-xs font-semibold", type === t ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{MOVE_LABEL[t]}</button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{HINT[type]}</p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Quantité"><input inputMode="numeric" className={inputCls} value={qty} onChange={(e) => setQty(e.target.value.replace(type === "ajustement" ? /[^\d-]/g : /\D/g, ""))} /></Field>
        <Field label="Motif"><input className={inputCls} value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} placeholder="Optionnel" /></Field>
      </div>
      <button onClick={submit} className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Enregistrer le mouvement</button>
    </div>
  );
}
