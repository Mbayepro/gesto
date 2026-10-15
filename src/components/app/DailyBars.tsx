import { fcfa } from "@/lib/format";

export interface DayPoint { d: string; ca: number }

/** Lightweight CSS bar chart (no SSR sizing issues). */
export function DailyBars({ data, height = 220 }: { data: DayPoint[]; height?: number }) {
  const max = Math.max(1, ...data.map((p) => p.ca));
  const step = data.length > 14 ? Math.ceil(data.length / 8) : 1;
  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((p) => (
          <div key={p.d} className="group relative flex h-full flex-1 flex-col justify-end" title={`${p.d} : ${fcfa(p.ca)}`}>
            <div
              className="w-full rounded-t-md bg-primary transition-opacity group-hover:opacity-80"
              style={{ height: `${p.ca ? Math.max(3, (p.ca / max) * 100) : 1}%`, opacity: p.ca ? 1 : 0.15 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        {data.map((p, i) => (
          <div key={p.d} className="flex-1 text-center text-[10px] text-muted-foreground">{i % step === 0 ? p.d : ""}</div>
        ))}
      </div>
    </div>
  );
}

export function lastDays(days: number, sales: { date: string; total: number }[]): DayPoint[] {
  return Array.from({ length: days }, (_, i) => {
    const dt = new Date(Date.now() - (days - 1 - i) * 864e5);
    const key = dt.toDateString();
    return {
      d: `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`,
      ca: sales.filter((s) => new Date(s.date).toDateString() === key).reduce((a, s) => a + s.total, 0),
    };
  });
}
