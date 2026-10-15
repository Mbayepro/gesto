import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Minus, Plus, Search, Trash2, UserPlus, User, Wrench, MessageCircle, FileText, Save, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, Card, Field, inputCls, ProductThumb, Pill, Empty } from "@/components/app/ui";
import { useStore, categories } from "@/lib/store";
import { fcfa, METHOD_LABEL, saleStatus, uid } from "@/lib/format";
import type { PaymentMethod, SaleItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { BarcodeScanner, ScanButton } from "@/components/app/BarcodeScanner";

export const Route = createFileRoute("/ventes/nouvelle")({
  head: () => ({ meta: [{ title: "Nouvelle vente — GESTO" }, { name: "description", content: "Enregistrez une vente en 3 étapes : client, produits, paiement." }, { property: "og:title", content: "Nouvelle vente — GESTO" }, { property: "og:description", content: "Enregistrez une vente en 3 étapes : client, produits, paiement." }] }),
  component: NewSale,
});

type Line = SaleItem;
const WALKIN = "Client de passage";
const STEPS = ["Client", "Produits", "Paiement"];
const METHODS: PaymentMethod[] = ["especes", "wave", "orange_money", "virement", "carte"];
const num = (v: string) => Math.max(0, Number(v.replace(/\D/g, "")) || 0);

function NewSale() {
  const navigate = useNavigate();
  const { customers, products, saveCustomer, addSale, business } = useStore();
  const [step, setStep] = useState(0);
  const [docType, setDocType] = useState<"facture" | "proforma">("facture");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("especes");
  const [received, setReceived] = useState<number | null>(null);

  const isProforma = docType === "proforma";
  const subtotal = lines.reduce((a, l) => a + l.quantity * l.unitPrice, 0);
  const discounts = lines.reduce((a, l) => a + l.discount, 0) + discount;
  const total = Math.max(0, subtotal - discounts);
  const paidInput = isProforma ? 0 : (received ?? total);
  const paid = isProforma ? 0 : Math.min(paidInput, total);
  const change = isProforma ? 0 : Math.max(0, paidInput - total);
  const remaining = isProforma ? total : Math.max(0, total - paid);
  const customer = customers.find((c) => c.id === customerId);

  const errors = useMemo(() => {
    const e: string[] = [];
    if (!customerId) e.push("Choisissez un client.");
    if (!lines.length) e.push("Ajoutez au moins un article.");
    for (const l of lines) {
      if (l.quantity < 1) e.push(`Quantité invalide : ${l.name}`);
      if (!l.name.trim()) e.push("Une ligne n'a pas de libellé.");
      if (l.discount > l.quantity * l.unitPrice) e.push(`Remise trop élevée : ${l.name}`);
      const p = products.find((x) => x.id === l.productId);
      if (!isProforma && p && !p.isService && l.quantity > p.stock) {
        e.push(`Stock insuffisant : ${p.name} (${p.stock} dispo)`);
      }
    }
    if (discounts > subtotal) e.push("Les remises dépassent le sous-total.");
    return e;
  }, [customerId, lines, products, discounts, subtotal, isProforma]);

  const addProduct = (id: string) => {
    const p = products.find((x) => x.id === id)!;
    setLines((ls) => {
      const ex = ls.find((l) => l.productId === id);
      if (ex) {
        if (!isProforma && !p.isService && ex.quantity >= p.stock) {
          toast.error(`Stock maximum atteint pour ${p.name}`);
          return ls;
        }
        return ls.map((l) => (l === ex ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [...ls, { id: uid(), productId: p.id, name: p.name, quantity: 1, unitPrice: p.salePrice, discount: 0, serialNumber: p.serialNumber, warrantyMonths: p.warrantyMonths }];
    });
  };

  const addFreeLine = (label = "Article divers", price = 5000) => {
    setLines((ls) => [
      ...ls,
      { id: uid(), productId: null, name: label, quantity: 1, unitPrice: price, discount: 0, warrantyMonths: 0 },
    ]);
    toast.success("Ligne libre ajoutée au panier");
  };

  const update = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const save = (then: "list" | "invoice" | "whatsapp") => {
    if (errors.length) { toast.error(errors[0]); return; }
    const { sale, lowStock } = addSale({
      customerId: customerId!,
      items: lines.map(({ id: _id, ...rest }) => rest),
      discount,
      method,
      paidAmount: paid,
      docType,
    });

    const successMsg = isProforma ? "Devis / Proforma enregistré" : "Vente enregistrée";
    const descMsg = isProforma ? `Devis ${sale.invoiceNumber} prêt à envoyer` : `Facture ${sale.invoiceNumber} générée`;
    toast.success(successMsg, { description: descMsg });

    if (!isProforma) {
      lowStock.forEach((p) => toast.warning(`Stock faible : ${p.name}`, { description: `Il reste ${p.stock} unité(s)` }));
    }

    if (then === "whatsapp" && customer) {
      const phone = customer.phone.replace(/\D/g, "");
      const docLabel = isProforma ? "DEVIS PROFORMA" : "Facture";
      const msg = isProforma
        ? `Bonjour ${customer.name},\nVoici votre devis ${sale.invoiceNumber} de ${business.name}.\nMontant total : ${fcfa(total)}\nValable 15 jours.`
        : `Bonjour ${customer.name},\nMerci pour votre achat chez ${business.name}.\nFacture : ${sale.invoiceNumber}\nTotal : ${fcfa(total)}\nPayé : ${fcfa(paid)}${remaining ? `\nReste à payer : ${fcfa(remaining)}` : ""}`;
      window.open(`https://wa.me/${phone.startsWith("221") ? phone : `221${phone}`}?text=${encodeURIComponent(msg)}`, "_blank");
    }

    if (then === "list") navigate({ to: "/factures" });
    else navigate({ to: "/factures/$id", params: { id: sale.id } });
  };

  const canNext = step === 0 ? !!customerId : step === 1 ? lines.length > 0 : true;

  return (
    <div className="pb-24 lg:pb-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <PageHeader title={isProforma ? "Nouveau devis / Proforma" : "Nouvelle vente"} subtitle="Client, produits, règlement : c'est enregistré en quelques secondes." />
        
        {/* Choix du type de document */}
        <div className="flex rounded-lg border bg-card p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setDocType("facture")}
            className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition", !isProforma ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
          >
            Facture officielle
          </button>
          <button
            type="button"
            onClick={() => setDocType("proforma")}
            className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition", isProforma ? "bg-amber-600 text-white shadow-sm" : "text-muted-foreground hover:bg-muted")}
          >
            Devis / Proforma
          </button>
        </div>
      </div>

      <ol className="mb-5 flex gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <button disabled={i > step && !canNext} onClick={() => setStep(i)} className={cn("w-full rounded-lg border px-2 py-2 text-left text-xs font-semibold transition md:text-sm", i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "border-success/30 bg-success/10 text-success" : "bg-card text-muted-foreground")}>
              <span className="mr-1">{i < step ? <Check className="inline size-3.5" /> : `${i + 1}.`}</span>{s}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          {step === 0 && <CustomerStep selected={customerId} onSelect={(id) => { setCustomerId(id); setStep(1); }} onWalkIn={() => {
            const c = customers.find((x) => x.name === WALKIN) ?? saveCustomer({ name: WALKIN, phone: "", email: "", address: "", notes: "" });
            setCustomerId(c.id); setStep(1);
          }} onCreate={(name, phone) => { const c = saveCustomer({ name, phone, email: "", address: "", notes: "" }); toast.success("Client créé"); setCustomerId(c.id); setStep(1); }} />}
          {step === 1 && (
            <div className="space-y-5">
              <ProductPicker lines={lines} onAdd={addProduct} isProforma={isProforma} />
              <Cart
                lines={lines}
                update={update}
                remove={(id) => setLines((ls) => ls.filter((l) => l.id !== id))}
                addService={() => setLines((ls) => [...ls, { id: uid(), productId: null, name: "Installation", quantity: 1, unitPrice: 10000, discount: 0, warrantyMonths: 0 }])}
                addFreeLine={addFreeLine}
                discount={discount}
                setDiscount={setDiscount}
              />
            </div>
          )}
          {step === 2 && (
            <Card title={isProforma ? "Modalités du devis" : "Paiement"}>
              {isProforma ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="font-bold text-sm mb-1">Devis / Facture Proforma</div>
                  <p>Aucun encaissement immédiat n'est requis. Ce devis sera enregistré avec une validité de 15 jours et pourra être converti en facture définitive dès accord du client.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {METHODS.map((m) => (
                      <button key={m} onClick={() => setMethod(m)} className={cn("rounded-xl border-2 px-2 py-4 text-sm font-semibold transition", method === m ? "border-primary bg-secondary text-primary" : "border-border bg-card")}>{METHOD_LABEL[m]}</button>
                    ))}
                  </div>
                  <Field label="Montant reçu" className="mt-5">
                    <input inputMode="numeric" className={cn(inputCls, "h-14 text-xl font-bold")} value={paidInput.toLocaleString("fr-FR")} onChange={(e) => setReceived(num(e.target.value))} />
                  </Field>
                  <div className="mt-2 flex gap-2">
                    <button className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={() => setReceived(total)}>Tout payer</button>
                    <button className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted" onClick={() => setReceived(0)}>Rien payé (Crédit)</button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted p-3"><div className="text-muted-foreground">Reste à payer</div><div className="text-lg font-bold text-destructive">{fcfa(remaining)}</div></div>
                    <div className="rounded-lg bg-muted p-3"><div className="text-muted-foreground">Monnaie à rendre</div><div className="text-lg font-bold text-success">{fcfa(change)}</div></div>
                  </div>
                </>
              )}
              {errors.length > 0 && <ul className="mt-4 space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{errors.map((e) => <li key={e}>• {e}</li>)}</ul>}
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                <button onClick={() => save("list")} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary font-semibold text-primary-foreground hover:brightness-105"><Save className="size-4" />Enregistrer</button>
                <button onClick={() => save("invoice")} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-accent-foreground hover:brightness-105"><FileText className="size-4" />{isProforma ? "+ Voir le devis" : "+ Voir la facture"}</button>
                <button onClick={() => save("whatsapp")} disabled={!customer?.phone} className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-emerald-600 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><MessageCircle className="size-4" />+ WhatsApp</button>
              </div>
            </Card>
          )}
        </div>

        <aside className="fixed inset-x-0 bottom-[60px] z-20 border-t bg-card px-4 py-3 shadow-lg lg:static lg:self-start lg:rounded-xl lg:border lg:p-5 lg:shadow-sm">
          <div className="hidden lg:block">
            <h2 className="mb-3 font-semibold">Récapitulatif</h2>
            <div className="mb-3 flex items-center gap-2 text-sm"><User className="size-4 text-muted-foreground" />{customer?.name ?? <span className="text-muted-foreground">Aucun client</span>}</div>
            <div className="space-y-1 text-sm">
              <Row k={`Sous-total (${lines.reduce((a, l) => a + l.quantity, 0)} art.)`} v={fcfa(subtotal)} />
              <Row k="Remises" v={`− ${fcfa(discounts)}`} />
              <Row k="Payé" v={fcfa(paid)} />
            </div>
            <div className="my-3 border-t" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-display text-xl font-bold">{fcfa(total)}</div>
              {step === 2 && <Pill tone={{ payee: "success", partielle: "warning", impayee: "destructive" }[saleStatus(total, paid)] as "success"}>{{ payee: "Payée", partielle: "Partielle", impayee: "Impayée" }[saleStatus(total, paid)]}</Pill>}
            </div>
            <div className="flex gap-2">
              {step > 0 && <button onClick={() => setStep(step - 1)} className="grid size-11 place-items-center rounded-lg border" aria-label="Retour"><ChevronLeft className="size-5" /></button>}
              {step < 2 && <button disabled={!canNext} onClick={() => setStep(step + 1)} className="inline-flex h-11 items-center gap-1 rounded-lg bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-40">Suivant<ChevronRight className="size-4" /></button>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;

function CustomerStep({ selected, onSelect, onWalkIn, onCreate }: { selected: string | null; onSelect: (id: string) => void; onWalkIn: () => void; onCreate: (n: string, p: string) => void }) {
  const customers = useStore((s) => s.customers);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const list = customers.filter((c) => c.name !== WALKIN && (c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))));
  const submit = () => {
    if (name.trim().length < 2) { toast.error("Nom du client requis"); return; }
    if (phone.replace(/\D/g, "").length < 9) { toast.error("Numéro de téléphone invalide (9 chiffres)"); return; }
    onCreate(name.trim().slice(0, 100), phone.trim().slice(0, 20));
  };
  return (
    <Card title="Choisir le client" action={<button onClick={onWalkIn} className="text-sm font-medium text-primary">Client de passage</button>}>
      <div className="relative">
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <input className={cn(inputCls, "pl-9")} placeholder="Nom ou téléphone…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {creating ? (
        <div className="mt-3 grid gap-3 rounded-lg border bg-muted/40 p-3 sm:grid-cols-2">
          <Field label="Nom"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus /></Field>
          <Field label="Téléphone"><input className={inputCls} inputMode="tel" placeholder="77 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} /></Field>
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={submit} className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Créer et choisir</button>
            <button onClick={() => setCreating(false)} className="h-10 rounded-lg border px-4 text-sm">Annuler</button>
          </div>
        </div>
      ) : (
        <button onClick={() => { setCreating(true); setName(/\d/.test(q) ? "" : q); setPhone(/\d/.test(q) ? q : ""); }} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary"><UserPlus className="size-4" />Nouveau client</button>
      )}
      <div className="mt-3 divide-y">
        {list.map((c) => (
          <button key={c.id} onClick={() => onSelect(c.id)} className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-2 py-3 text-left hover:bg-muted", selected === c.id && "bg-secondary")}>
            <div className="min-w-0"><div className="truncate text-sm font-semibold">{c.name}</div><div className="text-xs text-muted-foreground">{c.phone}</div></div>
            {selected === c.id && <Check className="size-4 text-primary" />}
          </button>
        ))}
        {!list.length && <p className="py-4 text-center text-sm text-muted-foreground">Aucun client trouvé.</p>}
      </div>
    </Card>
  );
}

