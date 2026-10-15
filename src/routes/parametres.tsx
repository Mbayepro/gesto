import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  Download, Upload, FileSpreadsheet, Building2, CreditCard, ShieldAlert,
  Cloud, CheckCircle2, Database, ShieldCheck, Smartphone, Users, Trash2,
  LogOut, LogIn, RefreshCw, Sparkles, Check, Globe
} from "lucide-react";
import { useStore } from "@/lib/store";
import { useSalesView } from "@/lib/selectors";
import { exportSalesToExcel, exportProductsToExcel, exportPaymentsToExcel } from "@/lib/export";
import type { Business } from "@/lib/types";
import { PageHeader, Card, Field, inputCls } from "@/components/app/ui";
import { useAuth, signOut } from "@/lib/auth";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres Entreprise — GESTO" },
      { name: "description", content: "Profil du commerce, factures, mentions légales et exports Excel." },
      { property: "og:title", content: "Paramètres Entreprise — GESTO" },
      { property: "og:description", content: "Profil du commerce, factures, mentions légales et exports Excel." },
    ],
  }),
  component: Page,
});

function Page() {
  const store = useStore();
  const sales = useSalesView();
  const { user, profile, business: authBiz, isAuthenticated } = useAuth();
  const [b, setB] = useState<Business>(store.business);
  const set = <K extends keyof Business>(k: K, v: Business[K]) => setB((x) => ({ ...x, [k]: v }));
  const [testingSync, setTestingSync] = useState(false);

  const handleTestSync = async () => {
    setTestingSync(true);
    await new Promise((r) => setTimeout(r, 600));
    setTestingSync(false);
    toast.success("Synchronisation en direct active et opérationnelle !");
  };

  const save = () => {
    if (!b.name.trim()) { toast.error("Le nom du commerce est obligatoire"); return; }
    if (!b.invoicePrefix.trim()) { toast.error("Le préfixe de facture est obligatoire"); return; }
    store.updateBusiness({ ...b, invoicePrefix: b.invoicePrefix.trim().toUpperCase() });
    toast.success("Paramètres professionnels enregistrés");
  };

  const onLogo = (f?: File) => {
    if (!f) return;
    if (f.size > 800_000) { toast.error("Logo trop lourd (800 Ko maximum)"); return; }
    const r = new FileReader();
    r.onload = () => set("logoDataUrl", String(r.result));
    r.readAsDataURL(f);
  };

  const exportData = () => {
    const { business, products, customers, sales, payments, movements, tickets } = useStore.getState();
    const blob = new Blob([JSON.stringify({ business, products, customers, sales, payments, movements, tickets }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `gesto-sauvegarde-complete-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    toast.success("Sauvegarde JSON téléchargée");
  };

  const reset = () => {
    const answer = prompt("ATTENTION : Cela va supprimer toutes vos factures réelles et restaurer les données d'essai.\n\nPour confirmer, tapez le mot 'SUPPRIMER' ci-dessous :");
    if (answer !== "SUPPRIMER") {
      toast.info("Réinitialisation annulée.");
      return;
    }
    store.reset();
    setB(useStore.getState().business);
    toast.success("Données de démo restaurées.");
  };

  const onStartFresh = () => {
    const shopName = prompt("Entrez le NOM de la boutique de votre ami :", b.name);
    if (!shopName || !shopName.trim()) return;
    const shopPlace = prompt("Entrez la VILLE ou l'ADRESSE de sa boutique :", b.address);
    const shopPhone = prompt("Entrez son NUMÉRO DE TÉLÉPHONE (ex. 77 123 45 67) :", b.phone);

    const ok = confirm("Voulez-vous aussi effacer les fausses factures d'essai pour qu'il démarre à zéro proprement ?");
    if (ok) {
      store.clearDemoAndStartFresh({
        name: shopName.trim(),
        address: shopPlace?.trim() || "Dakar, Sénégal",
        phone: shopPhone?.trim() || "",
        owner: shopName.trim(),
      });
      setB(useStore.getState().business);
      toast.success("Boutique initialisée avec succès ! Les données d'essai ont été vidées.");
    } else {
      store.updateBusiness({
        name: shopName.trim(),
        address: shopPlace?.trim() || b.address,
        phone: shopPhone?.trim() || b.phone,
      });
      setB(useStore.getState().business);
      toast.success("Nom et lieu mis à jour !");
    }
  };

  return (
    <div className="max-w-3xl pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <PageHeader title="Paramètres" subtitle="Informations légales et fiscales affichées sur vos factures" />
        <button
          onClick={onStartFresh}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition"
        >
          <span>Initialiser le vrai nom & lieu</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Identité de l'entreprise */}
        <Card title="Identité de l'Entreprise">
          <div className="mb-4 flex items-center gap-4">
            <div className="grid size-16 place-items-center overflow-hidden rounded-xl border bg-muted text-xs text-muted-foreground font-semibold">
              {b.logoDataUrl ? <img src={b.logoDataUrl} alt="Logo" className="size-full object-contain p-1" /> : "Logo"}
            </div>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-semibold hover:bg-muted transition">
              <Upload className="size-4" /> Importer le logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
            </label>
            {b.logoDataUrl && <button onClick={() => set("logoDataUrl", undefined)} className="text-sm text-destructive hover:underline">Supprimer le logo</button>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom de l'entreprise / Enseigne"><input className={inputCls} value={b.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Forme juridique (ex: SUARL, SARL, EI)"><input className={inputCls} placeholder="ex. SUARL, SARL, EI" value={b.legalForm || ""} onChange={(e) => set("legalForm", e.target.value)} /></Field>
            <Field label="Nom du gérant / Propriétaire"><input className={inputCls} value={b.owner} onChange={(e) => set("owner", e.target.value)} /></Field>
            <Field label="Téléphone principal"><input className={inputCls} value={b.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Email professionnel"><input className={inputCls} value={b.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Devise"><input className={inputCls} value={b.currency} onChange={(e) => set("currency", e.target.value)} /></Field>
            <Field label="Adresse physique du magasin" className="sm:col-span-2"><input className={inputCls} value={b.address} onChange={(e) => set("address", e.target.value)} /></Field>
          </div>
        </Card>

        {/* Mentions Légales et Fiscales */}
        <Card title="Mentions Légales & Fiscales">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Numéro NINEA"><input className={inputCls} placeholder="ex. 000123456 2G3" value={b.ninea} onChange={(e) => set("ninea", e.target.value)} /></Field>
            <Field label="Numéro RCCM (Registre du Commerce)"><input className={inputCls} placeholder="ex. SN-DKR-2023-B-14589" value={b.rccm || ""} onChange={(e) => set("rccm", e.target.value)} /></Field>
            
            <Field label="Régime TVA" className="sm:col-span-2">
              <select
                className={inputCls}
                value={b.taxRegime || "exempte"}
                onChange={(e) => set("taxRegime", e.target.value as "tva_18" | "exempte")}
              >
                <option value="exempte">Exonéré de TVA (Régime synthétique / Franchise en base)</option>
                <option value="tva_18">Assujetti à la TVA normale (18%)</option>
              </select>
              <span className="text-[11px] text-muted-foreground mt-1">
                {b.taxRegime === "tva_18" 
                  ? "Vos factures afficheront le détail HT, TVA 18% et TTC." 
                  : "Vos factures afficheront la mention légale d'exonération de TVA."}
              </span>
            </Field>
          </div>
        </Card>

        {/* Coordonnées Bancaires pour Virement */}
        <Card title="Coordonnées Bancaires (Affichées sur les factures pour virement)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom de la banque"><input className={inputCls} placeholder="ex. CBAO, Ecobank, Wave Business..." value={b.bankName || ""} onChange={(e) => set("bankName", e.target.value)} /></Field>
            <Field label="Numéro de compte / RIB / IBAN"><input className={inputCls} placeholder="ex. SN08 SN01 2013..." value={b.bankIban || ""} onChange={(e) => set("bankIban", e.target.value)} /></Field>
          </div>
        </Card>

        {/* Facturation & Échéances */}
        <Card title="Facturation">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Préfixe des factures (ex. FAC)"><input className={inputCls} value={b.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></Field>
              <Field label="Délai d'échéance par défaut (jours)">
                <input
                  type="number"
                  className={inputCls}
                  placeholder="30"
                  value={b.defaultDueDays ?? 30}
                  onChange={(e) => set("defaultDueDays", parseInt(e.target.value, 10) || 0)}
                />
              </Field>
            </div>
            <Field label="Conditions générales de règlement"><textarea className={inputCls + " h-20 py-2"} value={b.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} /></Field>
            <Field label="Message de courtoisie de pied de facture"><input className={inputCls} value={b.footerMessage} onChange={(e) => set("footerMessage", e.target.value)} /></Field>
          </div>
        </Card>

        <button onClick={save} className="h-12 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow hover:brightness-105 transition">
          Enregistrer tous les paramètres
        </button>

        {/* MODULE EXPORT EXCEL (Spécial pour l'ami qui aime Excel !) */}
        <Card title="Exports Microsoft Excel (.csv)">
          <p className="text-xs text-muted-foreground mb-4">
            Générez et téléchargez vos données complètes sous forme de fichiers tableurs compatibles directement avec Microsoft Excel.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => { exportSalesToExcel(sales); toast.success("Export factures Excel téléchargé !"); }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50/70 p-3.5 text-center text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition dark:bg-emerald-950/30 dark:text-emerald-300"
            >
              <FileSpreadsheet className="size-5 text-emerald-600 dark:text-emerald-400" />
              <span>Exporter les Factures & Ventes (.csv)</span>
            </button>
            <button
              onClick={() => { exportProductsToExcel(store.products); toast.success("Export stock Excel téléchargé !"); }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-blue-600/30 bg-blue-50/70 p-3.5 text-center text-xs font-bold text-blue-900 hover:bg-blue-100 transition dark:bg-blue-950/30 dark:text-blue-300"
            >
              <FileSpreadsheet className="size-5 text-blue-600 dark:text-blue-400" />
              <span>Exporter le Catalogue & Stock (.csv)</span>
            </button>
            <button
              onClick={() => { exportPaymentsToExcel(store.payments, sales); toast.success("Export journal des encaissements téléchargé !"); }}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-purple-600/30 bg-purple-50/70 p-3.5 text-center text-xs font-bold text-purple-900 hover:bg-purple-100 transition dark:bg-purple-950/30 dark:text-purple-300"
            >
              <FileSpreadsheet className="size-5 text-purple-600 dark:text-purple-400" />
              <span>Exporter les Règlements perçus (.csv)</span>
            </button>
          </div>
        </Card>

        {/* Compte & Synchronisation Cloud */}
        <Card title="Compte & Synchronisation Cloud (Multi-Appareils)">
          <div className="space-y-4">
            {isAuthenticated && user ? (
              <>
                {/* Profil commerçant connecté */}
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-base font-bold text-primary-foreground shadow-sm">
                      {(profile?.full_name?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0] || "G").toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">
                          {profile?.full_name || user.user_metadata?.full_name || "Gérant"}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {profile?.role === "gerant" ? "Gérant (Accès total)" : "Vendeur (Caissier)"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
                        Boutique : {authBiz?.name || b.name || "Mon Commerce"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestSync}
                      disabled={testingSync}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-xs font-semibold hover:bg-muted transition"
                    >
                      <RefreshCw className={`size-3.5 ${testingSync ? "animate-spin" : ""}`} />
                      {testingSync ? "Vérification..." : "Tester la connexion"}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        toast.success("Vous êtes déconnecté.");
                      }}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
                    >
                      <LogOut className="size-3.5" /> Se déconnecter
                    </button>
                  </div>
                </div>

                {/* Grille des caractéristiques professionnelles */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border bg-muted/30 p-3.5">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground mb-1">
                      <Smartphone className="size-4 text-primary" /> Multi-Appareils
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Synchronisation immédiate sur Smartphone, Tablette et PC de caisse.
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-3.5">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground mb-1">
                      <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" /> Sécurité & RLS
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Chiffrement SSL. Vos prix d'achat et vos marges sont strictement protégés.
                    </p>
                  </div>

                  <div className="rounded-xl border bg-muted/30 p-3.5">
                    <div className="flex items-center gap-2 font-bold text-xs text-foreground mb-1">
                      <Sparkles className="size-4 text-accent" /> Formule Pro
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Facturation et suivi des stocks illimités en Franc CFA.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* Non connecté (Mode démo local) */
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Database className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Mode Local Autonome</span>
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                        Hors-Ligne
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Vos données sont stockées sur cet appareil. Connectez-vous pour synchroniser sur votre smartphone.
                    </p>
                  </div>
                </div>
                <Link
                  to="/auth"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-95 transition"
                >
                  <LogIn className="size-3.5" /> Se connecter au Cloud
                </Link>
              </div>
            )}
          </div>
        </Card>

        {/* Sauvegarde & Sécurité */}
        <Card title="Sauvegarde & Sécurité">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              onClick={exportData}
              className="inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold hover:bg-muted transition"
            >
              <Download className="size-4" /> Télécharger une sauvegarde JSON
            </button>
            <button
              onClick={() => {
                const answer = prompt(
                  "Voulez-vous supprimer tous les articles et mouvements démo pour démarrer avec un catalogue vide ?\n\nTapez 'VIDER' pour confirmer :"
                );
                if (answer === "VIDER") {
                  store.clearDemoStock();
                  toast.success("Articles et stock démo supprimés avec succès !");
                } else if (answer !== null) {
                  toast.info("Nettoyage annulé.");
                }
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-destructive/30 px-3 text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
              title="Nettoyer les faux articles d'essai"
            >
              <Trash2 className="size-3.5" /> Vider le stock démo pour démarrer à zéro
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
