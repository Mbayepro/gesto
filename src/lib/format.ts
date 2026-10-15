import type { PaymentMethod, Sale, Payment, SaleStatus } from "./types";

export const fcfa = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} FCFA`;

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  especes: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  virement: "Virement",
  carte: "Carte",
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function relDate(iso: string) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export const fullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

export function saleSubtotal(s: Pick<Sale, "items">) {
  return s.items.reduce((a, i) => a + i.quantity * i.unitPrice, 0);
}
export function saleDiscount(s: Pick<Sale, "items" | "discount">) {
  return s.items.reduce((a, i) => a + i.discount, 0) + s.discount;
}
export function saleTotal(s: Pick<Sale, "items" | "discount">) {
  return Math.max(0, saleSubtotal(s) - saleDiscount(s));
}
export function salePaid(saleId: string, payments: Payment[]) {
  return payments.filter((p) => p.saleId === saleId).reduce((a, p) => a + p.amount, 0);
}
export function saleStatus(total: number, paid: number): SaleStatus {
  if (paid >= total) return "payee";
  if (paid > 0) return "partielle";
  return "impayee";
}

export function addMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export const uid = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
