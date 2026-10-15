import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { buildSeed, seedBusiness, categories } from "./seed";
import { saleTotal, uid } from "./format";
import {
  pushSaleToCloud,
  pushProductToCloud,
  deleteProductFromCloud,
  pushCustomerToCloud,
} from "./sync";
import { supabase, isSupabaseConfigured } from "./supabase";
import type {
  Business, Customer, Payment, PaymentMethod, Product, Sale, SaleItem, ServiceTicket, StockMovement, StockMovementType, TicketStatus, DocumentType,
} from "./types";

/**
 * Local data store (demo mode). Every mutation goes through these actions so
 * they can later be swapped for Lovable Cloud calls without touching pages.
 */
export interface NewSaleInput {
  customerId: string;
  items: Omit<SaleItem, "id">[];
  discount: number;
  method: PaymentMethod;
  paidAmount: number;
  docType?: DocumentType;
  dueDate?: string;
}

interface State {
  currentBusinessId?: string;
  business: Business;
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  payments: Payment[];
  movements: StockMovement[];
  tickets: ServiceTicket[];
  setCurrentBusinessId: (id: string | null) => void;
  addSale: (input: NewSaleInput) => { sale: Sale; lowStock: Product[] };
  convertProformaToInvoice: (id: string) => { sale: Sale; lowStock: Product[] } | undefined;
  updateSale: (id: string, patch: Partial<Pick<Sale, "customerId" | "dueDate" | "discount" | "notes" | "method">>) => Sale | undefined;
  deleteSale: (id: string, restoreStock?: boolean) => boolean;
  addPayment: (p: Omit<Payment, "id" | "date">) => void;
  saveProduct: (p: Omit<Product, "id"> & { id?: string }) => Product;
  deleteProduct: (id: string) => boolean;
  saveCustomer: (c: Omit<Customer, "id" | "createdAt"> & { id?: string }) => Customer;
  deleteCustomer: (id: string) => boolean;
  addMovement: (m: { productId: string; type: StockMovementType; quantity: number; reason: string }) => Product | undefined;
  addTicket: (t: Omit<ServiceTicket, "id" | "number">) => void;
  setTicketStatus: (id: string, status: TicketStatus) => void;
  updateBusiness: (b: Partial<Business>) => void;
  clearDemoAndStartFresh: (b: Partial<Business>) => void;
  clearDemoStock: () => void;
  reset: () => void;
}

