import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";
import { useStore } from "./store";
import type {
  Product,
  Customer,
  Sale,
  SaleItem,
  Payment,
  StockMovement,
  ServiceTicket,
  Business,
} from "./types";
import { toast } from "sonner";

// Valide si une chaîne est un UUID v4 standard
export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

// Convertit un ID en UUID valide si nécessaire
export function ensureUUID(id?: string): string {
  if (id && isUUID(id)) return id;
  return crypto.randomUUID();
}

/**
 * Récupère ou initialise automatiquement le profil et la boutique cloud de l'utilisateur
 */
export async function getOrCreateTenant(userId: string, userMeta?: { full_name?: string; name?: string; business_name?: string; email?: string }) {
  if (!isSupabaseConfigured) return null;

  try {
    // 1. Chercher le profil existant
    const { data: profile, error: profErr } = await supabase
      .from("user_profiles")
      .select("id, business_id, full_name, role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.business_id) {
      return {
        businessId: profile.business_id as string,
        role: profile.role as string,
        fullName: profile.full_name as string,
      };
    }

    if (profErr) {
      console.warn("Erreur recherche profil:", profErr.message);
    }

    // 2. Si le profil n'existe pas encore (ex: inscription Google avant trigger), on le crée
    const bizName = userMeta?.business_name || "Ma Boutique";
    const ownerName = userMeta?.full_name || userMeta?.name || "Gérant";
    const email = userMeta?.email || "";

    const { data: newBiz, error: bizErr } = await supabase
      .from("businesses")
      .insert({
        name: bizName,
        owner: ownerName,
        email: email,
      })
      .select("id")
      .single();

    if (bizErr || !newBiz) {
      console.error("Échec création boutique:", bizErr);
      return null;
    }

    const { error: insertProfErr } = await supabase
      .from("user_profiles")
      .insert({
        id: userId,
        business_id: newBiz.id,
        full_name: ownerName,
        role: "gerant",
      });

    if (insertProfErr) {
      console.error("Échec création profil:", insertProfErr);
    }

    return {
      businessId: newBiz.id as string,
      role: "gerant",
      fullName: ownerName,
    };
  } catch (e) {
    console.error("Erreur getOrCreateTenant:", e);
    return null;
  }
}

/**
 * Télécharge l'ensemble des données de la boutique depuis Supabase pour mettre à jour le store
 */
