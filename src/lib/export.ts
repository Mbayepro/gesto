import type { SaleView } from "./selectors";
import type { Product, Customer, Payment, Business } from "./types";
import { fullDate, METHOD_LABEL } from "./format";

/**
 * Télécharge une chaîne de caractères en tant que fichier CSV compatible Excel.
 * Inclut le BOM UTF-8 (\uFEFF) pour qu'Excel ouvre le fichier avec les accents intacts.
 */
function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Exporte toutes les factures et proformas pour Excel.
 */
export function exportSalesToExcel(sales: SaleView[]) {
  const headers = [
    "Type",
    "N° Facture",
    "Date d'émission",
    "Date d'échéance",
    "Client",
    "Téléphone",
    "Montant Total (FCFA)",
    "Montant Payé (FCFA)",
    "Reste à Payer (FCFA)",
    "Statut",
    "Mode de Paiement Principal",
    "Nombre d'Articles",
  ];

  const rows = sales.map((s) => {
    const isProforma = s.docType === "proforma";
    const statusLabel = isProforma
      ? "Proforma / Devis"
      : s.status === "payee"
      ? "Payée"
      : s.status === "partielle"
      ? "Partiellement payée"
      : "Impayée";

    return [
      escapeCsv(isProforma ? "Devis / Proforma" : "Facture"),
      escapeCsv(s.invoiceNumber),
      escapeCsv(fullDate(s.date)),
      escapeCsv(s.dueDate ? fullDate(s.dueDate) : "—"),
      escapeCsv(s.customer?.name || "Client de passage"),
      escapeCsv(s.customer?.phone || "—"),
      escapeCsv(s.total),
      escapeCsv(s.paid),
      escapeCsv(s.remaining),
      escapeCsv(statusLabel),
      escapeCsv(METHOD_LABEL[s.method] || s.method),
      escapeCsv(s.items.reduce((sum, item) => sum + item.quantity, 0)),
    ].join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `gesto-factures-${today}.csv`);
}

/**
 * Exporte le catalogue des produits et stocks pour Excel.
 */
export function exportProductsToExcel(products: Product[]) {
  const headers = [
    "Référence",
    "Désignation",
    "Marque",
    "Prix d'Achat (FCFA)",
    "Prix de Vente (FCFA)",
    "Marge Unitaire (FCFA)",
    "Stock Actuel",
    "Seuil d'Alerte",
    "Valeur Stock Achat (FCFA)",
    "Valeur Stock Vente (FCFA)",
  ];

  const rows = products.map((p) => {
    const marge = p.salePrice - p.purchasePrice;
    const valeurAchat = p.stock * p.purchasePrice;
    const valeurVente = p.stock * p.salePrice;

    return [
      escapeCsv(p.reference),
      escapeCsv(p.name),
      escapeCsv(p.brand),
      escapeCsv(p.purchasePrice),
      escapeCsv(p.salePrice),
      escapeCsv(marge),
      escapeCsv(p.stock),
      escapeCsv(p.alertThreshold),
      escapeCsv(valeurAchat),
      escapeCsv(valeurVente),
    ].join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `gesto-stock-produits-${today}.csv`);
}

/**
 * Exporte le journal des paiements encaissés pour Excel.
 */
export function exportPaymentsToExcel(payments: Payment[], sales: SaleView[]) {
  const headers = [
    "Date",
    "N° Facture Associée",
    "Client",
    "Montant Encaissé (FCFA)",
    "Moyen de Paiement",
    "Note",
  ];

  const rows = payments.map((p) => {
    const sale = sales.find((s) => s.id === p.saleId);
    return [
      escapeCsv(fullDate(p.date)),
      escapeCsv(sale?.invoiceNumber || "—"),
      escapeCsv(sale?.customer?.name || "Client de passage"),
      escapeCsv(p.amount),
      escapeCsv(METHOD_LABEL[p.method] || p.method),
      escapeCsv(p.note || ""),
    ].join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `gesto-journal-encaissements-${today}.csv`);
}

/**
 * Exporte la fiche des clients avec leur CA et créances pour Excel.
 */
export function exportCustomersToExcel(customers: Customer[], sales: SaleView[]) {
  const headers = [
    "Nom",
    "Téléphone",
    "Email",
    "Adresse",
    "Date d'inscription",
    "Nb Factures",
    "CA Total (FCFA)",
    "Total Payé (FCFA)",
    "Créances (FCFA)",
    "Notes",
  ];

  const rows = customers.map((c) => {
    const custSales = sales.filter((s) => s.customerId === c.id);
    const ca = custSales.reduce((a, s) => a + s.total, 0);
    const paid = custSales.reduce((a, s) => a + s.paid, 0);
    return [
      escapeCsv(c.name),
      escapeCsv(c.phone),
      escapeCsv(c.email),
      escapeCsv(c.address),
      escapeCsv(fullDate(c.createdAt)),
      escapeCsv(custSales.length),
      escapeCsv(ca),
      escapeCsv(paid),
      escapeCsv(Math.max(0, ca - paid)),
      escapeCsv(c.notes),
    ].join(";");
  });

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `gesto-clients-${today}.csv`);
}

/**
 * Exporte les mouvements de stock (journal d'entrées/sorties) pour Excel.
 */
export function exportMovementsToExcel(
  movements: { date: string; productName: string; type: string; quantity: number; reason: string }[],
) {
  const typeLabels: Record<string, string> = {
    entree: "Entrée", sortie: "Sortie", retour: "Retour", ajustement: "Ajustement",
  };
  const headers = ["Date", "Produit", "Type", "Quantité", "Motif"];

  const rows = movements.map((m) => [
    escapeCsv(fullDate(m.date)),
    escapeCsv(m.productName),
    escapeCsv(typeLabels[m.type] || m.type),
    escapeCsv(m.quantity),
    escapeCsv(m.reason),
  ].join(";"));

  const csv = [headers.join(";"), ...rows].join("\r\n");
  const today = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `gesto-mouvements-stock-${today}.csv`);
}

/**
 * Export JSON complet pour sauvegarde et restauration.
 */
export function exportBackupJSON(data: {
  business: Business;
  products: Product[];
  customers: Customer[];
  sales: unknown[];
  payments: Payment[];
  movements: unknown[];
}) {
  const json = JSON.stringify({ ...data, exportedAt: new Date().toISOString(), version: "gesto-v1" }, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `gesto-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
