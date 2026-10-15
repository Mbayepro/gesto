import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Zap, SwitchCamera } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Scanner code-barres utilisant l'API BarcodeDetector du navigateur.
 * Fonctionne sur Chrome/Edge/Samsung Internet (Android) et Safari 17.2+.
 * Fallback : saisie manuelle du code si non supporté.
 */

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
  className?: string;
}

/** Vérifie si BarcodeDetector est supporté par le navigateur. */
export function isBarcodeSupported(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

export function BarcodeScanner({ onScan, onClose, className }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState("");
  const lastCodeRef = useRef<string>("");

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        setError(null);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Impossible d'accéder à la caméra. Vérifiez les autorisations.");
    }
  }, [facingMode, stopCamera]);

  // Détection en boucle via BarcodeDetector
  useEffect(() => {
    if (!scanning || !videoRef.current || !isBarcodeSupported()) return;

    // @ts-expect-error BarcodeDetector is not yet in TS stdlib
    const detector = new window.BarcodeDetector({
      formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code", "data_matrix"],
    });

    let active = true;
    const detect = async () => {
      if (!active || !videoRef.current || videoRef.current.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect);
        return;
      }
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code && code !== lastCodeRef.current) {
            lastCodeRef.current = code;
            // Vibration feedback sur mobile
            if (navigator.vibrate) navigator.vibrate(100);
            // Flash visuel
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext("2d");
              if (ctx) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                ctx.strokeStyle = "#22c55e";
                ctx.lineWidth = 4;
                const { boundingBox: bb } = barcodes[0];
                if (bb) ctx.strokeRect(bb.x, bb.y, bb.width, bb.height);
              }
            }
            // Délai avant de remonter pour laisser voir le feedback
            setTimeout(() => {
              onScan(code);
              stopCamera();
            }, 400);
            return;
          }
        }
      } catch {
        // Erreur silencieuse, on continue de scanner
      }
      if (active) rafRef.current = requestAnimationFrame(detect);
    };
    rafRef.current = requestAnimationFrame(detect);

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scanning, onScan, stopCamera]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  const toggleCamera = () => {
    setFacingMode((f) => (f === "environment" ? "user" : "environment"));
  };

  useEffect(() => {
    if (scanning) void startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (code) {
      onScan(code);
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="size-5 text-accent" /> Scanner
        </h2>
        <button onClick={() => { stopCamera(); onClose(); }} className="grid size-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <X className="size-5" />
        </button>
      </div>

      {/* Video preview */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="text-center px-6">
            <Camera className="mx-auto size-16 text-white/30 mb-4" />
            <p className="text-white/70 text-sm mb-4">{error}</p>
          </div>
        ) : scanning ? (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full object-cover pointer-events-none" />
            {/* Zone de visée */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-40 sm:w-80 sm:h-48">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-accent rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-accent rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-accent rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-accent rounded-br-lg" />
                {/* Ligne de scan animée */}
                <div className="absolute left-2 right-2 h-0.5 bg-accent/80 animate-pulse top-1/2 -translate-y-1/2 shadow-[0_0_8px_rgba(0,230,118,0.6)]" />
              </div>
            </div>
            <p className="absolute bottom-6 left-0 right-0 text-center text-white/60 text-sm">
              Placez le code-barres dans le cadre
            </p>
          </>
        ) : (
          <div className="text-center px-6">
            <Camera className="mx-auto size-16 text-white/30 mb-4" />
            <p className="text-white/50 text-sm">Appuyez sur le bouton pour démarrer la caméra</p>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="p-4 space-y-3">
        {/* Camera buttons */}
        <div className="flex items-center justify-center gap-4">
          {!scanning ? (
            <button
              onClick={() => void startCamera()}
              className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-lg transition hover:brightness-110"
            >
              <Camera className="size-5" />
              {isBarcodeSupported() ? "Démarrer le scan" : "Caméra non supportée"}
            </button>
          ) : (
            <>
              <button onClick={stopCamera} className="flex items-center gap-2 rounded-full bg-destructive px-5 py-3 font-semibold text-white shadow-lg">
                <X className="size-4" /> Arrêter
              </button>
              <button onClick={toggleCamera} className="grid size-12 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 transition">
                <SwitchCamera className="size-5" />
              </button>
            </>
          )}
        </div>

        {/* Saisie manuelle comme fallback */}
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Ou saisir le code manuellement..."
            className="flex-1 h-11 rounded-lg bg-white/10 px-4 text-white placeholder:text-white/40 text-sm outline-none border border-white/15 focus:border-accent"
          />
          <button
            type="submit"
            disabled={!manualCode.trim()}
            className="h-11 px-5 rounded-lg bg-primary font-semibold text-primary-foreground text-sm disabled:opacity-40 transition"
          >
            OK
          </button>
        </form>
      </div>
    </div>
  );
}

/**
 * Bouton compact pour ouvrir le scanner dans une barre de recherche.
 */
export function ScanButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Scanner un code-barres"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-lg border border-input bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="size-5">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <line x1="7" y1="8" x2="7" y2="8.01" />
        <line x1="12" y1="8" x2="12" y2="8.01" />
        <line x1="17" y1="8" x2="17" y2="8.01" />
        <line x1="7" y1="16" x2="7" y2="16.01" />
        <line x1="12" y1="16" x2="12" y2="16.01" />
        <line x1="17" y1="16" x2="17" y2="16.01" />
      </svg>
    </button>
  );
}
