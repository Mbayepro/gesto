import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  Home, ShoppingCart, FileText, Package, Users, Wallet, Wrench, BarChart3, Settings, Plus, Menu, Boxes, Bell, LogIn, LogOut, Cloud, RefreshCw,
} from "lucide-react";
import { Logo, LogoMark } from "./Logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAuth, signOut } from "@/lib/auth";
import { useCloudSync } from "@/lib/sync";
import { InstallPwaButton } from "./InstallPwaPrompt";

const NAV = [
  { to: "/", label: "Tableau de bord", icon: Home },
  { to: "/ventes", label: "Ventes", icon: ShoppingCart },
  { to: "/factures", label: "Factures", icon: FileText },
  { to: "/produits", label: "Produits", icon: Package },
  { to: "/stock", label: "Stock", icon: Boxes },
  { to: "/clients", label: "Clients", icon: Users },
  { to: "/paiements", label: "Paiements", icon: Wallet },
  { to: "/sav", label: "SAV & Garanties", icon: Wrench },
  { to: "/rapports", label: "Rapports", icon: BarChart3 },
  { to: "/parametres", label: "Paramètres", icon: Settings },
] as const;

const MORE = NAV.filter((n) => ["/stock", "/clients", "/paiements", "/sav", "/rapports", "/parametres"].includes(n.to));

