export function LogoMark({ className = "size-9" }: { className?: string }) {
  return (
    <div className={`${className} grid place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-sm`}>
      <svg viewBox="0 0 24 24" className="size-[58%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="3" />
        <path d="M7 8h10" />
        <path d="M7 12h10" />
        <path d="M7 16h6" />
        <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

export function Logo({ light = false, subtitle = true }: { light?: boolean; subtitle?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <div className="leading-tight">
        <div className={`font-display text-lg font-black tracking-tight ${light ? "text-sidebar-accent-foreground" : "text-primary"}`}>
          GESTO
        </div>
        {subtitle && (
          <div className={`text-[11px] font-medium ${light ? "text-sidebar-foreground/75" : "text-muted-foreground"}`}>
            Facturation & Ventes
          </div>
        )}
      </div>
    </div>
  );
}
