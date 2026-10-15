import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Phone, Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Card, Pill, Empty, inputCls } from "@/components/app/ui";
import { CustomerForm } from "@/components/app/CustomerForm";
import { useStore } from "@/lib/store";
import { useSalesView } from "@/lib/selectors";
import { fcfa } from "@/lib/format";
import { exportCustomersToExcel } from "@/lib/export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clients/")({
  head: () => ({ meta: [{ title: "Clients — GESTO" }, { name: "description", content: "Vos clients, leurs achats et leurs soldes." }, { property: "og:title", content: "Clients — GESTO" }, { property: "og:description", content: "Vos clients, leurs achats et leurs soldes." }] }),
  component: Page,
});

function Page() {
  const customers = useStore((s) => s.customers);
  const sales = useSalesView();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const rows = customers
    .filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
    .map((c) => {
      const mine = sales.filter((s) => s.customerId === c.id);
      return { c, count: mine.length, total: mine.reduce((a, s) => a + s.total, 0), due: mine.reduce((a, s) => a + s.remaining, 0) };
    })
    .sort((a, b) => b.total - a.total);
  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${customers.length} clients`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (!customers.length) {
                  toast.error("Aucun client à exporter");
                  return;
                }
                exportCustomersToExcel(customers, sales);
                toast.success("Fichier clients Excel (.csv) téléchargé !");
              }}
              title="Exporter les clients en Excel"
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold hover:bg-muted transition"
            >
              <Download className="size-4" /> Exporter Excel
            </button>
            <button onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-1 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
              <Plus className="size-4" />Nouveau client
            </button>
          </div>
        }
      />
      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <input className={cn(inputCls, "pl-9")} placeholder="Nom ou téléphone…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {!rows.length ? <Empty text="Aucun client trouvé." /> : (
          <div className="grid gap-2 sm:grid-cols-2">
            {rows.map(({ c, count, total, due }) => (
              <Link key={c.id} to="/clients/$id" params={{ id: c.id }} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary font-bold text-primary">{c.name[0]}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{c.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="size-3" />{c.phone}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold">{fcfa(total)}</span><span className="text-muted-foreground">· {count} achat(s)</span></div>
                </div>
                {due > 0 ? <Pill tone="warning">Reste {fcfa(due)}</Pill> : <Pill tone="success">À jour</Pill>}
              </Link>
            ))}
          </div>
        )}
      </Card>
      {open && <CustomerForm onClose={() => setOpen(false)} />}
    </div>
  );
}
