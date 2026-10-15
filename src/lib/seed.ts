import type {
  Business, Category, Customer, Payment, Product, Sale, ServiceTicket, StockMovement,
} from "./types";

export const seedBusiness: Business = {
  name: "Mon Commerce",
  owner: "Gérant",
  legalForm: "Entreprise Individuelle",
  address: "Dakar, Sénégal",
  phone: "+221 77 000 00 00",
  email: "",
  ninea: "",
  rccm: "",
  taxRegime: "exempte",
  bankName: "",
  bankIban: "",
  defaultDueDays: 30,
  invoicePrefix: "FAC",
  paymentTerms: "Paiement à la livraison. Le solde restant est exigible sous 30 jours.",
  footerMessage: "Merci pour votre confiance.",
  currency: "FCFA",
  notifications: true,
};

export const categories: Category[] = [
  { id: "c1", name: "Téléviseurs & Écrans" },
  { id: "c2", name: "Climatiseurs & Froid" },
  { id: "c3", name: "Réfrigérateurs" },
  { id: "c4", name: "Ventilateurs" },
  { id: "c5", name: "Électroménager" },
  { id: "c6", name: "Téléphones & Accessoires" },
  { id: "c7", name: "Services & Installations" },
];

export const seedProducts: Product[] = [];

export const seedCustomers: Customer[] = [
  { id: "walk-in", name: "Client de passage", phone: "", email: "", address: "", notes: "", createdAt: new Date().toISOString() },
];

export function buildSeed() {
  const products = seedProducts.map((p) => ({ ...p }));
  const customers = seedCustomers.map((c) => ({ ...c }));
  const sales: Sale[] = [];
  const payments: Payment[] = [];
  const movements: StockMovement[] = [];
  const tickets: ServiceTicket[] = [];

  return { products, customers, sales, payments, movements, tickets };
}
