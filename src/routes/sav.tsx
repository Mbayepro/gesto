import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, ShieldCheck, ShieldX, Wrench, Plus, X, MessageCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { addMonths, fullDate } from "@/lib/format";
import type { TicketStatus } from "@/lib/types";
import { PageHeader, Card, StatCard, Pill, Empty, Field, inputCls, NativeSelect } from "@/components/app/ui";

export const Route = createFileRoute("/sav")({
  head: () => ({
    meta: [
      { title: "SAV & Garanties — GESTO" },
      { name: "description", content: "Vérifiez les garanties et suivez les réparations de vos clients." },
      { property: "og:title", content: "SAV & Garanties — GESTO" },
      { property: "og:description", content: "Vérifiez les garanties et suivez les réparations de vos clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const STATUS: Record<TicketStatus, { label: string; tone: "warning" | "primary" | "success" }> = {
  en_reparation: { label: "En réparation", tone: "warning" },
  repare: { label: "Réparé", tone: "primary" },
  livre: { label: "Livré", tone: "success" },
};
const NEXT: Partial<Record<TicketStatus, TicketStatus>> = { en_reparation: "repare", repare: "livre" };

type Warranty = {
  key: string; saleId: string; invoice: string; customerId: string; customer: string; phone: string;
  product: string; serial: string; start: string; end: string; active: boolean;
};

function Page() {
  const { sales, customers, tickets, setTicketStatus } = useStore();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | TicketStatus>("all");
  const [prefill, setPrefill] = useState<Warranty | null | undefined>(undefined);

  const warranties = useMemo<Warranty[]>(() => {
    const now = new Date().toISOString();
    const out: Warranty[] = [];
    for (const s of sales) {
      const c = customers.find((x) => x.id === s.customerId);
      for (const it of s.items) {
        if (!it.warrantyMonths) continue;
        const end = addMonths(s.date, it.warrantyMonths);
        out.push({
          key: s.id + it.id, saleId: s.id, invoice: s.invoiceNumber, customerId: s.customerId,
          customer: c?.name ?? "—", phone: c?.phone ?? "", product: it.name, serial: it.serialNumber ?? "",
          start: s.date, end, active: end > now,
        });
      }
    }
    return out.sort((a, b) => b.start.localeCompare(a.start));
  }, [sales, customers]);

  const term = q.trim().toLowerCase().replace(/\s/g, "");
  const results = term.length >= 2
    ? warranties.filter((w) =>
        [w.invoice, w.serial, w.phone, w.customer, w.product].some((v) => v.toLowerCase().replace(/\s/g, "").includes(term)))
    : [];

  const shownTickets = tickets.filter((t) => tab === "all" || t.status === tab);
  const active = warranties.filter((w) => w.active).length;
  const inRepair = tickets.filter((t) => t.status === "en_reparation").length;

  return (
    <div>
      <PageHeader
        title="SAV & Garanties"
        subtitle="Vérifiez une garantie et suivez les réparations"
        actions={
          <button onClick={() => setPrefill(null)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            <Plus className="size-4" /> Nouveau dossier SAV
          </button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatCard label="Sous garantie" value={String(active)} icon={ShieldCheck} tone="success" />
        <StatCard label="Garanties expirées" value={String(warranties.length - active)} icon={ShieldX} tone="destructive" />
        <StatCard label="En réparation" value={String(inRepair)} icon={Wrench} tone="warning" />
      </div>

      <Card title="Vérifier une garantie" className="mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="N° de facture, n° de série ou téléphone du client" className={inputCls + " pl-9"} />
        </div>
        {term.length >= 2 && (
          <div className="mt-3 space-y-2">
            {results.length === 0 && <Empty text="Aucune garantie trouvée pour cette recherche." />}
            {results.slice(0, 20).map((w) => (
              <div key={w.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="font-semibold">{w.product}</div>
                  <div className="text-xs text-muted-foreground">
                    {w.customer} · {w.phone} · <Link to="/factures/$id" params={{ id: w.saleId }} className="text-primary underline">{w.invoice}</Link>
                    {w.serial && <> · S/N {w.serial}</>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">Du {fullDate(w.start)} au {fullDate(w.end)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {w.active ? <Pill tone="success">Sous garantie</Pill> : <Pill tone="destructive">Garantie expirée</Pill>}
                  <button onClick={() => setPrefill(w)} className="h-9 rounded-lg border px-3 text-xs font-semibold hover:bg-muted">Ouvrir un SAV</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Dossiers SAV">
        <div className="mb-3 flex flex-wrap gap-2">
          {(["all", "en_reparation", "repare", "livre"] as const).map((k) => (
            <button key={k} onClick={() => setTab(k)}
              className={"h-9 rounded-full px-3 text-xs font-semibold " + (tab === k ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {k === "all" ? `Tous (${tickets.length})` : `${STATUS[k].label} (${tickets.filter((t) => t.status === k).length})`}
            </button>
          ))}
        </div>
        {shownTickets.length === 0 && <Empty text="Aucun dossier dans cette catégorie." />}
        <div className="grid gap-3 md:grid-cols-2">
          {shownTickets.map((t) => {
            const c = customers.find((x) => x.id === t.customerId);
            const next = NEXT[t.status];
            const msg = encodeURIComponent(`Bonjour ${c?.name ?? ""}, votre ${t.productName} (dossier ${t.number}) est ${STATUS[t.status].label.toLowerCase()}. Merci de votre confiance.`);
            return (
              <div key={t.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">{t.number} · déposé le {fullDate(t.depositDate)}</div>
                    <div className="mt-0.5 font-semibold">{t.productName}</div>
                  </div>
                  <Pill tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Pill>
                </div>
                <p className="mt-2 text-sm">{t.issue}</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  {c ? <Link to="/clients/$id" params={{ id: c.id }} className="text-primary underline">{c.name}</Link> : "—"}
                  {t.serialNumber && <> · S/N {t.serialNumber}</>}
                  {t.technician && <> · Technicien : {t.technician}</>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {next && (
                    <button onClick={() => { setTicketStatus(t.id, next); toast.success(`Dossier ${t.number} : ${STATUS[next].label}`); }}
                      className="h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">
                      Marquer « {STATUS[next].label} »
                    </button>
                  )}
                  {c?.phone && (
                    <a target="_blank" rel="noreferrer" href={`https://wa.me/221${c.phone.replace(/\D/g, "").slice(-9)}?text=${msg}`}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-semibold hover:bg-muted">
                      <MessageCircle className="size-3.5" /> Prévenir le client
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {prefill !== undefined && <TicketForm prefill={prefill} onClose={() => setPrefill(undefined)} />}
    </div>
  );
}

function TicketForm({ prefill, onClose }: { prefill: Warranty | null; onClose: () => void }) {
  const { customers, addTicket } = useStore();
  const [customerId, setCustomerId] = useState(prefill?.customerId ?? "");
  const [productName, setProductName] = useState(prefill?.product ?? "");
  const [serialNumber, setSerial] = useState(prefill?.serial ?? "");
  const [issue, setIssue] = useState("");
  const [technician, setTech] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { toast.error("Choisissez un client"); return; }
    if (!productName.trim()) { toast.error("Indiquez le produit"); return; }
    if (!issue.trim()) { toast.error("Décrivez la panne"); return; }
    addTicket({
      customerId, productName: productName.trim(), serialNumber: serialNumber.trim(), issue: issue.trim(),
      technician: technician.trim(), status: "en_reparation", notes: "", depositDate: new Date().toISOString(),
      ...(prefill ? { saleId: prefill.saleId } : {}),
    });
    toast.success("Dossier SAV créé");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/40 sm:place-items-center" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg space-y-3 rounded-t-2xl bg-card p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Nouveau dossier SAV</h2>
          <button type="button" onClick={onClose} aria-label="Fermer"><X className="size-5" /></button>
        </div>
        {prefill && (
          <div className="rounded-lg bg-muted p-2 text-xs">
            Facture {prefill.invoice} · {prefill.active ? "Sous garantie jusqu'au " + fullDate(prefill.end) : "Garantie expirée (réparation payante)"}
          </div>
        )}
        <Field label="Client">
          <NativeSelect value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Choisir…</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
          </NativeSelect>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Produit"><input className={inputCls} value={productName} onChange={(e) => setProductName(e.target.value)} /></Field>
          <Field label="N° de série"><input className={inputCls} value={serialNumber} onChange={(e) => setSerial(e.target.value)} /></Field>
        </div>
        <Field label="Panne constatée">
          <textarea className={inputCls + " h-20 py-2"} value={issue} onChange={(e) => setIssue(e.target.value)} />
        </Field>
        <Field label="Technicien (facultatif)"><input className={inputCls} value={technician} onChange={(e) => setTech(e.target.value)} /></Field>
        <button className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground">Créer le dossier</button>
      </form>
    </div>
  );
}
