import { useState } from "react";
import { toast } from "sonner";
import { X, Trash2 } from "lucide-react";
import { Field, inputCls } from "@/components/app/ui";
import { useStore } from "@/lib/store";
import type { Customer } from "@/lib/types";

export function CustomerForm({
  customer,
  onClose,
  onDelete,
}: {
  customer?: Customer;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const saveCustomer = useStore((s) => s.saveCustomer);
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [f, setF] = useState({
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    notes: customer?.notes ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  const submit = () => {
    if (f.name.trim().length < 2) {
      toast.error("Nom du client requis");
      return;
    }
    if (f.phone.replace(/\D/g, "").length < 9) {
      toast.error("Téléphone invalide (minimum 9 chiffres)");
      return;
    }
    saveCustomer({ ...f, name: f.name.trim(), ...(customer ? { id: customer.id } : {}) });
    toast.success(customer ? "Client modifié" : "Client ajouté");
    onClose();
  };

  const handleDelete = () => {
    if (!customer) return;
    deleteCustomer(customer.id);
    toast.success("Client supprimé");
    onClose();
    if (onDelete) onDelete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 sm:items-center" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{customer ? "Modifier le client" : "Nouveau client"}</h2>
          <button onClick={onClose} aria-label="Fermer"><X className="size-5" /></button>
        </div>
        <div className="grid gap-3">
          <Field label="Nom complet"><input className={inputCls} maxLength={80} value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Téléphone"><input className={inputCls} inputMode="tel" maxLength={20} placeholder="+221 77 …" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Email"><input className={inputCls} type="email" maxLength={120} value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Adresse"><input className={inputCls} maxLength={160} value={f.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="Notes"><textarea className={inputCls + " h-20 py-2"} maxLength={500} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
        </div>

        {confirmDelete && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <div className="font-bold">Supprimer ce client ?</div>
            <p className="text-xs text-muted-foreground mt-0.5">Le client sera retiré de la liste de vos contacts.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="h-8 rounded-lg border bg-card px-3 text-xs font-semibold text-foreground">Annuler</button>
              <button onClick={handleDelete} className="h-8 rounded-lg bg-destructive px-3 text-xs font-semibold text-destructive-foreground">Oui, supprimer</button>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
          {customer && !confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-4" /> Supprimer ce client
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