export async function pullCloudData(businessId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !businessId) return false;

  try {
    // 1. Boutique
    const { data: bizData } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();

    if (bizData) {
      useStore.getState().updateBusiness({
        name: bizData.name,
        owner: bizData.owner,
        phone: bizData.phone || "",
        email: bizData.email || "",
        address: bizData.address || "",
        ninea: bizData.ninea || "",
        rccm: bizData.rccm || "",
        legalForm: bizData.legal_form,
        taxRegime: bizData.tax_regime,
        bankName: bizData.bank_name,
        bankIban: bizData.bank_iban,
        invoicePrefix: bizData.invoice_prefix || "FAC",
        paymentTerms: bizData.payment_terms || "",
        footerMessage: bizData.footer_message || "",
        logoDataUrl: bizData.logo_url,
      });
    }

    // 2. Produits
    const { data: prodData } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", businessId);

    if (prodData && prodData.length > 0) {
      const mappedProds: Product[] = prodData.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference || "",
        categoryId: p.category_id || "",
        brand: p.brand || "",
        serialNumber: p.serial_number || undefined,
        purchasePrice: Number(p.purchase_price) || 0,
        salePrice: Number(p.sale_price) || 0,
        stock: Number(p.stock) || 0,
        alertThreshold: Number(p.alert_threshold) || 5,
        warrantyMonths: Number(p.warranty_months) || 0,
        description: p.description || "",
        image: p.image || "📦",
        isService: Boolean(p.is_service),
      }));

      useStore.setState({ products: mappedProds });
    }

    // 3. Clients
    const { data: custData } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", businessId);

    if (custData && custData.length > 0) {
      const mappedCusts: Customer[] = custData.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        notes: c.notes || "",
        createdAt: c.created_at,
      }));

      useStore.setState({ customers: mappedCusts });
    }

    // 4. Ventes et Lignes d'articles
    const { data: salesData } = await supabase
      .from("sales")
      .select(`
        id,
        invoice_number,
        customer_id,
        discount,
        date,
        due_date,
        doc_type,
        method,
        notes,
        sale_items (
          id,
          product_id,
          name,
          quantity,
          unit_price,
          discount,
          serial_number,
          warranty_months
        )
      `)
      .eq("business_id", businessId)
      .order("date", { ascending: false });

    if (salesData && salesData.length > 0) {
      const mappedSales: Sale[] = salesData.map((s) => ({
        id: s.id,
        invoiceNumber: s.invoice_number,
        customerId: s.customer_id || "",
        discount: Number(s.discount) || 0,
        date: s.date,
        dueDate: s.due_date || undefined,
        docType: s.doc_type as Sale["docType"],
        method: s.method as Sale["method"],
        notes: s.notes || undefined,
        items: ((s.sale_items as any[]) || []).map((item) => ({
          id: item.id,
          productId: item.product_id,
          name: item.name,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unit_price) || 0,
          discount: Number(item.discount) || 0,
          serialNumber: item.serial_number || undefined,
          warrantyMonths: Number(item.warranty_months) || 0,
        })),
      }));

      useStore.setState({ sales: mappedSales });
    }

    // 5. Paiements
    const { data: payData } = await supabase
      .from("payments")
      .select("*")
      .eq("business_id", businessId);

    if (payData && payData.length > 0) {
      const mappedPayments: Payment[] = payData.map((p) => ({
        id: p.id,
        saleId: p.sale_id,
        amount: Number(p.amount) || 0,
        method: p.method as Payment["method"],
        date: p.date,
        note: p.note || undefined,
      }));

      useStore.setState({ payments: mappedPayments });
    }

    // 6. Mouvements de stock
    const { data: movData } = await supabase
      .from("stock_movements")
      .select("*")
      .eq("business_id", businessId)
      .order("date", { ascending: false })
      .limit(100);

    if (movData && movData.length > 0) {
      const mappedMovs: StockMovement[] = movData.map((m) => ({
        id: m.id,
        productId: m.product_id,
        type: m.type as StockMovement["type"],
        quantity: Number(m.quantity) || 0,
        date: m.date,
        reason: m.reason || "",
      }));

      useStore.setState({ movements: mappedMovs });
    }

    return true;
  } catch (err) {
    console.error("Erreur pullCloudData:", err);
    return false;
  }
}

/**
 * Envoie un produit vers Supabase
 */
export async function pushProductToCloud(product: Product, businessId: string) {
  if (!isSupabaseConfigured || !businessId) return;

  const validId = ensureUUID(product.id);

  try {
    const { error } = await supabase.from("products").upsert({
      id: validId,
      business_id: businessId,
      name: product.name,
      reference: product.reference || null,
      brand: product.brand || null,
      serial_number: product.serialNumber || null,
      purchase_price: product.purchasePrice,
      sale_price: product.salePrice,
      stock: product.stock,
      alert_threshold: product.alertThreshold,
      warranty_months: product.warrantyMonths,
      description: product.description || null,
      image: product.image || "📦",
      is_service: Boolean(product.isService),
      updated_at: new Date().toISOString(),
    });

    if (error) console.error("Erreur pushProductToCloud:", error.message);
  } catch (e) {
    console.error("Erreur pushProductToCloud:", e);
  }
}

/**
 * Supprime un produit sur Supabase
 */
export async function deleteProductFromCloud(productId: string) {
  if (!isSupabaseConfigured) return;
  if (!isUUID(productId)) return;

  try {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) console.error("Erreur deleteProductFromCloud:", error.message);
  } catch (e) {
    console.error("Erreur deleteProductFromCloud:", e);
  }
}

/**
 * Envoie un client vers Supabase
 */
export async function pushCustomerToCloud(customer: Customer, businessId: string) {
  if (!isSupabaseConfigured || !businessId) return;

  const validId = ensureUUID(customer.id);

  try {
    const { error } = await supabase.from("customers").upsert({
      id: validId,
      business_id: businessId,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      address: customer.address || null,
      notes: customer.notes || null,
      updated_at: new Date().toISOString(),
    });

    if (error) console.error("Erreur pushCustomerToCloud:", error.message);
  } catch (e) {
    console.error("Erreur pushCustomerToCloud:", e);
  }
}

/**
 * Envoie une vente complète avec ses lignes, paiements et impact de stock
 */
