"use client";

import { CheckCircle, Timer } from "lucide-react";

export function RestTimerOverlay({ remaining, total, onSkip }: {
  remaining: number;
  total: number;
  onSkip: () => void;
}) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isAlmostDone = remaining <= 5;

  return (
    <div className={`rounded-2xl p-4 transition-colors ${
      isAlmostDone
        ? "bg-[var(--color-success-bg)] border border-[var(--color-success-border)]"
        : "bg-[var(--color-surface-2)] border border-[var(--color-border)]"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{isAlmostDone ? <CheckCircle size={20} className="text-green-500" /> : <Timer size={20} style={{ color: "var(--color-primary)" }} />}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
              {isAlmostDone ? "Quase lá!" : "Descansando"}
            </p>
            <p className="font-mono text-2xl font-bold leading-tight" style={{
              color: isAlmostDone ? "var(--color-success-text)" : "var(--color-primary)"
            }}>
              {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${remaining}s`}
            </p>
          </div>
        </div>
        <button
          onClick={onSkip}
          className="btn btn-sm"
          style={{ background: "var(--color-surface)", color: "var(--color-text-muted)" }}
        >
          Pular →
        </button>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${pct}%`,
            background: isAlmostDone ? "var(--color-success)" : "var(--color-primary)",
          }}
        />
      </div>
    </div>
  );
}
