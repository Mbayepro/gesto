import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Field, inputCls, NativeSelect } from "@/components/app/ui";
import { useStore } from "@/lib/store";
import { useSalesView } from "@/lib/selectors";
import { fcfa, METHOD_LABEL } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export function PaymentForm({ saleId, onClose }: { saleId?: string; onClose: () => void }) {
  const addPayment = useStore((s) => s.addPayment);
  const unpaid = useSalesView().filter((s) => s.remaining > 0 || s.id === saleId);
  const [sid, setSid] = useState(saleId ?? unpaid[0]?.id ?? "");
  const sale = unpaid.find((s) => s.id === sid);
  const [amount, setAmount] = useState(sale?.remaining ?? 0);
  const [method, setMethod] = useState<PaymentMethod>("wave");
  const [note, setNote] = useState("");
  const submit = () => {
    if (!sale) { toast.error("Choisissez une facture"); return; }
    if (amount <= 0) { toast.error("Montant invalide"); return; }
    if (amount > sale.remaining) { toast.error(`Le reste à payer est ${fcfa(sale.remaining)}`); return; }
    addPayment({ saleId: sale.id, amount, method, ...(note ? { note } : {}) });
    toast.success(amount === sale.remaining ? "Facture soldée" : "Paiement enregistré");
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Enregistrer un paiement</h2>
          <button onClick={onClose} aria-label="Fermer"><X className="size-5" /></button>
        </div>
        {!unpaid.length ? <p className="text-sm text-muted-foreground">Toutes les factures sont payées.</p> : (
          <div className="grid gap-3">
            <Field label="Facture">
              <NativeSelect value={sid} disabled={!!saleId} onChange={(e) => { setSid(e.target.value); setAmount(unpaid.find((s) => s.id === e.target.value)?.remaining ?? 0); }}>
                {unpaid.map((s) => <option key={s.id} value={s.id}>{s.invoiceNumber} · {s.customer?.name} · reste {fcfa(s.remaining)}</option>)}
              </NativeSelect>
            </Field>
            <Field label="Montant (FCFA)"><input inputMode="numeric" className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, "")) || 0)} /></Field>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={"rounded-lg border px-2 py-2 text-xs font-semibold " + (method === m ? "border-primary bg-secondary text-primary" : "")}>{METHOD_LABEL[m]}</button>
              ))}
            </div>
            <Field label="Note (optionnel)"><input className={inputCls} maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <button onClick={submit} className="mt-2 h-11 rounded-lg bg-primary font-semibold text-primary-foreground">Valider le paiement</button>
          </div>
        )}
      </div>
    </div>
  );
}
