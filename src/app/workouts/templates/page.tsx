"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveWorkout, generateId, now as nowISO } from "@/lib/storage";
import type { Workout } from "@/lib/types";

// ─── MuscleWiki Workout Types ─────────────────────────────────────────────────

interface MWExercise {
  id: number;
  name: string;
  target?: string[];
  sets?: number;
  reps?: number | string;
  rest?: number;
}

interface MWWorkout {
  id: number;
  name: string;
  description?: string;
  difficulty?: string;
  category?: string;
  tags?: string[];
  exercises?: MWExercise[];
  duration_minutes?: number;
  muscle_groups?: string[];
}

interface MWRoutine {
  id: number;
  name: string;
  description?: string;
  difficulty?: string;
  days_per_week?: number;
  workouts?: MWWorkout[];
  tags?: string[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function difficultyColor(d?: string) {
  const dl = d?.toLowerCase() ?? "";
  if (dl.includes("beginner") || dl.includes("iniciante")) return "badge-green";
  if (dl.includes("advanced") || dl.includes("avançado")) return "badge-red";
  return "badge-gray";
}

function difficultyLabel(d?: string): string {
  const dl = d?.toLowerCase() ?? "";
  if (dl.includes("beginner")) return "Iniciante";
  if (dl.includes("intermediate")) return "Intermediário";
  if (dl.includes("advanced")) return "Avançado";
  return d ?? "—";
}

function mwWorkoutToGymWorkout(mw: MWWorkout): Workout {
  const ts = nowISO();
  return {
    id: generateId(),
    name: mw.name,
    environment: "any",
    createdAt: ts,
    updatedAt: ts,
    exercises: (mw.exercises ?? []).map((ex) => ({
      exerciseId: String(ex.id),
      config: {
        sets: ex.sets ?? 3,
        reps: ex.reps ?? 12,
        rest: ex.rest ?? 60,
      },
    })),
  };
}

// ─── Workout Card ─────────────────────────────────────────────────────────────

function WorkoutTemplateCard({ workout, onStart, onSave }: {
  workout: MWWorkout;
  onStart: () => void;
  onSave: () => void;
}) {
  const muscles = workout.muscle_groups ?? [];
  const exerciseCount = workout.exercises?.length ?? 0;

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-bold text-sm leading-snug line-clamp-2">{workout.name}</h3>
          {workout.difficulty && (
            <span className={`badge ${difficultyColor(workout.difficulty)} shrink-0`}>
              {difficultyLabel(workout.difficulty)}
            </span>
          )}
        </div>

        {workout.description && (
          <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--color-text-secondary)" }}>
            {workout.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
          {exerciseCount > 0 && <span>🔢 {exerciseCount} exercícios</span>}
          {workout.duration_minutes && <span>⏱ ~{workout.duration_minutes} min</span>}
          {workout.category && <span>📂 {workout.category}</span>}
        </div>

        {muscles.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {muscles.slice(0, 4).map((m) => (
              <span key={m} className="badge badge-gray text-[10px]">{m}</span>
            ))}
            {muscles.length > 4 && (
              <span className="badge badge-gray text-[10px]">+{muscles.length - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="border-t px-4 py-3 flex gap-2" style={{ borderColor: "var(--color-border)" }}>
        <button
          onClick={onSave}
          className="flex-1 btn btn-secondary text-xs py-2"
        >
          💾 Salvar
        </button>
        <button
          onClick={onStart}
          className="flex-1 btn btn-primary text-xs py-2"
        >
          ▶ Iniciar
        </button>
      </div>
    </div>
  );
}

// ─── Routine Card ─────────────────────────────────────────────────────────────

function RoutineTemplateCard({ routine, onExpand }: {
  routine: MWRoutine;
  onExpand: () => void;
}) {
  return (
    <div className="card card-interactive p-4" onClick={onExpand}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-sm leading-snug">{routine.name}</h3>
        <div className="flex gap-1 shrink-0">
          {routine.difficulty && (
            <span className={`badge ${difficultyColor(routine.difficulty)}`}>
              {difficultyLabel(routine.difficulty)}
            </span>
          )}
        </div>
      </div>

      {routine.description && (
        <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--color-text-secondary)" }}>
          {routine.description}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
        {routine.days_per_week && <span>📅 {routine.days_per_week}x/semana</span>}
        {routine.workouts?.length && <span>🗓 {routine.workouts.length} treinos</span>}
      </div>

      <p className="text-xs mt-2 text-right" style={{ color: "var(--color-primary)" }}>Ver treinos →</p>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="space-y-6">
      <div className="card p-6 text-center space-y-4">
        <div className="text-5xl">📋</div>
        <div>
          <h2 className="font-bold text-lg">Nenhum template ainda</h2>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Os templates do MuscleWiki ainda não foram importados.
          </p>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="font-bold text-sm">Como importar templates do MuscleWiki</h3>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Você precisa de uma chave de API ULTRA/MEGA do MuscleWiki. Execute o comando abaixo:
        </p>
        <div className="rounded-xl p-3 text-xs font-mono leading-relaxed overflow-x-auto"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}>
          <p style={{ color: "var(--color-text-muted)" }}># No diretório do projeto:</p>
          <p>export MW_API_KEY=&quot;sua_chave_aqui&quot;</p>
          <p>python3 scraper/fetch_mw_workouts.py</p>
          <p>npm run build && ./deploy.sh</p>
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          Os arquivos serão salvos em <code>public/data/mw_workouts.json</code> e
          <code>public/data/mw_routines.json</code>.
        </p>
      </div>

      <div className="space-y-2">
        <p className="section-label">Enquanto isso, tente</p>
        <Link href="/generate"
          className="card card-interactive p-4 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="font-semibold text-sm">Gerador de Treino</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Monte um treino personalizado em segundos
            </p>
          </div>
          <span className="ml-auto" style={{ color: "var(--color-text-muted)" }}>→</span>
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "workouts" | "routines";
type ExpandedRoutine = MWRoutine | null;

export default function TemplatesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("workouts");
  const [workouts, setWorkouts] = useState<MWWorkout[]>([]);
  const [routines, setRoutines] = useState<MWRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [expandedRoutine, setExpandedRoutine] = useState<ExpandedRoutine>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [wRes, rRes] = await Promise.all([
          fetch("/data/mw_workouts.json"),
          fetch("/data/mw_routines.json"),
        ]);

        if (!mounted) return;

        const wData = wRes.ok ? await wRes.json() : [];
        const rData = rRes.ok ? await rRes.json() : [];

        setWorkouts(Array.isArray(wData) ? wData : []);
        setRoutines(Array.isArray(rData) ? rData : []);
        setHasData((Array.isArray(wData) && wData.length > 0) ||
                   (Array.isArray(rData) && rData.length > 0));
      } catch {
        // Files don't exist yet
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filteredWorkouts = useMemo(() => {
    return workouts.filter((w) => {
      const matchSearch = !search ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        (w.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (w.muscle_groups ?? []).some((m) => m.toLowerCase().includes(search.toLowerCase()));
      const matchDiff = filterDifficulty === "all" || (w.difficulty ?? "").toLowerCase().includes(filterDifficulty);
      return matchSearch && matchDiff;
    });
  }, [workouts, search, filterDifficulty]);

  const filteredRoutines = useMemo(() => {
    return routines.filter((r) => {
      const matchSearch = !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.description ?? "").toLowerCase().includes(search.toLowerCase());
      const matchDiff = filterDifficulty === "all" || (r.difficulty ?? "").toLowerCase().includes(filterDifficulty);
      return matchSearch && matchDiff;
    });
  }, [routines, search, filterDifficulty]);

  function handleSave(mw: MWWorkout) {
    const workout = mwWorkoutToGymWorkout(mw);
    saveWorkout(workout);
    setSavedMsg(mw.name);
    setTimeout(() => setSavedMsg(null), 2500);
  }

  function handleStart(mw: MWWorkout) {
    const workout = mwWorkoutToGymWorkout(mw);
    saveWorkout(workout);
    router.push(`/workout?id=${workout.id}`);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <Link href="/workouts" className="text-sm inline-flex items-center gap-1 mb-2"
          style={{ color: "var(--color-text-muted)" }}>
          ← Meus Treinos
        </Link>
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Treinos prontos do MuscleWiki para usar ou adaptar
        </p>
      </div>

      {/* Saved toast */}
      {savedMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold"
          style={{ background: "var(--color-success)", color: "black" }}>
          ✓ "{savedMsg}" salvo!
        </div>
      )}

      {loading ? (
        <div className="text-center py-20" style={{ color: "var(--color-text-muted)" }}>
          <p className="text-4xl mb-3 animate-pulse">📋</p>
          <p>Carregando templates...</p>
        </div>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
            {([["workouts", "Treinos", workouts.length], ["routines", "Rotinas", routines.length]] as const).map(([id, label, count]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
                  tab === id
                    ? "text-[var(--color-primary)]"
                    : "text-[var(--color-text-muted)]"
                }`}
                style={tab === id ? { background: "var(--color-primary-soft)" } : { background: "var(--color-surface-2)" }}
              >
                {label} <span className="text-xs opacity-60">({count})</span>
              </button>
            ))}
          </div>

          {/* Search + filter */}
          <div className="space-y-2">
            <input
              type="search"
              placeholder={tab === "workouts" ? "Buscar treino..." : "Buscar rotina..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full"
            />
            <div className="flex gap-2">
              {(["all", "beginner", "intermediate", "advanced"] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setFilterDifficulty(d)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
                    filterDifficulty === d
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {d === "all" ? "Todos" : difficultyLabel(d)}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          {tab === "workouts" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredWorkouts.length === 0 ? (
                <div className="col-span-full text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Nenhum treino encontrado
                </div>
              ) : (
                filteredWorkouts.map((w) => (
                  <WorkoutTemplateCard
                    key={w.id}
                    workout={w}
                    onSave={() => handleSave(w)}
                    onStart={() => handleStart(w)}
                  />
                ))
              )}
            </div>
          )}

          {tab === "routines" && (
            <>
              {expandedRoutine ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setExpandedRoutine(null)}
                    className="text-sm flex items-center gap-1"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    ← Voltar às rotinas
                  </button>
                  <div>
                    <h2 className="font-bold text-lg">{expandedRoutine.name}</h2>
                    {expandedRoutine.description && (
                      <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                        {expandedRoutine.description}
                      </p>
                    )}
                    {expandedRoutine.days_per_week && (
                      <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                        📅 {expandedRoutine.days_per_week}x por semana
                      </p>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(expandedRoutine.workouts ?? []).map((w) => (
                      <WorkoutTemplateCard
                        key={w.id}
                        workout={w}
                        onSave={() => handleSave(w)}
                        onStart={() => handleStart(w)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredRoutines.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
                      Nenhuma rotina encontrada
                    </div>
                  ) : (
                    filteredRoutines.map((r) => (
                      <RoutineTemplateCard
                        key={r.id}
                        routine={r}
                        onExpand={() => setExpandedRoutine(r)}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