function isActive(path: string, to: string) {
  return to === "/" ? path === "/" : path === to || path.startsWith(to + "/");
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [more, setMore] = useState(false);
  const low = useStore((s) => s.products.filter((p) => !p.isService && p.stock <= p.alertThreshold).length);
  const business = useStore((s) => s.business);
  const setCurrentBusinessId = useStore((s) => s.setCurrentBusinessId);
  const { profile, business: authBiz, isAuthenticated, loading: authLoading } = useAuth();
  const { syncing, isOnline, businessId } = useCloudSync();

  useEffect(() => {
    setCurrentBusinessId(businessId);
  }, [businessId, setCurrentBusinessId]);

  const isAuthPage = path === "/auth" || path.startsWith("/auth");

  // Redirection automatique vers /auth si non connecté et non invité
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !isAuthPage) {
      const isGuest = typeof window !== "undefined" && localStorage.getItem("gesto_guest_mode") === "true";
      if (!isGuest) {
        void navigate({ to: "/auth" });
      }
    }
  }, [authLoading, isAuthenticated, isAuthPage, navigate]);

  // Les pages d'authentification s'affichent en plein écran sans le menu habituel
  if (isAuthPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  // Écran d'attente fluide pendant la redirection si non connecté
  const isGuest = typeof window !== "undefined" && localStorage.getItem("gesto_guest_mode") === "true";
  if (!isAuthenticated && !isGuest) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="size-8 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-xs text-muted-foreground font-medium">Chargement de votre session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar px-4 py-5 lg:flex">
        <Logo light />
        <Link to="/ventes/nouvelle" className="mt-6 flex h-11 items-center justify-center gap-2 rounded-lg bg-accent font-semibold text-accent-foreground shadow-sm transition hover:brightness-105">
          <Plus className="size-5" /> Nouvelle vente
        </Link>
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition", isActive(path, to) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground")}>
              <Icon className="size-[18px]" /> {label}
              {to === "/stock" && low > 0 && <span className="ml-auto rounded-full bg-accent px-2 text-xs font-bold text-accent-foreground">{low}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-sidebar-accent/60 p-2.5">
          <Link to={isAuthenticated ? "/parametres" : "/auth"} className="flex min-w-0 items-center gap-2.5 hover:opacity-90 transition">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground text-xs">
              {(profile?.full_name?.[0] || business.owner?.[0] || business.name?.[0] || "M").toUpperCase()}
            </div>
            <div className="min-w-0 text-xs">
              <div className="truncate font-semibold text-sidebar-accent-foreground">
                {profile?.full_name || business.owner || (isAuthenticated ? "Utilisateur" : "Gérant")}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-sidebar-foreground/70 truncate">
                {isAuthenticated ? (
                  <span className="text-emerald-400 font-medium truncate">{authBiz?.name || business.name}</span>
                ) : (
                  <span className="truncate">{business.name || "Mode Local"}</span>
                )}
              </div>
            </div>
          </Link>
          {isAuthenticated ? (
            <button
              onClick={() => void signOut()}
              title="Se déconnecter"
              className="grid size-8 shrink-0 place-items-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive transition"
            >
              <LogOut className="size-4" />
            </button>
          ) : (
            <Link
              to="/auth"
              title="Connexion Cloud"
              className="grid size-8 shrink-0 place-items-center rounded-md bg-accent/20 text-accent hover:bg-accent hover:text-accent-foreground transition"
            >
              <LogIn className="size-4" />
            </Link>
          )}
        </div>

        {/* Statut Synchronisation Cloud Supabase & Installation PWA */}
        <div className="mt-2.5 space-y-2 border-t border-sidebar-accent/40 pt-2 px-1">
          <div className="flex items-center justify-between text-[11px] text-sidebar-foreground/70">
            <div className="flex items-center gap-1.5">
              <span className={cn("size-2 rounded-full shrink-0", syncing ? "bg-amber-400 animate-pulse" : businessId ? "bg-emerald-400" : "bg-slate-400")} />
              <span className="truncate">{syncing ? "Synchronisation..." : businessId ? "Cloud synchronisé" : "Mode local"}</span>
            </div>
            {!isOnline && <span className="text-[10px] text-amber-400 font-bold shrink-0">Hors-ligne</span>}
          </div>
          <InstallPwaButton className="w-full justify-center bg-sidebar-accent/40 text-sidebar-accent-foreground hover:bg-sidebar-accent text-[11px] py-1.5" />
        </div>
      </aside>

      {/* Mobile header */}
      <header className="no-print sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <Link to="/" className="flex items-center gap-2"><LogoMark className="size-8" /><span className="font-display text-lg font-extrabold text-primary">GESTO</span></Link>
        <div className="flex items-center gap-1">
          <Link to="/stock" className="relative grid size-10 place-items-center rounded-full hover:bg-muted" aria-label="Alertes stock">
            <Bell className="size-5 text-foreground" />
            {low > 0 && <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-warning text-[10px] font-bold text-warning-foreground">{low}</span>}
          </Link>
          <Link to="/auth" className="grid size-10 place-items-center rounded-full hover:bg-muted" aria-label="Compte">
            {isAuthenticated ? (
              <span className="grid size-7 place-items-center rounded-full bg-accent text-accent-foreground font-bold text-xs">
                {(profile?.full_name?.[0] || "U").toUpperCase()}
              </span>
            ) : (
              <LogIn className="size-5 text-foreground" />
            )}
          </Link>
        </div>
      </header>

      <main className="px-4 pb-28 pt-5 lg:ml-64 lg:px-8 lg:pb-10 lg:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid h-16 grid-cols-5 items-center">
          <BottomLink to="/" label="Accueil" icon={Home} active={path === "/"} />
          <BottomLink to="/ventes" label="Ventes" icon={ShoppingCart} active={isActive(path, "/ventes") && path !== "/ventes/nouvelle"} />
          <Link to="/ventes/nouvelle" className="-mt-7 flex flex-col items-center" aria-label="Nouvelle vente">
            <span className="grid size-14 place-items-center rounded-full bg-accent text-accent-foreground shadow-lg ring-4 ring-background"><Plus className="size-7" /></span>
            <span className="mt-0.5 text-[10px] font-semibold text-foreground">Vendre</span>
          </Link>
          <BottomLink to="/produits" label="Produits" icon={Package} active={isActive(path, "/produits")} />
          <button onClick={() => setMore(true)} className={cn("flex flex-col items-center gap-0.5 text-[11px] font-medium", MORE.some((m) => isActive(path, m.to)) || isActive(path, "/factures") ? "text-primary" : "text-muted-foreground")}>
            <Menu className="size-5" /> Plus
          </button>
        </div>
      </nav>

      <Sheet open={more} onOpenChange={setMore}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
          <div className="grid grid-cols-3 gap-3 p-4 pt-0">
            {[NAV[2], ...MORE].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} onClick={() => setMore(false)} className={cn("flex flex-col items-center gap-2 rounded-xl border p-3 text-center text-xs font-medium", isActive(path, to) ? "border-primary bg-secondary text-primary" : "text-foreground")}>
                <Icon className="size-5" /> {label}
              </Link>
            ))}
          </div>
          <div className="border-t px-4 pb-4 pt-2">
            <InstallPwaButton className="w-full justify-center" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function BottomLink({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof Home; active: boolean }) {
  return (
    <Link to={to} className={cn("flex flex-col items-center gap-0.5 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
      <Icon className="size-5" /> {label}
    </Link>
  );
}