export async function pushSaleToCloud(
  sale: Sale,
  paidAmount: number,
  businessId: string,
  userId?: string
) {
  if (!isSupabaseConfigured || !businessId) return;

  const validSaleId = ensureUUID(sale.id);

  try {
    // 1. Client ID : vérifier si UUID valide, sinon NULL pour le comptoir
    const validCustId = sale.customerId && isUUID(sale.customerId) ? sale.customerId : null;

    // 2. Insérer la vente
    const { error: saleErr } = await supabase.from("sales").insert({
      id: validSaleId,
      business_id: businessId,
      created_by: userId && isUUID(userId) ? userId : null,
      invoice_number: sale.invoiceNumber,
      customer_id: validCustId,
      discount: sale.discount || 0,
      date: sale.date,
      due_date: sale.dueDate || null,
      doc_type: sale.docType || "facture",
      method: sale.method,
      notes: sale.notes || null,
    });

    if (saleErr) {
      console.error("Erreur pushSaleToCloud:", saleErr.message);
      return;
    }

    // 3. Insérer les lignes de vente
    if (sale.items.length > 0) {
      const itemsToInsert = sale.items.map((item) => ({
        id: ensureUUID(item.id),
        sale_id: validSaleId,
        product_id: item.productId && isUUID(item.productId) ? item.productId : null,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount: item.discount || 0,
        serial_number: item.serialNumber || null,
        warranty_months: item.warrantyMonths || 0,
      }));

      const { error: itemsErr } = await supabase.from("sale_items").insert(itemsToInsert);
      if (itemsErr) console.error("Erreur sale_items insert:", itemsErr.message);
    }

    // 4. Insérer le paiement initial si versé
    if (paidAmount > 0) {
      const { error: payErr } = await supabase.from("payments").insert({
        id: ensureUUID(),
        business_id: businessId,
        sale_id: validSaleId,
        amount: paidAmount,
        method: sale.method,
        date: sale.date,
        note: "Paiement initial à la vente",
      });

      if (payErr) console.error("Erreur payments insert:", payErr.message);
    }

    // 5. Mettre à jour les stocks dans Supabase si ce n'est pas un devis proforma
    if (sale.docType !== "proforma") {
      for (const item of sale.items) {
        if (item.productId && isUUID(item.productId)) {
          // Décrémenter le stock dans Supabase
          const { data: prod } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.productId)
            .maybeSingle();

          if (prod) {
            const newStock = Math.max(0, Number(prod.stock) - item.quantity);
            await supabase
              .from("products")
              .update({ stock: newStock })
              .eq("id", item.productId);

            // Enregistrer le mouvement
            await supabase.from("stock_movements").insert({
              id: ensureUUID(),
              business_id: businessId,
              product_id: item.productId,
              type: "sortie",
              quantity: -item.quantity,
              reason: `Vente N° ${sale.invoiceNumber}`,
              date: sale.date,
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Erreur globale pushSaleToCloud:", e);
  }
}

/**
 * Hook React pour activer la synchronisation automatique en temps réel (Cloud Sync)
 */
export function useCloudSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let activeChannel: any = null;

    async function initSync() {
      setSyncing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSyncing(false);
        return;
      }

      const tenant = await getOrCreateTenant(user.id, {
        email: user.email,
        full_name: user.user_metadata?.["full_name"] || user.user_metadata?.["name"],
        business_name: user.user_metadata?.["business_name"],
      });

      if (!tenant) {
        setSyncing(false);
        return;
      }

      setBusinessId(tenant.businessId);

      // 1. Initial pull
      const ok = await pullCloudData(tenant.businessId);
      if (ok) setLastSync(new Date());
      setSyncing(false);

      // 2. Abonnement Realtime aux modifications venant d'autres appareils
      activeChannel = supabase
        .channel(`biz-changes-${tenant.businessId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "products", filter: `business_id=eq.${tenant.businessId}` },
          () => {
            void pullCloudData(tenant.businessId);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sales", filter: `business_id=eq.${tenant.businessId}` },
          () => {
            void pullCloudData(tenant.businessId);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payments", filter: `business_id=eq.${tenant.businessId}` },
          () => {
            void pullCloudData(tenant.businessId);
          }
        )
        .subscribe();
    }

    void initSync();

    return () => {
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
      }
    };
  }, [isOnline]);

  return {
    syncing,
    lastSync,
    isOnline,
    businessId,
    refresh: async () => {
      if (businessId) {
        setSyncing(true);
        await pullCloudData(businessId);
        setLastSync(new Date());
        setSyncing(false);
      }
    },
  };
}
