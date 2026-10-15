import { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronLeft,
  Download,
  Printer,
  Share2,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Building,
  Calendar,
  CreditCard,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Receipt,
  FileText,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { SaleStatusPill, Empty, Field, inputCls, NativeSelect } from "@/components/app/ui";
import { LogoMark } from "@/components/app/Logo";
import { ThermalReceipt } from "@/components/invoice/ThermalReceipt";
import { useSalesView } from "@/lib/selectors";
import { useStore } from "@/lib/store";
import { fcfa, fullDate, METHOD_LABEL, saleSubtotal, saleDiscount, addMonths } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

export const Route = createFileRoute("/factures/$id")({
  head: () => ({ meta: [{ title: "Facture Pro — GESTO" }, { name: "description", content: "Facture client imprimable et partageable conforme." }, { property: "og:title", content: "Facture — GESTO" }, { property: "og:description", content: "Facture client imprimable et partageable." }] }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const sale = useSalesView().find((s) => s.id === id);
  const business = useStore((s) => s.business);
  const customers = useStore((s) => s.customers);
  const convertProformaToInvoice = useStore((s) => s.convertProformaToInvoice);
  const updateSale = useStore((s) => s.updateSale);
  const deleteSale = useStore((s) => s.deleteSale);
  const payments = useStore((s) => s.payments).filter((p) => p.saleId === id);

  const [printFormat, setPrintFormat] = useState<"a4" | "ticket">("a4");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState(sale?.customer?.phone ?? "");
  const [restoreStock, setRestoreStock] = useState(true);

  // Formulaire d'édition
  const [editCustomer, setEditCustomer] = useState(sale?.customerId ?? "");
  const [editDueDate, setEditDueDate] = useState(sale?.dueDate ? sale.dueDate.slice(0, 10) : "");
  const [editMethod, setEditMethod] = useState<PaymentMethod>(sale?.method ?? "especes");
  const [editNotes, setEditNotes] = useState(sale?.notes ?? "");

  useEffect(() => {
    if (printFormat === "ticket") {
      document.body.classList.add("print-format-ticket");
    } else {
      document.body.classList.remove("print-format-ticket");
    }
    return () => {
      document.body.classList.remove("print-format-ticket");
    };
  }, [printFormat]);

  if (!sale) return <Empty text="Facture introuvable." />;

  const isProforma = sale.docType === "proforma";
  const docTitle = isProforma ? "FACTURE PROFORMA" : "FACTURE";

  const onConvert = () => {
    if (!confirm("Voulez-vous valider ce devis et le convertir en Facture officielle ? Le stock sera alors mis à jour.")) return;
    const res = convertProformaToInvoice(sale.id);
    if (res) {
      toast.success("Devis converti en Facture officielle !", { description: `Nouvelle facture N° ${res.sale.invoiceNumber}` });
      if (res.lowStock.length) {
        res.lowStock.forEach((p) => toast.warning(`Stock faible : ${p.name} (${p.stock} restant)`));
      }
      navigate({ to: "/factures/$id", params: { id: res.sale.id } });
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: Parameters<typeof updateSale>[1] = {
      customerId: editCustomer,
      method: editMethod,
    };
    if (editDueDate) {
      patch.dueDate = new Date(editDueDate).toISOString();
    }
    if (editNotes.trim()) {
      patch.notes = editNotes.trim();
    }
    updateSale(sale.id, patch);
    toast.success("Facture modifiée avec succès");
    setShowEdit(false);
  };

  const handleDelete = () => {
    const success = deleteSale(sale.id, restoreStock);
    if (success) {
      toast.success(
        isProforma
          ? "Devis proforma supprimé"
          : restoreStock
          ? "Facture annulée et articles réintégrés au stock"
          : "Facture supprimée",
      );
      navigate({ to: "/factures" });
    }
  };

  const itemsList = sale.items
    .map((i) => `• ${i.quantity}x ${i.name} : ${fcfa(i.quantity * i.unitPrice)}`)
    .join("\n");

  const whatsappReceiptText = isProforma
    ? `📄 *DEVIS PROFORMA — ${business.name}*\nN° : ${sale.invoiceNumber}\nClient : ${sale.customer?.name || "Comptoir"}\nDate : ${fullDate(sale.date)}\n\n*Articles :*\n${itemsList}\n\n*TOTAL NET : ${fcfa(sale.total)}*\nValidité : 15 jours.\n\n_${business.footerMessage || "Merci pour votre confiance !"}_`
    : `🧾 *REÇU DE VENTE — ${business.name}*\nFacture N° : ${sale.invoiceNumber}\nClient : ${sale.customer?.name || "Comptoir"}\nDate : ${fullDate(sale.date)}\n\n*Détail :*\n${itemsList}\n\n*TOTAL : ${fcfa(sale.total)}*\nPayé (${METHOD_LABEL[sale.method]}) : ${fcfa(sale.paid)}${sale.remaining ? `\n*Reste dû : ${fcfa(sale.remaining)}*` : "\nStatut : ✅ Réglé intégralement"}\n\n_${business.footerMessage || "Merci pour votre fidélité !"}_`;

  const sendWhatsApp = (targetPhone?: string) => {
    const raw = (targetPhone || recipientPhone || "").replace(/\D/g, "");
    if (!raw) {
      toast.error("Veuillez renseigner un numéro de téléphone");
      return;
    }
    const cleanPhone = raw.startsWith("221") || raw.length > 9 ? raw : `221${raw}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappReceiptText)}`, "_blank");
  };

  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${docTitle} ${sale.invoiceNumber}`, text: whatsappReceiptText }); } catch { /* annulé */ }
    } else {
      await navigator.clipboard.writeText(whatsappReceiptText);
      toast.success("Texte du reçu copié dans le presse-papier !");
    }
  };

  const handlePrint = () => {
    if (printFormat === "ticket") {
      document.body.classList.add("print-format-ticket");
    } else {
      document.body.classList.remove("print-format-ticket");
    }
    window.print();
  };

  const subtotal = saleSubtotal(sale);
  const totalDiscount = saleDiscount(sale);
  const isTva = business.taxRegime === "tva_18";
  const htAmount = isTva ? Math.round(sale.total / 1.18) : sale.total;
  const tvaAmount = isTva ? sale.total - htAmount : 0;

  const warranties = sale.items.filter((i) => i.warrantyMonths > 0);
  const btn = "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition";

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-12">
      {/* Barre d'action supérieure */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link to="/factures" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ChevronLeft className="size-4" /> Retour aux factures
        </Link>
        <div className="flex items-center gap-2">
          {isProforma ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Devis Proforma
            </span>
          ) : (
            <SaleStatusPill status={sale.status} />
          )}

          <div className="ml-2 flex items-center gap-1 border-l pl-2">
            <button
              onClick={() => {
                setEditCustomer(sale.customerId);
                setEditDueDate(sale.dueDate ? sale.dueDate.slice(0, 10) : "");
                setEditMethod(sale.method);
                setEditNotes(sale.notes ?? "");
                setShowEdit(true);
              }}
              className="inline-flex h-8 items-center gap-1 rounded-lg border bg-card px-2.5 text-xs font-medium hover:bg-muted"
              title="Modifier les détails de la facture"
            >
              <Pencil className="size-3.5 text-muted-foreground" />
              <span>Modifier</span>
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
              title="Supprimer ou annuler cette facture"
            >
              <Trash2 className="size-3.5" />
              <span>Supprimer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alerte & bouton de conversion si proforma */}
      {isProforma && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="text-sm">
            <div className="font-bold">Ceci est un Devis / Facture Proforma</div>
            <div className="text-xs text-amber-800 dark:text-amber-300">Ce document n'a pas encore décrémenté votre stock de marchandises.</div>
          </div>
          <button
            onClick={onConvert}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-amber-800"
          >
            <CheckCircle2 className="size-4" />
            <span>Valider en Vente officielle</span>
          </button>
        </div>
      )}

      {/* Sélecteur de format Facture A4 vs Ticket Thermique 80mm */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card p-2 shadow-sm">
        <div className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground">
          <span>Format d'impression & d'affichage :</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPrintFormat("a4")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${printFormat === "a4" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            <FileText className="size-3.5" /> Facture A4 Standard
          </button>
          <button
            onClick={() => setPrintFormat("ticket")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${printFormat === "ticket" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Receipt className="size-3.5" /> Ticket Caisse (80mm)
          </button>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="no-print grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button onClick={handlePrint} className={`${btn} bg-primary text-primary-foreground hover:brightness-105 shadow-sm`}>
          <Download className="size-4" /> PDF
        </button>
        <button onClick={handlePrint} className={`${btn} border bg-card hover:bg-muted`}>
          <Printer className="size-4" /> Imprimer {printFormat === "ticket" ? "(80mm)" : "(A4)"}
        </button>
        <button onClick={share} className={`${btn} border bg-card hover:bg-muted`}>
          <Share2 className="size-4" /> Partager
        </button>
        <button onClick={() => setShowWhatsAppModal(true)} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm`}>
          <MessageCircle className="size-4" /> WhatsApp
        </button>
      </div>

      {/* MODAL ENVOI WHATSAPP AVEC PRÉVISUALISATION DU TICKET */}
      {showWhatsAppModal && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setShowWhatsAppModal(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
                <MessageCircle className="size-5" />
                <span>Envoyer le reçu sur WhatsApp</span>
              </div>
              <button onClick={() => setShowWhatsAppModal(false)}><X className="size-5 text-muted-foreground" /></button>
            </div>

            <div className="space-y-4">
              <Field label="Numéro WhatsApp du destinataire">
                <input
                  type="tel"
                  className={inputCls}
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="Ex : 77 123 45 67 ou 221771234567"
                />
              </Field>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Aperçu du message formaté :</label>
                <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed text-foreground">
                  {whatsappReceiptText}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(whatsappReceiptText);
                    toast.success("Texte copié !");
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold hover:bg-muted"
                >
                  <Copy className="size-3.5" /> Copier le texte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sendWhatsApp(recipientPhone);
                    setShowWhatsAppModal(false);
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                >
                  <ExternalLink className="size-3.5" /> Ouvrir WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MODIFIER FACTURE */}
      {showEdit && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setShowEdit(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base">Modifier {docTitle} {sale.invoiceNumber}</h3>
              <button onClick={() => setShowEdit(false)}><X className="size-5 text-muted-foreground" /></button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <Field label="Client associé">
                <NativeSelect value={editCustomer} onChange={(e) => setEditCustomer(e.target.value)}>
                  <option value="">Client de passage (comptoir)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
                  ))}
                </NativeSelect>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Date d'échéance">
                  <input
                    type="date"
                    className={inputCls}
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                </Field>
                <Field label="Mode de règlement">
                  <NativeSelect value={editMethod} onChange={(e) => setEditMethod(e.target.value as PaymentMethod)}>
                    {(Object.keys(METHOD_LABEL) as PaymentMethod[]).map((m) => (
                      <option key={m} value={m}>{METHOD_LABEL[m]}</option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>

              <Field label="Notes / Conditions particulières">
                <textarea
                  className={`${inputCls} h-20 py-2`}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Ex : Règlement sous 30 jours, virement bancaire requis…"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowEdit(false)} className="h-10 rounded-lg border px-4 text-xs font-semibold">
                  Annuler
                </button>
                <button type="submit" className="h-10 rounded-lg bg-primary px-5 text-xs font-semibold text-primary-foreground shadow-sm">
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUPPRIMER / ANNULER FACTURE */}
      {showDelete && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setShowDelete(false)}>
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3 text-destructive">
              <div className="grid size-10 place-items-center rounded-full bg-destructive/10">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">Supprimer {docTitle} {sale.invoiceNumber} ?</h3>
                <div className="text-xs text-muted-foreground">Action irréversible</div>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-4 bg-muted/50 p-3 rounded-xl border">
              <div>• Le document sera retiré de l'historique et des totaux de vente.</div>
              <div>• Les paiements liés ({payments.length} versement(s)) seront annulés.</div>
              {!isProforma && (
                <div className="pt-2 border-t font-medium text-foreground">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restoreStock}
                      onChange={(e) => setRestoreStock(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Réintégrer automatiquement les articles vendus au stock de marchandises (Recommandé)</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowDelete(false)} className="h-9 rounded-lg border px-4 text-xs font-semibold">
                Annuler
              </button>
              <button
                onClick={handleDelete}
                className="h-9 rounded-lg bg-destructive px-4 text-xs font-semibold text-destructive-foreground shadow-sm"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZONE IMPRIMABLE : TICKET DE CAISSE 80MM OU FACTURE A4 */}
      {printFormat === "ticket" ? (
        <ThermalReceipt sale={sale} business={business} isProforma={isProforma} />
      ) : (
        <article className="print-area card-surface overflow-hidden border bg-white text-slate-900 p-8 shadow-sm print:border-none print:p-0 print:shadow-none">
          {/* En-tête blanc épuré & professionnel */}
          <div className="flex flex-wrap items-start justify-between gap-6 border-b pb-5">
            <div className="flex items-start gap-3.5">
              {business.logoDataUrl ? (
                <img src={business.logoDataUrl} alt="Logo" className="size-14 rounded-lg object-contain border p-1" />
              ) : (
                <div className="grid size-12 place-items-center rounded-lg bg-primary/10 text-primary font-bold">
                  <LogoMark className="size-8" />
                </div>
              )}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg font-bold text-slate-900">{business.name}</span>
                {business.legalForm && (
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">({business.legalForm})</span>
                )}
                <Link to="/parametres" className="no-print text-xs text-primary hover:underline font-normal ml-1">
                  (Modifier nom/lieu)
                </Link>
              </div>
              <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                <div>{business.address}</div>
                <div>Tél : {business.phone} {business.email ? `· ${business.email}` : ""}</div>
                {(business.ninea || business.rccm) && (
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {business.ninea && <span>NINEA : {business.ninea} </span>}
                    {business.rccm && <span>· RCCM : {business.rccm}</span>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-primary">
              {docTitle}
            </div>
            <div className="font-display text-xl font-extrabold text-slate-900 mt-0.5">
              {sale.invoiceNumber}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Date : <span className="font-medium text-slate-800">{fullDate(sale.date)}</span>
            </div>
            {sale.dueDate && (
              <div className="text-xs text-slate-600">
                Échéance : <span className="font-medium text-slate-800">{fullDate(sale.dueDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Coordonnées Client & Modalités */}
        <div className="mt-4 grid grid-cols-2 gap-6 text-xs border-b pb-4">
          <div>
            <div className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-1">
              Facturé à (Client)
            </div>
            <div className="text-sm font-bold text-slate-900">{sale.customer?.name || "Client de passage"}</div>
            {sale.customer?.phone && <div className="text-slate-600 mt-0.5">Tél : {sale.customer.phone}</div>}
            {sale.customer?.address && <div className="text-slate-500">{sale.customer.address}</div>}
          </div>

          <div className="text-right">
            <div className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-1">
              Règlement
            </div>
            <div className="text-xs text-slate-700">
              Mode : <span className="font-semibold text-slate-900">{METHOD_LABEL[sale.method] || sale.method}</span>
            </div>
            {isProforma && (
              <div className="text-[11px] text-amber-700 font-medium mt-0.5">
                Devis valable 15 jours
              </div>
            )}
          </div>
        </div>

        {/* Tableau des articles épuré */}
        <div className="mt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-slate-500 font-semibold text-left">
                <th className="py-2">Désignation</th>
                <th className="py-2 text-center w-12">Qté</th>
                <th className="py-2 text-right w-28">Prix unit.</th>
                <th className="py-2 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((i) => (
                <tr key={i.id} className="align-middle">
                  <td className="py-2">
                    <span className="font-medium text-slate-900">{i.name}</span>
                    {i.serialNumber && <span className="text-[11px] text-slate-400 ml-2">S/N: {i.serialNumber}</span>}
                    {i.warrantyMonths > 0 && <span className="text-[10px] text-emerald-600 ml-2">Garantie {i.warrantyMonths}m</span>}
                    {i.discount > 0 && <span className="text-[10px] text-emerald-600 ml-2">Remise −{fcfa(i.discount)}</span>}
                  </td>
                  <td className="py-2 text-center text-slate-700">{i.quantity}</td>
                  <td className="py-2 text-right text-slate-600">{fcfa(i.unitPrice)}</td>
                  <td className="py-2 text-right font-semibold text-slate-900">
                    {fcfa(i.quantity * i.unitPrice - i.discount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux & Reste à payer compact */}
        <div className="mt-4 flex items-start justify-between border-t pt-3">
          <div className="text-[11px] text-slate-500 space-y-1 max-w-sm">
            {isTva ? (
              <div>Montants en FCFA (TVA 18% incluse).</div>
            ) : (
              <div>Exonéré de TVA selon le Code Général des Impôts (CGI).</div>
            )}
            {business.bankIban && sale.method === "virement" && (
              <div className="font-mono text-[10px] text-slate-600">
                RIB Virement : {business.bankName ? `${business.bankName} - ` : ""}{business.bankIban}
              </div>
            )}
            {business.paymentTerms && (
              <div className="italic text-slate-400 text-[10px]">{business.paymentTerms}</div>
            )}
          </div>

          <div className="w-56 space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Sous-total</span>
              <span>{fcfa(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Remise</span>
                <span>− {fcfa(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-b py-1 font-bold text-sm text-slate-900">
              <span>Net à payer</span>
              <span className="text-primary">{fcfa(sale.total)}</span>
            </div>
            {!isProforma && (
              <>
                <div className="flex justify-between text-emerald-700 text-xs">
                  <span>Payé</span>
                  <span>{fcfa(sale.paid)}</span>
                </div>
                {sale.remaining > 0 && (
                  <div className="flex justify-between font-bold text-destructive text-xs">
                    <span>Reste dû</span>
                    <span>{fcfa(sale.remaining)}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notes et conditions particulières */}
        {sale.notes && (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-800 block mb-0.5">Notes & Modalités :</span>
            <p className="whitespace-pre-line text-[11px] leading-relaxed text-slate-600">{sale.notes}</p>
          </div>
        )}

        {/* Cadre signature épuré et compact (ne force pas de page 2) */}
        <div className="mt-5 grid grid-cols-2 gap-8 text-[11px] text-slate-500 border-t pt-3">
          <div className="border border-slate-200 rounded p-2.5 h-20 flex flex-col justify-between">
            <span className="font-semibold text-slate-700">Signature Client / Décharge</span>
            <span className="text-[9px] text-slate-400">Mention manuscrite « Lu et approuvé »</span>
          </div>
          <div className="border border-slate-200 rounded p-2.5 h-20 flex flex-col justify-between text-right">
            <span className="font-semibold text-slate-700">Cachet & Signature Établissement</span>
            <span className="text-[9px] text-primary font-medium">{business.name}</span>
          </div>
        </div>

        {/* Message de pied de page discret */}
        <div className="mt-4 text-center text-[11px] text-slate-400">
          {business.footerMessage || "Merci pour votre confiance."}
        </div>
      </article>
      )}
    </div>
  );
}
