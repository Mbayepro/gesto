import type { Sale, Business } from "@/lib/types";
import { fcfa, fullDate, METHOD_LABEL, saleSubtotal, saleDiscount } from "@/lib/format";
import { LogoMark } from "@/components/app/Logo";

interface ThermalReceiptProps {
  sale: Sale;
  business: Business;
  isProforma?: boolean;
}

export function ThermalReceipt({ sale, business, isProforma = false }: ThermalReceiptProps) {
  const subtotal = saleSubtotal(sale);
  const totalDiscount = saleDiscount(sale);
  const formattedDate = new Date(sale.date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = new Date(sale.date).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="print-area mx-auto w-full max-w-[340px] rounded-lg border border-dashed border-slate-300 bg-white p-5 font-mono text-xs text-slate-900 shadow-sm print:max-w-none print:border-none print:p-0 print:shadow-none">
      {/* En-tête ticket */}
      <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
        <div className="flex justify-center mb-1">
          {business.logoDataUrl ? (
            <img src={business.logoDataUrl} alt="Logo" className="h-10 max-w-[120px] object-contain" />
          ) : (
            <div className="grid size-9 place-items-center rounded bg-slate-100 text-slate-800">
              <LogoMark className="size-6" />
            </div>
          )}
        </div>
        <div className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
          {business.name}
        </div>
        {business.address && <div className="text-[11px] text-slate-600">{business.address}</div>}
        {business.phone && <div className="text-[11px] text-slate-600">Tél : {business.phone}</div>}
        {business.ninea && <div className="text-[10px] text-slate-500">NINEA : {business.ninea}</div>}
      </div>

      {/* Titre & Métadonnées de vente */}
      <div className="py-2.5 border-b border-dashed border-slate-300 text-[11px] space-y-1">
        <div className="text-center font-bold text-xs uppercase tracking-wider py-0.5 bg-slate-100 rounded">
          {isProforma ? "DEVIS PROFORMA" : "TICKET DE CAISSE"}
        </div>
        <div className="flex justify-between pt-1">
          <span className="text-slate-500">Ticket N° :</span>
          <span className="font-bold">{sale.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Date :</span>
          <span>{formattedDate} à {formattedTime}</span>
        </div>
        {sale.customer && (
          <div className="flex justify-between">
            <span className="text-slate-500">Client :</span>
            <span className="font-bold text-slate-800">{sale.customer.name}</span>
          </div>
        )}
      </div>

      {/* Tableau minimaliste articles */}
      <div className="py-2.5 border-b border-dashed border-slate-300">
        <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400 pb-1">
          <span>Article</span>
          <span>Total</span>
        </div>
        <div className="space-y-1.5 pt-1">
          {sale.items.map((item, idx) => (
            <div key={item.id || idx} className="text-[11px]">
              <div className="font-medium text-slate-900 truncate">{item.name}</div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>{item.quantity} x {fcfa(item.unitPrice)}</span>
                <span className="font-bold text-slate-800">{fcfa(item.quantity * item.unitPrice)}</span>
              </div>
              {item.discount > 0 && (
                <div className="text-right text-[10px] text-emerald-600">
                  Remise : -{fcfa(item.discount)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Totaux & Règlements */}
      <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Sous-total</span>
          <span>{fcfa(subtotal)}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Remise</span>
            <span>− {fcfa(totalDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-200 pt-1.5">
          <span>TOTAL À PAYER</span>
          <span>{fcfa(sale.total)}</span>
        </div>

        {!isProforma && (
          <>
            <div className="flex justify-between text-[11px] text-slate-600 pt-1">
              <span>Règlement ({METHOD_LABEL[sale.method]})</span>
              <span>{fcfa(sale.paid)}</span>
            </div>
            {sale.remaining > 0 ? (
              <div className="flex justify-between font-bold text-red-600 text-xs">
                <span>Reste dû</span>
                <span>{fcfa(sale.remaining)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-emerald-700 text-[11px] font-bold">
                <span>Solde</span>
                <span>RÉGLÉ INTÉGRALEMENT</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes et message de fin */}
      <div className="pt-3 text-center text-[10px] space-y-1 text-slate-500">
        {sale.notes && (
          <div className="italic text-slate-600 pb-1 border-b border-dotted border-slate-200">
            {sale.notes}
          </div>
        )}
        <div className="font-bold text-slate-700">
          {business.footerMessage || "Merci de votre visite et à bientôt !"}
        </div>
        <div className="text-[9px] text-slate-400">
          Les articles vendus ne sont ni repris ni échangés.
        </div>

        {/* Faux code-barre textuel esthétique */}
        <div className="pt-2 font-mono tracking-[0.25em] text-[10px] text-slate-800 select-none">
          ||||| ||| |||| ||||| || ||||||
        </div>
        <div className="text-[8px] text-slate-400">
          GESTO POS • {sale.invoiceNumber}
        </div>
      </div>
    </div>
  );
}
