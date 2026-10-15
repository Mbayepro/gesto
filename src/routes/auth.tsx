import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Mail, Lock, User, Building2, ArrowRight, CheckCircle2,
  AlertCircle, Loader2, Sparkles, LogOut, ArrowLeft, KeyRound
} from "lucide-react";
import { Logo } from "@/components/app/Logo";
import {
  useAuth,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  sendPasswordResetEmail,
  updatePassword,
  signOut,
} from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Authentification — GESTO Cloud" },
      { name: "description", content: "Connexion, inscription et gestion de votre compte boutique GESTO." },
      { property: "og:title", content: "Authentification — GESTO Cloud" },
      { property: "og:description", content: "Connexion, inscription et gestion de votre compte boutique GESTO." },
    ],
  }),
  component: AuthPage,
});

type AuthMode = "login" | "signup" | "forgot" | "reset";

function GoogleIcon() {
  return (
    <svg className="size-4 shrink-0" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const { user, profile, business, isAuthenticated, isConfigured, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Check URL parameters (e.g. ?mode=reset)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlMode = urlParams.get("mode");
      if (urlMode === "reset" || window.location.hash.includes("type=recovery")) {
        setMode("reset");
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Veuillez renseigner votre email et mot de passe");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithEmail(email.trim(), password);
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou mot de passe incorrect");
        } else {
          toast.error(error.message);
        }
        return;
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem("gesto_guest_mode");
      }
      toast.success("Connexion réussie ! Bienvenue sur GESTO.");
      void navigate({ to: "/" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la connexion";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const enterGuestMode = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("gesto_guest_mode", "true");
    }
    toast.info("Accès en mode démo local.");
    void navigate({ to: "/" });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Veuillez indiquer votre nom et prénom");
      return;
    }
    if (!businessName.trim()) {
      toast.error("Veuillez indiquer le nom de votre boutique");
      return;
    }
    if (!email.trim()) {
      toast.error("Veuillez indiquer une adresse email valide");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit comporter au moins 6 caractères");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signUpWithEmail(email.trim(), password, {
        fullName: fullName.trim(),
        businessName: businessName.trim(),
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.session) {
        toast.success("Boutique créée avec succès ! Bienvenue.");
        void navigate({ to: "/" });
      } else {
        toast.success("Compte créé ! Un email de confirmation a été envoyé à votre adresse.");
        setMode("login");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'inscription";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Veuillez indiquer votre adresse email");
      return;
    }
    setLoading(true);
    try {
      const { error } = await sendPasswordResetEmail(email.trim());
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Un lien de réinitialisation a été envoyé à votre email.");
      setMode("login");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi de l'email";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Le mot de passe doit comporter au moins 6 caractères");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Les deux mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const { error } = await updatePassword(password);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Mot de passe mis à jour avec succès !");
      setMode("login");
      void navigate({ to: "/" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de mise à jour";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        if (error.message.includes("provider is not enabled") || error.message.includes("Unsupported provider")) {
          toast.error(
            "Google OAuth n'est pas encore activé dans votre console Supabase (Authentication > Providers > Google). Utilisez l'email en attendant !",
            { duration: 6000 }
          );
        } else {
          toast.error(error.message);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connexion Google impossible";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 py-12">
      {/* Background decoration */}
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link to="/" className="inline-block transition hover:scale-105">
            <Logo subtitle={false} />
          </Link>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <Sparkles className="size-3.5" /> GESTO Cloud Multi-Boutiques
          </span>
          <p className="mt-2 text-sm text-muted-foreground">
            Logiciel de facturation, stock & encaissement en FCFA
          </p>
        </div>

        {/* Supabase unconfigured notice */}
        {!isConfigured && (
          <div className="mb-6 rounded-2xl border border-amber-300/40 bg-amber-50/80 p-4 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">Configuration Supabase en attente</p>
                <p className="mt-1 text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  Pour activer l'authentification en ligne et la synchronisation multi-appareils, renseignez <code className="font-mono bg-amber-200/50 dark:bg-amber-900/50 px-1 py-0.5 rounded">VITE_SUPABASE_URL</code> et <code className="font-mono bg-amber-200/50 dark:bg-amber-900/50 px-1 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> dans votre fichier <code className="font-mono">.env.local</code>.
                </p>
                <div className="mt-2">
                  <Link to="/" className="font-bold underline hover:no-underline">
                    Continuer en mode démo local →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card Body */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          {isAuthenticated && user ? (
            /* User already logged in */
            <div className="space-y-6 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">Vous êtes connecté</h2>
                <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              </div>

              <div className="rounded-xl border bg-muted/40 p-4 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilisateur :</span>
                  <span className="font-semibold text-foreground">{profile?.full_name || "Gérant"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Boutique :</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {business?.name || "Boutique connectée"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rôle :</span>
                  <span className="font-semibold uppercase tracking-wider text-xs">
                    {profile?.role === "gerant" ? "Gérant (Accès total)" : "Vendeur"}
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  to="/"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow transition hover:opacity-95"
                >
                  Accéder au tableau de bord <ArrowRight className="size-4" />
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    toast.success("Vous êtes déconnecté");
                  }}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
                >
                  <LogOut className="size-4" /> Se déconnecter
                </button>
              </div>
            </div>
          ) : (
            /* Authentication Forms */
            <div>
              {/* Tab Selector */}
              {mode !== "forgot" && mode !== "reset" && (
                <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`rounded-lg py-2 transition ${
                      mode === "login"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Connexion
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`rounded-lg py-2 transition ${
                      mode === "signup"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Créer ma boutique
                  </button>
                </div>
              )}

              {/* Mode: LOGIN */}
              {mode === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemple@commerce.sn"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">Mot de passe</label>
                      <button
                        type="button"
                        onClick={() => setMode("forgot")}
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow transition hover:opacity-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Se connecter"}
                  </button>

                  <div className="relative my-4 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <span className="relative bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      ou
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border bg-background text-xs font-bold text-foreground shadow-sm hover:bg-muted/50 transition disabled:opacity-50"
                  >
                    <GoogleIcon />
                    Continuer avec Google
                  </button>
                </form>
              )}

              {/* Mode: SIGNUP */}
              {mode === "signup" && (
                <form onSubmit={handleSignup} className="space-y-3.5">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Nom et prénom du Gérant
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="ex. Ousmane Diop"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Nom de votre commerce / Boutique
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="ex. Diop Électronique Dakar"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@diop-electro.sn"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">
                      Mot de passe (minimum 6 caractères)
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow transition hover:opacity-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Créer mon espace boutique"}
                  </button>

                  <div className="relative my-3 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t" />
                    </div>
                    <span className="relative bg-card px-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      ou
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border bg-background text-xs font-bold text-foreground shadow-sm hover:bg-muted/50 transition disabled:opacity-50"
                  >
                    <GoogleIcon />
                    Créer avec Google
                  </button>
                </form>
              )}

              {/* Mode: FORGOT PASSWORD */}
              {mode === "forgot" && (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="text-center pb-2">
                    <div className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
                      <KeyRound className="size-6" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">Mot de passe oublié ?</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Entrez votre adresse email. Nous vous enverrons un lien sécurisé pour choisir un nouveau mot de passe.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Votre adresse email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="exemple@commerce.sn"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow transition hover:opacity-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Envoyer le lien de réinitialisation"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="flex h-10 w-full items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                  >
                    <ArrowLeft className="size-3.5" /> Retour à la connexion
                  </button>
                </form>
              )}

              {/* Mode: RESET PASSWORD */}
              {mode === "reset" && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="text-center pb-2">
                    <h3 className="font-bold text-base text-foreground">Nouveau mot de passe</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Choisissez un mot de passe sécurisé pour votre compte.
                    </p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-foreground">
                      Confirmer le mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-xl border bg-background pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow transition hover:opacity-95 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : "Mettre à jour mon mot de passe"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Local Demo Fallback Link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={enterGuestMode}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition underline hover:no-underline"
          >
            ← Accéder à l'application en mode démo local (sans compte)
          </button>
        </div>
      </div>
    </div>
  );
}
