import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Phone, Mail, MapPin, MessageCircle, Trash2 } from "lucide-react";
import { PageHeader, Card, Pill, Empty, StatCard, SaleStatusPill } from "@/components/app/ui";
import { CustomerForm } from "@/components/app/CustomerForm";
import { useStore } from "@/lib/store";
import { useSalesView } from "@/lib/selectors";
import { fcfa, relDate } from "@/lib/format";
import { ShoppingCart, Wallet, AlertCircle, Receipt } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/clients/$id")({
  head: () => ({ meta: [{ title: "Fiche client — GESTO" }, { name: "description", content: "Historique d'achats et solde du client." }, { property: "og:title", content: "Fiche client — GESTO" }, { property: "og:description", content: "Historique d'achats et solde du client." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const deleteCustomer = useStore((s) => s.deleteCustomer);
  const c = useStore((s) => s.customers.find((x) => x.id === id));
  const sales = useSalesView().filter((s) => s.customerId === id);
  const [edit, setEdit] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!c) return <Empty text="Client introuvable." />;

  const handleDelete = () => {
    deleteCustomer(c.id);
    toast.success("Client supprimé avec succès");
    navigate({ to: "/clients" });
  };

  const total = sales.reduce((a, s) => a + s.total, 0);
  const paid = sales.reduce((a, s) => a + s.paid, 0);
  const due = total - paid;
  const wa = c.phone.replace(/\D/g, "");
  return (
    <div>
      <Link to="/clients" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="size-4" />Clients</Link>
      <PageHeader
        title={c.name}
        subtitle={`Client depuis ${relDate(c.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            {due > 0 ? <Pill tone="warning">Paiement en attente</Pill> : <Pill tone="success">Client à jour</Pill>}
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
              title="Supprimer ce client"
            >
              <Trash2 className="size-4" />
              <span className="hidden sm:inline">Supprimer</span>
            </button>
            <button
              onClick={() => setEdit(true)}
              className="inline-flex h-10 items-center gap-1 rounded-lg border bg-card px-3 text-sm font-semibold shadow-sm hover:bg-muted"
            >
              <Pencil className="size-4" />
              <span>Modifier</span>
            </button>
          </div>
        }
      />

      {showConfirmDelete && (
        <div className="mb-5 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="font-bold text-destructive">Confirmer la suppression du client ?</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Le client <strong>« {c.name} »</strong> sera supprimé de vos contacts.
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
        <StatCard label="Total achats" value={fcfa(total)} icon={ShoppingCart} />
        <StatCard label="Commandes" value={String(sales.length)} icon={Receipt} tone="accent" />
        <StatCard label="Payé" value={fcfa(paid)} icon={Wallet} tone="success" />
        <StatCard label="Reste à payer" value={fcfa(due)} icon={AlertCircle} tone={due > 0 ? "warning" : "success"} />
      </div>
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <Card title="Coordonnées" className="lg:self-start">
          <div className="space-y-2 text-sm">
            <a href={`tel:${c.phone}`} className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{c.phone}</a>
            {c.email && <div className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{c.email}</div>}
            {c.address && <div className="flex items-center gap-2"><MapPin className="size-4 text-muted-foreground" />{c.address}</div>}
            {c.notes && <p className="rounded-lg bg-muted p-2 text-xs text-muted-foreground">{c.notes}</p>}
          </div>
          <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" className="mt-4 flex h-10 items-center justify-center gap-2 rounded-lg bg-success font-semibold text-success-foreground"><MessageCircle className="size-4" />WhatsApp</a>
        </Card>
        <Card title="Historique des factures">
          {!sales.length ? <Empty text="Aucun achat pour ce client." /> : (
            <div className="divide-y">
              {sales.map((s) => (
                <Link key={s.id} to="/factures/$id" params={{ id: s.id }} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><div className="text-sm font-semibold">{s.invoiceNumber}</div><div className="truncate text-xs text-muted-foreground">{relDate(s.date)} · {s.items.map((i) => i.name).join(", ")}</div></div>
                  <div className="shrink-0 text-right"><div className="text-sm font-bold">{fcfa(s.total)}</div><SaleStatusPill status={s.status} /></div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
      {edit && <CustomerForm customer={c} onClose={() => setEdit(false)} />}
    </div>
  );
}
