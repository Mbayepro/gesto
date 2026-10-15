import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Wallet, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader, Card, Pill, Empty, StatCard } from "@/components/app/ui";
import { PaymentForm } from "@/components/app/PaymentForm";
import { useStore } from "@/lib/store";
import { useSalesView } from "@/lib/selectors";
import { fcfa, relDate, METHOD_LABEL } from "@/lib/format";

export const Route = createFileRoute("/paiements")({
  head: () => ({ meta: [{ title: "Paiements — GESTO" }, { name: "description", content: "Encaissements, Wave, Orange Money et restes à payer." }, { property: "og:title", content: "Paiements — GESTO" }, { property: "og:description", content: "Encaissements et restes à payer." }] }),
  component: Page,
});

function Page() {
  const payments = useStore((s) => s.payments);
  const sales = useSalesView();
  const [open, setOpen] = useState(false);
  const received = payments.reduce((a, p) => a + p.amount, 0);
  const due = sales.reduce((a, s) => a + s.remaining, 0);
  const pending = sales.filter((s) => s.remaining > 0);
  return (
    <div>
      <PageHeader title="Paiements" actions={<button onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Plus className="size-4" />Enregistrer un paiement</button>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Total encaissé" value={fcfa(received)} icon={CheckCircle2} tone="success" />
        <StatCard label="Reste à recouvrer" value={fcfa(due)} icon={AlertCircle} tone="warning" />
        <StatCard label="Factures en attente" value={String(pending.length)} icon={Wallet} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Restes à payer">
          {!pending.length ? <Empty text="Aucune facture en attente." /> : <div className="divide-y">{pending.map((s) => (
            <Link key={s.id} to="/factures/$id" params={{ id: s.id }} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0"><div className="truncate text-sm font-semibold">{s.customer?.name}</div><div className="text-xs text-muted-foreground">{s.invoiceNumber} · {relDate(s.date)}</div></div>
              <Pill tone={s.paid > 0 ? "warning" : "destructive"}>{fcfa(s.remaining)}</Pill>
            </Link>))}</div>}
        </Card>
        <Card title="Paiements reçus">
          {!payments.length ? <Empty text="Aucun paiement." /> : <div className="divide-y">{[...payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60).map((p) => {
            const s = sales.find((x) => x.id === p.saleId);
            return (
              <div key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0"><div className="truncate text-sm font-semibold">{s?.customer?.name ?? "—"}</div><div className="text-xs text-muted-foreground">{s?.invoiceNumber} · {relDate(p.date)}{p.note ? ` · ${p.note}` : ""}</div></div>
                <div className="shrink-0 text-right"><div className="text-sm font-bold text-success">+{fcfa(p.amount)}</div><Pill tone="primary">{METHOD_LABEL[p.method]}</Pill></div>
              </div>
            );
          })}</div>}
        </Card>
      </div>
      {open && <PaymentForm onClose={() => setOpen(false)} />}
    </div>
  );
}
