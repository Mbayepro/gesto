import { useState, useEffect } from "react";
import { Download, Smartphone, Check } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaButton({ className = "" }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Vérifier si l'app est déjà en mode standalone / installée
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Guide rapide pour iOS / Safari ou installation manuelle
      alert("Pour installer GESTO sur votre téléphone :\n\n- Sur iPhone (Safari) : Appuyez sur 'Partager' puis 'Sur l'écran d'accueil'.\n- Sur Android (Chrome) : Appuyez sur le menu (3 points) puis 'Installer l'application'.");
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 ${className}`}>
        <Check className="size-4" /> App installée
      </span>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className={`inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/20 ${className}`}
      title="Installer l'application GESTO sur votre appareil"
    >
      <Smartphone className="size-4" />
      <span>Installer l'application mobile</span>
    </button>
  );
}
