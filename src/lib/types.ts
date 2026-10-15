// Domain types — mirror the future database tables (see supabase/schema.sql).

export type PaymentMethod = "especes" | "wave" | "orange_money" | "virement" | "carte";
export type StockMovementType = "entree" | "sortie" | "retour" | "ajustement";
export type TicketStatus = "en_reparation" | "repare" | "livre";
export type SaleStatus = "payee" | "partielle" | "impayee";
export type DocumentType = "facture" | "proforma";

export interface Business {
  name: string;
  owner: string;
  address: string;
  phone: string;
  email: string;
  ninea: string;
  rccm?: string;
  legalForm?: string; // ex: SUARL, SARL, Entreprise Individuelle
  taxRegime?: "tva_18" | "exempte";
  bankName?: string;
  bankIban?: string; // RIB / IBAN pour virement
  defaultDueDays?: number; // ex: 0 (comptant), 15, 30 jours
  invoicePrefix: string;
  paymentTerms: string;
  footerMessage: string;
  currency: string;
  notifications: boolean;
  logoDataUrl?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  reference: string;
  categoryId: string;
  brand: string;
  serialNumber?: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  alertThreshold: number;
  warrantyMonths: number;
  description: string;
  image: string; // emoji fallback image
  isService?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number; // amount in FCFA for the line
  serialNumber?: string | undefined;
  warrantyMonths: number;
}

/** A sale and its invoice are 1:1 in this version. */
export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  items: SaleItem[];
  discount: number; // global discount
  date: string;
  dueDate?: string | undefined; // date d'échéance
  docType?: DocumentType | undefined; // facture ou proforma
  method: PaymentMethod; // primary method chosen at sale time
  notes?: string | undefined;
}

export interface Payment {
  id: string;
  saleId: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  note?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  quantity: number; // signed effect on stock
  date: string;
  reason: string;
}

export interface ServiceTicket {
  id: string;
  number: string;
  customerId: string;
  productName: string;
  serialNumber: string;
  issue: string;
  depositDate: string;
  technician: string;
  status: TicketStatus;
  notes: string;
  saleId?: string;
}
