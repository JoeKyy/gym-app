"use client";

import { useState, useEffect, useMemo } from "react";
import ExerciseCard from "@/components/ExerciseCard";
import type { Exercise } from "@/lib/types";
import {
  loadComplementaryLibrary,
  musclePT,
  type ComplementaryExercise,
  type SafetyLevel,
} from "@/lib/exercises/free-exercise-db";
import { complementaryToExercise } from "@/lib/exercises/adapter";

type Tab = "curados" | "complementar";

const SAFETY_UI: Record<SafetyLevel, { dot: string; chip: string }> = {
  safe:    { dot: "bg-emerald-400", chip: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" },
  caution: { dot: "bg-amber-400",   chip: "bg-amber-500/10 text-amber-300 border-amber-500/30" },
  avoid:   { dot: "bg-rose-400",    chip: "bg-rose-500/10 text-rose-300 border-rose-500/30" },
};

export function ExercisePicker({
  allExercises, search, onSearchChange,
  hideRisky, onHideRiskyToggle,
  respectEnv, onRespectEnvToggle,
  hasEnvFilter, hasInjuries,
  results, onAdd, onClose,
}: {
  allExercises: Exercise[];
  search: string;
  onSearchChange: (s: string) => void;
  hideRisky: boolean;
  onHideRiskyToggle: () => void;
  respectEnv: boolean;
  onRespectEnvToggle: () => void;
  hasEnvFilter: boolean;
  hasInjuries: boolean;
  results: Exercise[];
  onAdd: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("curados");

  // ── tab Complementar ──
  const [compAll, setCompAll] = useState<ComplementaryExercise[]>([]);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [compSearch, setCompSearch] = useState("");
  const [compSafety, setCompSafety] = useState<SafetyLevel | "all">("all");

  useEffect(() => {
    if (tab !== "complementar" || compAll.length > 0) return;
    setCompLoading(true);
    loadComplementaryLibrary("/data/free-exercise-db.json")
      .then(setCompAll)
      .catch((e) => setCompError(String(e?.message ?? e)))
      .finally(() => setCompLoading(false));
  }, [tab, compAll.length]);

  const compResults = useMemo(() => {
    const needle = compSearch.trim().toLowerCase();
    return compAll.filter((e) => {
      if (compSafety !== "all" && e.safety.level !== compSafety) return false;
      if (e.safety.level === "avoid") return false; // never show avoid
      if (needle && !e.n.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [compAll, compSearch, compSafety]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-auto rounded-t-3xl flex flex-col overflow-hidden max-h-[85vh]"
        style={{ background: "var(--color-surface)" }}>

        {/* header / search */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}>
          <input autoFocus type="search"
            placeholder={tab === "curados" ? "Buscar exercício..." : "Buscar na biblioteca..."}
            value={tab === "curados" ? search : compSearch}
            onChange={(e) => tab === "curados" ? onSearchChange(e.target.value) : setCompSearch(e.target.value)}
            className="input flex-1" />
          <button onClick={onClose} className="btn btn-sm shrink-0"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}>
            Fechar
          </button>
        </div>

        {/* tabs */}
        <div className="flex border-b shrink-0" style={{ borderColor: "var(--color-border)" }}>
          {(["curados", "complementar"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-[var(--color-primary)] text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}>
              {t === "curados" ? `Curados (${results.length})` : "📚 Complementar"}
            </button>
          ))}
        </div>

        {/* ── tab curados ── */}
        {tab === "curados" && (
          <>
            <div className="flex gap-2 flex-wrap px-4 py-2.5 border-b shrink-0 text-xs"
              style={{ borderColor: "var(--color-border)" }}>
              {hasEnvFilter && (
                <button onClick={onRespectEnvToggle}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    respectEnv
                      ? "bg-[var(--color-primary-soft)] border-[var(--color-primary-border)] text-[var(--color-primary)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}>
                  {respectEnv ? "✓ " : ""}Filtrar ambiente
                </button>
              )}
              {hasInjuries && (
                <button onClick={onHideRiskyToggle}
                  className={`px-3 py-1.5 rounded-lg border transition-colors ${
                    hideRisky
                      ? "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-text)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}>
                  {hideRisky ? "✓ " : ""}Ocultar arriscados
                </button>
              )}
              <span className="ml-auto self-center" style={{ color: "var(--color-text-muted)" }}>
                {results.length} exercícios
              </span>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {results.slice(0, 80).map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} isRisky={false} onAddToWorkout={onAdd} />
              ))}
              {results.length === 0 && (
                <p className="text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Nenhum exercício encontrado
                </p>
              )}
            </div>
          </>
        )}

        {/* ── tab complementar ── */}
        {tab === "complementar" && (
          <>
            {/* safety filter */}
            <div className="flex gap-1.5 px-4 py-2.5 border-b shrink-0"
              style={{ borderColor: "var(--color-border)" }}>
              {(["all", "safe", "caution"] as const).map((lvl) => {
                const active = compSafety === lvl;
                const label = lvl === "all" ? "Todos" : lvl === "safe" ? "Seguros" : "Cautela";
                return (
                  <button key={lvl} onClick={() => setCompSafety(lvl)}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                      active
                        ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
                    }`}>
                    {lvl !== "all" && <span className={`h-1.5 w-1.5 rounded-full ${SAFETY_UI[lvl].dot}`} />}
                    {label}
                  </button>
                );
              })}
              <span className="ml-auto self-center text-xs" style={{ color: "var(--color-text-muted)" }}>
                {compResults.length}
              </span>
            </div>

            <div className="overflow-y-auto flex-1 p-3 space-y-2">
              {compLoading && (
                <p className="text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>Carregando…</p>
              )}
              {compError && (
                <p className="text-center py-10 text-sm text-rose-400">{compError}</p>
              )}
              {!compLoading && !compError && compResults.slice(0, 80).map((ce) => {
                const sf = SAFETY_UI[ce.safety.level];
                return (
                  <div key={ce.slug}
                    className="flex items-center gap-3 rounded-xl border p-3"
                    style={{ background: "var(--color-surface-2)", borderColor: "var(--color-border)" }}>
                    {ce.images[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ce.images[0]} alt={ce.n} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>{ce.n}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        {ce.primaryMuscles.map(musclePT).join(", ")} · {ce.level}
                      </p>
                      <span className={`inline-flex items-center gap-1 mt-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${sf.chip}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${sf.dot}`} />
                        {ce.safety.level === "safe" ? "Seguro" : "Cautela"}
                      </span>
                    </div>
                    <button
                      onClick={() => { onAdd(complementaryToExercise(ce)); onClose(); }}
                      className="btn btn-sm shrink-0 text-xs"
                      style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)" }}>
                      + Adicionar
                    </button>
                  </div>
                );
              })}
              {!compLoading && !compError && compResults.length === 0 && (
                <p className="text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Nenhum exercício encontrado
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
