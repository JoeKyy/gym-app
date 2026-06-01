"use client";

/**
 * BibliotecaComplementar.tsx
 * ----------------------------------------------------------------------------
 * Catálogo complementar com triagem de segurança lombar (L4-L5).
 * 800+ exercícios do free-exercise-db com semáforo visual.
 * ----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState } from "react";
import {
  loadComplementaryLibrary,
  musclePT,
  type ComplementaryExercise,
  type SafetyLevel,
} from "@/lib/exercises/free-exercise-db";

/* ── semáforo de segurança ── */
const SAFETY: Record<
  SafetyLevel,
  { label: string; dot: string; chip: string; ring: string }
> = {
  safe:    { label: "Seguro",  dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", ring: "ring-emerald-500/20" },
  caution: { label: "Cautela", dot: "bg-amber-400",   chip: "bg-amber-500/10 text-amber-300 border-amber-500/30",     ring: "ring-amber-500/20" },
  avoid:   { label: "Evitar",  dot: "bg-rose-400",    chip: "bg-rose-500/10 text-rose-300 border-rose-500/30",        ring: "ring-rose-500/20" },
};

const SAFETY_ORDER: Record<SafetyLevel, number> = { safe: 0, caution: 1, avoid: 2 };

interface Props {
  /** URL do JSON local (ex.: "/data/free-exercise-db.json") */
  dataUrl?: string;
  /** Gancho para "Montar Treino" — recebe o exercício escolhido */
  onAdd?: (ex: ComplementaryExercise) => void;
}

export default function BibliotecaComplementar({ dataUrl, onAdd }: Props) {
  const [all, setAll] = useState<ComplementaryExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [safety, setSafety] = useState<SafetyLevel | "all">("all");
  const [muscle, setMuscle] = useState<string>("all");
  const [local, setLocal] = useState<string>("all");
  const [selected, setSelected] = useState<ComplementaryExercise | null>(null);

  useEffect(() => {
    let alive = true;
    loadComplementaryLibrary(dataUrl)
      .then((data) => alive && setAll(data))
      .catch((e) => alive && setError(String(e?.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [dataUrl]);

  const muscles = useMemo(() => {
    const s = new Set<string>();
    all.forEach((e) => e.primaryMuscles.forEach((m) => s.add(m)));
    return Array.from(s).sort();
  }, [all]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((e) => {
        if (safety !== "all" && e.safety.level !== safety) return false;
        if (muscle !== "all" && !e.primaryMuscles.includes(muscle)) return false;
        if (local !== "all" && e.loc !== local) return false;
        if (needle && !e.n.toLowerCase().includes(needle)) return false;
        return true;
      })
      .sort(
        (a, b) =>
          SAFETY_ORDER[a.safety.level] - SAFETY_ORDER[b.safety.level] ||
          a.n.localeCompare(b.n)
      );
  }, [all, q, safety, muscle, local]);

  return (
    <div className="space-y-4">
      {/* header / filtros */}
      <div className="card p-4 space-y-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-text)]">Biblioteca Complementar</h2>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            +800 exercícios (domínio público) com triagem de segurança lombar.{" "}
            <span className="opacity-70">Cautela = revisar antes de usar.</span>
          </p>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar exercício…"
          className="input w-full"
        />

        {/* filtro de segurança */}
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "safe", "caution", "avoid"] as const).map((lvl) => {
            const active = safety === lvl;
            const label = lvl === "all" ? "Todos" : SAFETY[lvl].label;
            return (
              <button
                key={lvl}
                onClick={() => setSafety(lvl)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                  active
                    ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:border-[var(--color-primary)]"
                }`}
              >
                {lvl !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${SAFETY[lvl].dot}`} />}
                {label}
              </button>
            );
          })}
        </div>

        {/* dropdowns */}
        <div className="flex gap-2">
          <select
            value={muscle}
            onChange={(e) => setMuscle(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          >
            <option value="all">Todos os músculos</option>
            {muscles.map((m) => (
              <option key={m} value={m}>{musclePT(m)}</option>
            ))}
          </select>
          <select
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-2 text-xs text-[var(--color-text)] outline-none focus:border-[var(--color-primary)]"
          >
            <option value="all">Local</option>
            <option value="Casa">Casa</option>
            <option value="Smart Fit">Smart Fit</option>
            <option value="Ambos">Ambos</option>
          </select>
        </div>
      </div>

      {/* estados */}
      {loading && (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Carregando biblioteca…</p>
      )}
      {error && (
        <p className="py-10 text-center text-sm text-rose-400">
          Falha ao carregar: {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <p className="text-xs text-[var(--color-text-muted)] px-1">{results.length} exercícios</p>

          <div className="grid grid-cols-2 gap-3">
            {results.map((e) => {
              const sf = SAFETY[e.safety.level];
              return (
                <button
                  key={e.slug}
                  onClick={() => setSelected(e)}
                  className={`group overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-left ring-1 ${sf.ring} transition hover:bg-[var(--color-surface-2)]`}
                >
                  <div className="relative aspect-square bg-[var(--color-surface-2)]">
                    {e.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.images[0]}
                        alt={e.n}
                        loading="lazy"
                        className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                      />
                    )}
                    <span
                      className={`absolute left-2 top-2 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sf.chip}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${sf.dot}`} />
                      {sf.label}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-xs font-medium leading-snug text-[var(--color-text)]">{e.n}</p>
                    <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                      {e.primaryMuscles.map(musclePT).join(", ") || "—"} · {e.s}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* painel de detalhe */}
      {selected && (
        <ExerciseDetail ex={selected} onClose={() => setSelected(null)} onAdd={onAdd} />
      )}
    </div>
  );
}

/* ── painel de detalhe (bottom sheet) ── */
function ExerciseDetail({
  ex,
  onClose,
  onAdd,
}: {
  ex: ComplementaryExercise;
  onClose: () => void;
  onAdd?: (ex: ComplementaryExercise) => void;
}) {
  const sf = SAFETY[ex.safety.level];
  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl border-t border-[var(--color-border)] p-5"
        style={{ background: "var(--color-surface)" }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--color-border)]" />
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--color-text)]">{ex.n}</h2>
          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${sf.chip}`}>
            {sf.label}
          </span>
        </div>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          {ex.eq} · {ex.loc} · {ex.level} · {ex.s}
        </p>

        {ex.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ex.images[0]} alt={ex.n} className="mt-4 w-full rounded-2xl object-cover" />
        )}

        {/* motivo da classificação */}
        <div className={`mt-4 rounded-xl border p-3 text-xs ${sf.chip}`}>
          <p className="font-semibold">Por que {sf.label.toLowerCase()} para sua lombar:</p>
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {ex.safety.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {/* músculos */}
        {ex.primaryMuscles.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Músculos</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ex.primaryMuscles.map((m) => (
                <span key={m} className="rounded-full bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text)]">
                  {musclePT(m)}
                </span>
              ))}
              {ex.secondaryMuscles.map((m) => (
                <span key={m} className="rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-text-muted)]">
                  {musclePT(m)}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* execução */}
        <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Execução</h3>
        <ol className="mt-2 space-y-2">
          {ex.steps.map((s, i) => (
            <li key={i} className="flex gap-2 text-sm text-[var(--color-text)]">
              <span className="mt-0.5 text-xs font-semibold text-[var(--color-text-muted)]">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>

        <div className="sticky bottom-0 mt-5 flex gap-2 pt-2" style={{ background: "var(--color-surface)" }}>
          <button
            onClick={onClose}
            className="btn flex-1 py-3 text-sm"
          >
            Fechar
          </button>
          {onAdd && ex.safety.level !== "avoid" && (
            <button
              onClick={() => { onAdd(ex); onClose(); }}
              className="btn btn-primary flex-1 py-3 text-sm font-semibold"
            >
              Adicionar ao treino
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
