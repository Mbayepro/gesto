import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Package, Tv, Wind, Zap, Plug, Wrench, Flame, ShoppingBag } from "lucide-react";
import type { SaleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground md:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, title, action }: { className?: string; children: ReactNode; title?: string; action?: ReactNode }) {
  return (
    <section className={cn("card-surface p-4 md:p-5", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, icon: Icon, tone = "primary", hint }: { label: string; value: string; icon: LucideIcon; tone?: "primary" | "success" | "warning" | "destructive" | "accent"; hint?: string }) {
  const tones = {
    primary: "bg-secondary text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-accent/20 text-primary",
  };
  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground md:text-sm">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", tones[tone])}><Icon className="size-4" /></span>
      </div>
      <div className="mt-2 font-display text-lg font-bold leading-tight md:text-2xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

type Tone = "success" | "warning" | "destructive" | "primary" | "muted";
export function Pill({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  const t: Record<Tone, string> = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/12 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    primary: "bg-secondary text-primary",
    muted: "bg-muted text-muted-foreground",
  };
  return <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", t[tone])}>{children}</span>;
}

export function SaleStatusPill({ status }: { status: SaleStatus }) {
  if (status === "payee") return <Pill tone="success">Payée</Pill>;
  if (status === "partielle") return <Pill tone="warning">Partiellement payée</Pill>;
  return <Pill tone="destructive">Impayée</Pill>;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block space-y-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export function NativeSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, "appearance-none pr-8", props.className)} />;
}

export function ProductThumb({ emoji, name = "", className }: { emoji?: string; name?: string; className?: string }) {
  let Icon: LucideIcon = Package;
  let bgCls = "bg-primary/10 text-primary border-primary/20";

  const key = `${emoji || ""} ${name}`.toLowerCase();
  if (key.includes("tv") || key.includes("télé") || key.includes("écran") || key.includes("📺")) {
    Icon = Tv;
    bgCls = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  } else if (key.includes("clim") || key.includes("ventil") || key.includes("air") || key.includes("froid") || key.includes("frigo") || key.includes("❄️") || key.includes("🌀") || key.includes("🧊")) {
    Icon = Wind;
    bgCls = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
  } else if (key.includes("chauffe") || key.includes("eau") || key.includes("chaleur") || key.includes("🚿")) {
    Icon = Flame;
    bgCls = "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
  } else if (key.includes("service") || key.includes("install") || key.includes("répar") || key.includes("🛠️") || key.includes("wrench")) {
    Icon = Wrench;
    bgCls = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  } else if (key.includes("câble") || key.includes("prise") || key.includes("rallonge") || key.includes("🔌") || key.includes("🔋")) {
    Icon = Plug;
    bgCls = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  } else if (key.includes("électr") || key.includes("stabili") || key.includes("mixeur") || key.includes("fer") || key.includes("micro") || key.includes("🍲") || key.includes("👕") || key.includes("🥤")) {
    Icon = Zap;
    bgCls = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
  }

  return (
    <div className={cn("grid size-11 shrink-0 place-items-center rounded-xl border transition shadow-2xs", bgCls, className)}>
      <Icon className="size-5" />
    </div>
  );
}