const initial = () => ({ business: { ...seedBusiness }, ...buildSeed() });

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial(),
      setCurrentBusinessId: (id) => set({ currentBusinessId: id || undefined }),
      addSale: (input) => {
        const { sales, business, products, currentBusinessId } = get();
        const year = new Date().getFullYear();
        const isProforma = input.docType === "proforma";
        const maxNum = sales.reduce((m, s) => {
          const parts = s.invoiceNumber.split("-");
          const n = parseInt(parts[parts.length - 1] || "0", 10);
          return Math.max(m, isNaN(n) ? 0 : n);
        }, 0);
        const prefix = isProforma ? "PRO" : business.invoicePrefix;
        const now = new Date();
        const dueDate = input.dueDate || new Date(now.getTime() + (business.defaultDueDays || 30) * 86400000).toISOString();
        
        const sale: Sale = {
          id: uid(),
          invoiceNumber: `${prefix}-${year}-${String(maxNum + 1).padStart(5, "0")}`,
          customerId: input.customerId,
          items: input.items.map((i) => ({ ...i, id: uid() })),
          discount: input.discount,
          date: now.toISOString(),
          dueDate,
          docType: input.docType || "facture",
          method: input.method,
        };

        const newMoves: StockMovement[] = [];
        let updated = products;

        // Le stock n'est décrémenté que pour une vraie facture, pas une proforma
        if (!isProforma) {
          updated = products.map((p) => {
            const qty = sale.items.filter((i) => i.productId === p.id).reduce((a, i) => a + i.quantity, 0);
            if (!qty || p.isService) return p;
            newMoves.push({ id: uid(), productId: p.id, type: "sortie", quantity: -qty, date: sale.date, reason: `Vente ${sale.invoiceNumber}` });
            return { ...p, stock: Math.max(0, p.stock - qty) };
          });
        }

        const paid = isProforma ? 0 : Math.min(input.paidAmount, saleTotal(sale));
        set((s) => ({
          sales: [sale, ...s.sales],
          products: updated,
          movements: [...newMoves, ...s.movements],
          payments: paid > 0 ? [{ id: uid(), saleId: sale.id, amount: paid, method: input.method, date: sale.date }, ...s.payments] : s.payments,
        }));

        // Synchronisation asynchrone avec Supabase Cloud si connecté
        if (currentBusinessId) {
          void pushSaleToCloud(sale, paid, currentBusinessId);
        }

        const lowStock = updated.filter((p) => !p.isService && newMoves.some((m) => m.productId === p.id) && p.stock <= p.alertThreshold);
        return { sale, lowStock };
      },
      convertProformaToInvoice: (id) => {
        const { sales, business, products } = get();
        const existing = sales.find((s) => s.id === id);
        if (!existing || existing.docType !== "proforma") return undefined;

        const year = new Date().getFullYear();
        const maxNum = sales
          .filter((s) => s.docType !== "proforma")
          .reduce((m, s) => {
            const parts = s.invoiceNumber.split("-");
            const n = parseInt(parts[parts.length - 1] || "0", 10);
            return Math.max(m, isNaN(n) ? 0 : n);
          }, 0);

        const newInvoiceNumber = `${business.invoicePrefix}-${year}-${String(maxNum + 1).padStart(5, "0")}`;
        const newMoves: StockMovement[] = [];
        const updated = products.map((p) => {
          const qty = existing.items.filter((i) => i.productId === p.id).reduce((a, i) => a + i.quantity, 0);
          if (!qty || p.isService) return p;
          newMoves.push({ id: uid(), productId: p.id, type: "sortie", quantity: -qty, date: new Date().toISOString(), reason: `Vente ${newInvoiceNumber} (depuis Proforma)` });
          return { ...p, stock: Math.max(0, p.stock - qty) };
        });

        const converted: Sale = {
          ...existing,
          invoiceNumber: newInvoiceNumber,
          docType: "facture",
          date: new Date().toISOString(),
        };

        set((s) => ({
          sales: s.sales.map((sItem) => (sItem.id === id ? converted : sItem)),
          products: updated,
          movements: [...newMoves, ...s.movements],
        }));

        const lowStock = updated.filter((p) => !p.isService && newMoves.some((m) => m.productId === p.id) && p.stock <= p.alertThreshold);
        return { sale: converted, lowStock };
      },
      updateSale: (id, patch) => {
        let updatedSale: Sale | undefined;
        set((s) => ({
          sales: s.sales.map((item) => {
            if (item.id === id) {
              updatedSale = { ...item, ...patch };
              return updatedSale;
            }
            return item;
          }),
        }));
        return updatedSale;
      },
      deleteSale: (id, restoreStock = true) => {
        const { sales, products } = get();
        const sale = sales.find((s) => s.id === id);
        if (!sale) return false;

        const newMoves: StockMovement[] = [];
        let updatedProducts = products;

        // Si c'est une facture officielle et qu'on souhaite réintégrer le stock
        if (restoreStock && sale.docType !== "proforma") {
          updatedProducts = products.map((p) => {
            const qty = sale.items.filter((i) => i.productId === p.id).reduce((a, i) => a + i.quantity, 0);
            if (!qty || p.isService) return p;
            newMoves.push({
              id: uid(),
              productId: p.id,
              type: "entree",
              quantity: qty,
              date: new Date().toISOString(),
              reason: `Annulation vente ${sale.invoiceNumber} (Retour stock)`,
            });
            return { ...p, stock: p.stock + qty };
          });
        }

        set((s) => ({
          sales: s.sales.filter((item) => item.id !== id),
          payments: s.payments.filter((payment) => payment.saleId !== id),
          products: updatedProducts,
          movements: [...newMoves, ...s.movements],
        }));
        return true;
      },
      addPayment: (p) => set((s) => ({ payments: [{ ...p, id: uid(), date: new Date().toISOString() }, ...s.payments] })),
      saveProduct: (p) => {
        const product = { ...p, id: p.id ?? uid() } as Product;
        set((s) => {
          const old = s.products.find((x) => x.id === product.id);
          const exists = !!old;
          let moves = s.movements;
          if (!exists && product.stock > 0) {
            moves = [
              { id: uid(), productId: product.id, type: "entree" as const, quantity: product.stock, date: new Date().toISOString(), reason: "Stock initial" },
              ...s.movements,
            ];
          } else if (exists && old && old.stock !== product.stock && !product.isService) {
            const diff = product.stock - old.stock;
            moves = [
              {
                id: uid(),
                productId: product.id,
                type: "ajustement" as const,
                quantity: diff,
                date: new Date().toISOString(),
                reason: "Ajustement inventaire direct",
              },
              ...s.movements,
            ];
          }
          return { products: exists ? s.products.map((x) => (x.id === product.id ? product : x)) : [product, ...s.products], movements: moves };
        });

        const { currentBusinessId } = get();
        if (currentBusinessId) {
          void pushProductToCloud(product, currentBusinessId);
        }

        return product;
      },
      deleteProduct: (id) => {
        set((s) => ({
          products: s.products.filter((p) => p.id !== id),
          movements: s.movements.filter((m) => m.productId !== id),
        }));

        const { currentBusinessId } = get();
        if (currentBusinessId) {
          void deleteProductFromCloud(id);
        }

        return true;
      },
      saveCustomer: (c) => {
        const existing = c.id ? get().customers.find((x) => x.id === c.id) : undefined;
        const customer: Customer = { ...c, id: c.id ?? uid(), createdAt: existing?.createdAt ?? new Date().toISOString() };
        set((s) => ({ customers: existing ? s.customers.map((x) => (x.id === customer.id ? customer : x)) : [customer, ...s.customers] }));

        const { currentBusinessId } = get();
        if (currentBusinessId) {
          void pushCustomerToCloud(customer, currentBusinessId);
        }

        return customer;
      },
      deleteCustomer: (id) => {
        set((s) => ({
          customers: s.customers.filter((c) => c.id !== id),
        }));

        const { currentBusinessId } = get();
        if (currentBusinessId && isSupabaseConfigured) {
          void supabase.from("customers").delete().eq("id", id);
        }

        return true;
      },
      addMovement: ({ productId, type, quantity, reason }) => {
        const signed = type === "sortie" ? -Math.abs(quantity) : type === "ajustement" ? quantity : Math.abs(quantity);
        let result: Product | undefined;
        set((s) => ({
          movements: [{ id: uid(), productId, type, quantity: signed, date: new Date().toISOString(), reason }, ...s.movements],
          products: s.products.map((p) => (p.id === productId ? (result = { ...p, stock: Math.max(0, p.stock + signed) }) : p)),
        }));
        return result;
      },
      addTicket: (t) =>
        set((s) => {
          const n = s.tickets.reduce((m, x) => Math.max(m, parseInt(x.number.split("-")[1] ?? "0", 10)), 0) + 1;
          return { tickets: [{ ...t, id: uid(), number: `SAV-${String(n).padStart(4, "0")}` }, ...s.tickets] };
        }),
      setTicketStatus: (id, status) => set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, status } : t)) })),
      updateBusiness: (b) => {
        set((s) => ({ business: { ...s.business, ...b } }));
        const { currentBusinessId } = get();
        if (currentBusinessId && isSupabaseConfigured) {
          void supabase
            .from("businesses")
            .update({
              name: b.name,
              owner: b.owner,
              phone: b.phone,
              email: b.email,
              address: b.address,
              ninea: b.ninea,
              rccm: b.rccm,
              legal_form: b.legalForm,
              tax_regime: b.taxRegime,
              bank_name: b.bankName,
              bank_iban: b.bankIban,
              invoice_prefix: b.invoicePrefix,
              payment_terms: b.paymentTerms,
              footer_message: b.footerMessage,
              logo_url: b.logoDataUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentBusinessId);
        }
      },
      clearDemoAndStartFresh: (b) =>
        set((s) => ({
          business: {
            ...s.business,
            name: b.name || "Mon Commerce",
            owner: b.owner || "Gérant",
            address: b.address || "Dakar, Sénégal",
            phone: b.phone || "+221 ",
            email: b.email || "",
            ninea: b.ninea || "",
            rccm: b.rccm || "",
            legalForm: b.legalForm || "Entreprise Individuelle",
            taxRegime: b.taxRegime || "exempte",
            bankName: b.bankName || "",
            bankIban: b.bankIban || "",
          },
          products: [],
          sales: [],
          payments: [],
          movements: [],
          tickets: [],
        })),
      clearDemoStock: () =>
        set({
          products: [],
          sales: [],
          payments: [],
          movements: [],
          tickets: [],
        }),
      reset: () => set(initial()),
    }),
    { name: "gesto-app-v1", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

export { categories };
export const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";