function ProductPicker({ lines, onAdd, isProforma }: { lines: Line[]; onAdd: (id: string) => void; isProforma?: boolean }) {
  const products = useStore((s) => s.products);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScan = (code: string) => {
    setScannerOpen(false);
    const cleaned = code.trim().toLowerCase();
    const found = products.find(
      (p) =>
        p.reference.toLowerCase() === cleaned ||
        (p.serialNumber && p.serialNumber.toLowerCase() === cleaned) ||
        p.id.toLowerCase() === cleaned ||
        p.name.toLowerCase().includes(cleaned),
    );

    if (found) {
      onAdd(found.id);
      toast.success(`Produit scanné : ${found.name}`, { description: `Réf: ${found.reference}` });
    } else {
      setQ(code);
      toast.error(`Code scanné : "${code}"`, {
        description: "Aucun produit correspondant dans le catalogue. Recherche appliquée.",
      });
    }
  };

  const list = products.filter((p) => (!cat || p.categoryId === cat) && `${p.name} ${p.reference} ${p.brand}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Card
      title="Ajouter des produits du catalogue"
      action={
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent hover:text-accent-foreground transition"
        >
          <Zap className="size-3.5" />
          Scanner code-barres
        </button>
      }
    >
      {scannerOpen && <BarcodeScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <input className={cn(inputCls, "pl-9")} placeholder="Nom, référence, code-barres…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ScanButton onClick={() => setScannerOpen(true)} />
      </div>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {[{ id: "", name: "Tous" }, ...categories].map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-semibold", cat === c.id ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>{c.name}</button>
        ))}
      </div>
      <div className="mt-3 grid max-h-[360px] gap-2 overflow-y-auto sm:grid-cols-2">
        {list.map((p) => {
          const inCart = lines.find((l) => l.productId === p.id)?.quantity ?? 0;
          const out = !isProforma && !p.isService && p.stock - inCart <= 0;
          return (
            <button key={p.id} disabled={out} onClick={() => onAdd(p.id)} className="flex items-center gap-3 rounded-lg border bg-card p-2 text-left transition hover:border-primary disabled:opacity-45">
              <ProductThumb emoji={p.image} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="text-xs font-bold text-primary">{fcfa(p.salePrice)}</div>
                <div className={cn("text-xs", p.stock <= p.alertThreshold ? "text-warning" : "text-muted-foreground")}>
                  {p.isService ? "Service" : p.stock === 0 ? (isProforma ? "Stock 0 (Autorisé sur devis)" : "Rupture") : `Stock : ${p.stock}`}
                </div>
              </div>
              {inCart > 0 ? <span className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{inCart}</span> : <Plus className="size-5 text-primary" />}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function Cart({
  lines,
  update,
  remove,
  addService,
  addFreeLine,
  discount,
  setDiscount,
}: {
  lines: Line[];
  update: (id: string, p: Partial<Line>) => void;
  remove: (id: string) => void;
  addService: () => void;
  addFreeLine: (label?: string, price?: number) => void;
  discount: number;
  setDiscount: (n: number) => void;
}) {
  const products = useStore((s) => s.products);
  return (
    <Card
      title={`Panier (${lines.length})`}
      action={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => addFreeLine("Article libre", 15000)}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-600/30 transition"
            title="Ajouter directement une ligne personnalisée comme sur Excel sans passer par le catalogue"
          >
            <Plus className="size-3.5" /> Ligne libre (style Excel)
          </button>
          <button type="button" onClick={addService} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
            <Wrench className="size-3.5" /> Prestation
          </button>
        </div>
      }
    >
      {!lines.length ? <Empty text="Sélectionnez un produit ou cliquez sur 'Ligne libre' pour commencer." /> : (
        <div className="space-y-3">
          {lines.map((l) => {
            const p = products.find((x) => x.id === l.productId);
            const max = p && !p.isService ? p.stock : 999;
            return (
              <div key={l.id} className="rounded-lg border p-3 bg-card">
                <div className="flex items-start justify-between gap-2">
                  {l.productId ? (
                    <div className="text-sm font-semibold">{l.name}</div>
                  ) : (
                    <div className="flex-1">
                      <input
                        className={cn(inputCls, "h-9 font-semibold text-primary")}
                        value={l.name}
                        maxLength={80}
                        onChange={(e) => update(l.id, { name: e.target.value })}
                        placeholder="Libellé personnalisé (ex. Livraison, Câble HDMI, Réparation...)"
                      />
                    </div>
                  )}
                  <button onClick={() => remove(l.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded" aria-label="Supprimer">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="flex items-center rounded-lg border">
                    <button className="grid size-10 place-items-center" onClick={() => update(l.id, { quantity: Math.max(1, l.quantity - 1) })}><Minus className="size-4" /></button>
                    <span className="flex-1 text-center font-bold">{l.quantity}</span>
                    <button className="grid size-10 place-items-center disabled:opacity-30" disabled={l.quantity >= max} onClick={() => update(l.id, { quantity: l.quantity + 1 })}><Plus className="size-4" /></button>
                  </div>
                  <label className="text-xs text-muted-foreground">Prix unitaire (FCFA)<input inputMode="numeric" className={cn(inputCls, "h-10 font-bold")} value={l.unitPrice} onChange={(e) => update(l.id, { unitPrice: num(e.target.value) })} /></label>
                  <label className="text-xs text-muted-foreground">Remise (FCFA)<input inputMode="numeric" className={cn(inputCls, "h-10")} value={l.discount} onChange={(e) => update(l.id, { discount: num(e.target.value) })} /></label>
                  {l.productId && l.warrantyMonths > 0 ? (
                    <label className="text-xs text-muted-foreground">N° de série (S/N)<input className={cn(inputCls, "h-10")} value={l.serialNumber ?? ""} maxLength={60} onChange={(e) => update(l.id, { serialNumber: e.target.value })} /></label>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>
                <div className="mt-2 text-right text-sm font-bold text-foreground">Total ligne : {fcfa(Math.max(0, l.quantity * l.unitPrice - l.discount))}</div>
              </div>
            );
          })}
          <Field label="Remise globale sur la commande (FCFA)"><input inputMode="numeric" className={inputCls} value={discount} onChange={(e) => setDiscount(num(e.target.value))} /></Field>
        </div>
      )}
    </Card>
  );
}
