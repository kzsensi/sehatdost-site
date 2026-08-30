import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Sparkles, ShieldCheck } from "lucide-react";

const steps = [
  "Checking policy validity",
  "Matching disease package (PM-JAY master)",
  "Verifying hospital empanelment",
  "Checking required documents",
  "Estimating approval probability",
  "Running AI recommendation engine",
];

export function AIProcessingOverlay({ onDone }: { onDone: () => void }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (active >= steps.length) {
      const t = setTimeout(onDone, 450);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setActive((a) => a + 1), 650);
    return () => clearTimeout(t);
  }, [active, onDone]);

  const progress = Math.min(100, Math.round((active / steps.length) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-md animate-fade-in-up">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-7 shadow-elegant backdrop-blur-xl dark:bg-card/80">
        <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-primary opacity-20 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-gradient-teal opacity-20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-6 w-6" />
              <span className="absolute inset-0 animate-pulse-glow rounded-xl" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">SEHAT AI Engine</div>
              <h3 className="font-display text-lg font-bold">Verifying eligibility…</h3>
            </div>
          </div>

          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <ul className="mt-6 space-y-2.5">
            {steps.map((s, i) => {
              const done = i < active;
              const current = i === active;
              return (
                <li
                  key={s}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
                    done
                      ? "border-success/30 bg-success/5"
                      : current
                        ? "border-primary/40 bg-primary/5 shadow-card"
                        : "border-border/60 bg-card/40 opacity-60"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      done
                        ? "bg-success/15 text-success"
                        : current
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : current ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-[10px] font-semibold">{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-sm ${current ? "font-medium" : ""}`}>{s}</span>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" />
            Cross-referencing 1800+ insurance & Ayushman policy frameworks
          </div>
        </div>
      </div>
    </div>
  );
}
