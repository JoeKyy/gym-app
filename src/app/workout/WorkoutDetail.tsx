"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useInjuries } from "@/hooks/useInjuries";
import { getExercises, filterExercises } from "@/lib/data";
import { saveSession, generateId, now as nowISO, getBestEstimated1RM, epley1RM, getProgressionSuggestion } from "@/lib/storage";
import { MUSCLE_PT, DIFFICULTY_PT, MECHANIC_PT, EQUIPMENT_PT } from "@/lib/translations";
import ExerciseMedia, { getAvailableAngles, getVideoUrl } from "@/components/ExerciseMedia";
import type { VideoAngle } from "@/components/ExerciseMedia";
import BodyMapImage from "@/components/BodyMapImage";
import ExerciseCard from "@/components/ExerciseCard";
import { Dumbbell, Home, Zap, Timer, CheckCircle, Trophy, Info, Play, PartyPopper, Link2, Link2Off, ChevronLeft } from "lucide-react";
import type { Exercise, Workout, ExerciseSet, WorkoutSession, ExerciseLog, SetLog } from "@/lib/types";

const DEFAULT_SET: ExerciseSet = { sets: 3, reps: 12, rest: 60 };
const ENV_ICON: Record<string, React.ReactNode> = {
  home:    <Home    size={20} />,
  gym:     <Dumbbell size={20} />,
  pilates: <Zap    size={20} />,
  any:     <Zap    size={20} />,
};
const ENV_LABEL: Record<string, string> = { home: "Casa", gym: "Academia", pilates: "Pilates/Mobilidade", any: "Qualquer" };

// ─── Active Session Types ─────────────────────────────────────────────────────

interface SetState {
  reps: string;
  weight: string;
  completed: boolean;
}
interface ExerciseSessionState { sets: SetState[]; }
type SessionLogs = Record<string, ExerciseSessionState>;

function initSessionLogs(workout: Workout): SessionLogs {
  const logs: SessionLogs = {};
  for (const { exerciseId, config } of workout.exercises) {
    logs[exerciseId] = {
      sets: Array.from({ length: config.sets }, () => ({
        reps: String(config.reps),
        weight: "",
        completed: false,
      })),
    };
  }
  return logs;
}

function formatElapsed(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─── Rest Timer Overlay ───────────────────────────────────────────────────────

function RestTimerOverlay({ remaining, total, onSkip }: {
  remaining: number; total: number; onSkip: () => void;
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
      {/* Progress bar */}
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

// ─── Active Set Row ───────────────────────────────────────────────────────────

function ActiveSetRow({ setNum, state, onChange, defaultReps, isPR }: {
  setNum: number; state: SetState; defaultReps: string;
  onChange: (s: SetState) => void;
  isPR?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 py-2 px-3 rounded-xl transition-colors ${
      state.completed ? "bg-[var(--color-success-bg)] border border-[var(--color-success-border)]" : "bg-[var(--color-surface-2)]"
    }`}>
      <button
        onClick={() => onChange({ ...state, completed: !state.completed })}
        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold transition-all ${
          state.completed
            ? "bg-[var(--color-success)] border-[var(--color-success)] text-black"
            : "border-[var(--color-border)] text-transparent"
        }`}
      >✓</button>

      <span className="text-xs font-semibold w-5 shrink-0 text-center" style={{ color: "var(--color-text-muted)" }}>
        {setNum}
      </span>

      <input
        type="number" inputMode="decimal" placeholder="—"
        value={state.weight}
        onChange={(e) => onChange({ ...state, weight: e.target.value })}
        className="input text-xs text-center py-1 px-1 w-14 shrink-0"
      />
      <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>kg</span>

      <input
        type="text" inputMode="numeric"
        placeholder={defaultReps}
        value={state.reps}
        onChange={(e) => onChange({ ...state, reps: e.target.value })}
        className="input text-xs text-center py-1 px-1 w-14 shrink-0"
      />
      <span className="text-[10px] shrink-0" style={{ color: "var(--color-text-muted)" }}>reps</span>

      {isPR && state.completed && (
        <span className="text-[10px] font-bold shrink-0 px-1.5 py-0.5 rounded-md flex items-center gap-0.5"
          style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)", border: "1px solid var(--color-warning-border)" }}>
          <Trophy size={10} />PR
        </span>
      )}
    </div>
  );
}

// ─── Exercise Detail Sheet ────────────────────────────────────────────────────

const ANGLE_LABELS: Record<string, string> = {
  frontMale: "♂ Frontal", sideMale: "♂ Lateral",
  frontFemale: "♀ Frontal", sideFemale: "♀ Lateral",
};

function ExerciseDetailSheet({ ex, onClose }: { ex: Exercise; onClose: () => void }) {
  const availableAngles = getAvailableAngles(ex);
  const [angle, setAngle] = useState<VideoAngle>(availableAngles[0] ?? "frontMale");
  const [videoError, setVideoError] = useState(false);
  const videoUrl = getVideoUrl(ex, angle);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "var(--color-bg)" }}>
      {/* Video hero — full bleed */}
      <div className="relative w-full bg-black shrink-0" style={{ aspectRatio: "1 / 1", maxHeight: "60vw" }}>
        {videoUrl && !videoError ? (
          <video key={videoUrl} src={videoUrl} autoPlay loop muted playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-contain" />
        ) : ex.gifUrl ? (
          <img src={ex.gifUrl} alt={ex.name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <Dumbbell size={64} style={{ color: "var(--color-text-muted)" }} />
          </div>
        )}

        {/* Back button overlaid top-left */}
        <button onClick={onClose}
          className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <ChevronLeft size={20} />
        </button>

        {/* Angle switcher overlaid bottom */}
        {availableAngles.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
            {availableAngles.map((a) => (
              <button key={a}
                onClick={() => { setAngle(a); setVideoError(false); }}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap backdrop-blur-sm transition-colors ${
                  angle === a
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] font-bold"
                    : "text-white"
                }`}
                style={angle !== a ? { background: "rgba(0,0,0,0.45)" } : {}}
              >{ANGLE_LABELS[a] ?? a}</button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-5 space-y-5 pb-12">
        {/* Title + badges */}
        <div>
          <h2 className="text-xl font-bold leading-tight capitalize">{ex.name}</h2>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {ex.difficulty && (
              <span className={`badge ${ex.difficulty === "beginner" ? "badge-green" : ex.difficulty === "intermediate" ? "badge-amber" : "badge-red"}`}>
                {DIFFICULTY_PT[ex.difficulty] ?? ex.difficulty}
              </span>
            )}
            {ex.mechanic && <span className="badge badge-gray">{MECHANIC_PT[ex.mechanic] ?? ex.mechanic}</span>}
            {ex.equipments?.map((eq) => (
              <span key={eq} className="badge badge-gray">{EQUIPMENT_PT[eq] ?? eq}</span>
            ))}
          </div>
        </div>

        {/* Muscles + bodymap */}
        {ex.targetMuscles.length > 0 && (
          <div className="card p-4 space-y-3">
            <p className="section-label">Músculos</p>
            <div className="flex gap-5 items-start">
              <BodyMapImage slug={ex.slug} targetMuscles={ex.targetMuscles} defaultView="auto" size="md" className="shrink-0" />
              <div className="flex flex-col gap-3 pt-2">
                <div>
                  <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>Primários</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ex.targetMuscles.map((m) => (
                      <span key={m} className="badge badge-green font-semibold">{MUSCLE_PT[m] ?? m}</span>
                    ))}
                  </div>
                </div>
                {ex.secondaryMuscles.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>Secundários</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.secondaryMuscles.map((m) => (
                        <span key={m} className="badge badge-gray">{MUSCLE_PT[m] ?? m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {ex.instructions && ex.instructions.length > 0 && (
          <div className="card p-4">
            <p className="section-label mb-3">Como executar</p>
            <ol className="space-y-3">
              {(ex.instructions_pt ?? ex.instructions).map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-[var(--color-primary)] font-bold shrink-0 w-5">{i + 1}.</span>
                  <span className="leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Active Exercise Card ─────────────────────────────────────────────────────

function ActiveExerciseCard({ ex, config, sessionState, onChange, onViewDetail, onSetCompleted }: {
  ex: Exercise; config: ExerciseSet;
  sessionState: ExerciseSessionState;
  onChange: (s: ExerciseSessionState) => void;
  onViewDetail: () => void;
  onSetCompleted: (restSeconds: number) => void;
}) {
  const doneSets = sessionState.sets.filter((s) => s.completed).length;
  const allDone = doneSets === sessionState.sets.length;

  // PR tracking: load best 1RM for this exercise once
  const [prev1RM, setPrev1RM] = useState<number>(0);
  const [progression, setProgression] = useState<{ suggestedIncrease: number; lastWeight: number } | null>(null);
  useEffect(() => {
    const best = getBestEstimated1RM(ex.id);
    setPrev1RM(best?.estimated1RM ?? 0);
    setProgression(getProgressionSuggestion(ex.id));
  }, [ex.id]);

  // Compute PR status for each set
  const prFlags = sessionState.sets.map((s) => {
    if (!s.completed) return false;
    const reps = parseInt(s.reps);
    const weight = parseFloat(s.weight);
    if (isNaN(reps) || isNaN(weight) || reps <= 0 || weight <= 0) return false;
    return epley1RM(weight, reps) > prev1RM;
  });
  const hasPR = prFlags.some(Boolean);

  const markAll = () => {
    const nowAllDone = !allDone;
    onChange({ sets: sessionState.sets.map((s) => ({ ...s, completed: nowAllDone })) });
    if (nowAllDone) onSetCompleted(typeof config.rest === "number" ? config.rest : 60);
  };

  return (
    <div className={`rounded-2xl overflow-hidden border transition-colors ${
      allDone ? "border-[var(--color-success-border)]" : "border-[var(--color-border)]"
    }`} style={{ background: "var(--color-surface)" }}>
      {/* Header — tap to view details */}
      <button
        className="w-full flex items-center gap-3 px-3 py-3 text-left"
        onClick={onViewDetail}
      >
        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
          <ExerciseMedia exercise={ex} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate capitalize" style={{ color: "var(--color-text)" }}>
            {ex.name}
            {hasPR && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-flex items-center gap-0.5"
              style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}><Trophy size={9} />PR!</span>}
          </p>
          <p className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: allDone ? "var(--color-success-text)" : "var(--color-text-muted)" }}>
            {allDone ? "✓ Concluído" : `${doneSets}/${config.sets} séries`} · alvo {config.reps} reps
            {progression && !allDone && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)" }}>
                ↑ +{progression.suggestedIncrease}kg
              </span>
            )}
          </p>
        </div>
        <span className="text-xs shrink-0 px-2 py-1 rounded-lg mr-1 flex items-center"
          style={{ color: "var(--color-text-muted)", background: "var(--color-surface-2)" }}>
          <Info size={13} />
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); markAll(); }}
          className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors shrink-0 ${
            allDone
              ? "bg-[var(--color-success-bg)] border-[var(--color-success-border)] text-[var(--color-success-text)]"
              : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-success-border)]"
          }`}
        >
          {allDone ? "✓ Feito" : "Marcar todas"}
        </button>
      </button>

      {/* Sets */}
      <div className="px-3 pb-3 space-y-1.5 border-t pt-2.5" style={{ borderColor: "var(--color-border)" }}>
        {sessionState.sets.map((setS, i) => (
          <ActiveSetRow
            key={i} setNum={i + 1} state={setS}
            defaultReps={String(config.reps)}
            isPR={prFlags[i]}
            onChange={(ns) => {
              const wasCompleted = setS.completed;
              const nowCompleted = ns.completed;
              const newSets = [...sessionState.sets];
              newSets[i] = ns;
              onChange({ sets: newSets });
              if (!wasCompleted && nowCompleted) {
                onSetCompleted(typeof config.rest === "number" ? config.rest : 60);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Finish Modal ─────────────────────────────────────────────────────────────

function FinishModal({
  workout, sessionLogs, exerciseMap, startedAt, elapsed,
  onSave, onCancel,
}: {
  workout: Workout;
  sessionLogs: SessionLogs;
  exerciseMap: Map<string, Exercise>;
  startedAt: string;
  elapsed: number;
  onSave: (rating: number | null, rir: number | null, notes: string) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [rir, setRir] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const completedExercises = Object.entries(sessionLogs).filter(
    ([, s]) => s.sets.some((st) => st.completed)
  );
  const totalSets = Object.values(sessionLogs).reduce(
    (sum, s) => sum + s.sets.filter((st) => st.completed).length, 0
  );
  const muscles = useMemo(() => {
    const set = new Set<string>();
    for (const [exId] of completedExercises) {
      const ex = exerciseMap.get(exId);
      if (ex) {
        ex.targetMuscles.forEach((m) => set.add(m));
        ex.secondaryMuscles.slice(0, 2).forEach((m) => set.add(m));
      }
    }
    return Array.from(set).slice(0, 12);
  }, [completedExercises, exerciseMap]);

  const durationMin = Math.max(1, Math.round(elapsed / 60));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)" }}>
      <div className="rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: "var(--color-surface)" }}>
        <div className="p-5 space-y-5">
          {/* Title */}
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <PartyPopper size={32} style={{ color: "var(--color-primary)" }} />
            </div>
            <h2 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>Treino concluído!</h2>
            <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>{workout.name}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Duração", value: formatElapsed(elapsed) },
              { label: "Exercícios", value: String(completedExercises.length) },
              { label: "Séries", value: String(totalSets) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl p-3 text-center"
                style={{ background: "var(--color-surface-2)" }}>
                <p className="text-lg font-bold" style={{ color: "var(--color-primary)" }}>{value}</p>
                <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "var(--color-text-muted)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Muscles */}
          {muscles.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-secondary)" }}>
                Músculos trabalhados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {muscles.map((m) => (
                  <span key={m} className="badge badge-gray text-[11px] capitalize">{m}</span>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--color-text-secondary)" }}>
              Como foi o treino?
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(rating === n ? null : n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                    rating !== null && n <= rating
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
            {rating && (
              <p className="text-xs text-center mt-1" style={{ color: "var(--color-text-muted)" }}>
                {rating <= 2 ? "Pesado, mas valeu!" : rating === 3 ? "Treino sólido" : rating === 4 ? "Ótimo treino!" : "Treino incrível!"}
              </p>
            )}
          </div>

          {/* RiR — Reps in Reserve */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--color-text-secondary)" }}>
              Reps que sobraram no tank?
            </p>
            <p className="text-[11px] mb-2" style={{ color: "var(--color-text-muted)" }}>
              0 = fui ao limite · 5+ = muito fácil
            </p>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRir(rir === n ? null : n)}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all border ${
                    rir === n
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                  style={{
                    background: rir === n ? "var(--color-primary-soft)" : "var(--color-surface-2)",
                  }}>
                  {n === 5 ? "5+" : n}
                </button>
              ))}
            </div>
            {rir !== null && (
              <p className="text-xs text-center mt-1" style={{ color: "var(--color-text-muted)" }}>
                {rir === 0 ? "Foi no limite!" : rir <= 2 ? "Bom esforço" : rir <= 4 ? "Podia puxar mais" : "Muito confortável"}
              </p>
            )}
          </div>

          {/* Notes */}
          <textarea
            placeholder="Observações (opcional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input text-sm py-2.5 w-full resize-none"
            style={{ background: "var(--color-surface-2)" }}
          />

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="btn btn-secondary flex-1">
              Continuar
            </button>
            <button onClick={() => onSave(rating, rir, notes)}
              className="btn btn-primary flex-1 font-semibold">
              Salvar treino ✓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Mode: Exercise Row ──────────────────────────────────────────────────

function WorkoutExerciseRow({
  ex, config, idx, total, risky,
  isInSuperset, isStartOfSuperset,
  onRemove, onMove, onUpdate, onToggleSuperset,
}: {
  ex: Exercise; config: ExerciseSet; idx: number; total: number; risky: boolean;
  isInSuperset?: boolean; isStartOfSuperset?: boolean;
  onRemove: () => void; onMove: (dir: -1 | 1) => void; onUpdate: (p: Partial<ExerciseSet>) => void;
  onToggleSuperset?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-2xl overflow-hidden transition-colors ${
      risky ? "border border-[var(--color-danger-border)]" :
      isInSuperset ? "border-2 border-[var(--color-primary)]" :
      "border border-[var(--color-border)]"
    }`}
      style={{ background: "var(--color-surface)" }}>
      <div className="flex items-center gap-3 px-3 py-3">
        <Link href={`/exercises/${ex.slug}`} className="relative shrink-0 block w-12 h-12 rounded-xl overflow-hidden">
          <ExerciseMedia exercise={ex} className="w-full h-full rounded-xl" />
          {risky && (
            <span className="absolute top-0.5 right-0.5 text-[8px] bg-[var(--color-danger)] text-white rounded px-0.5 z-10">⚠</span>
          )}
        </Link>

        <button className="flex-1 min-w-0 text-left" onClick={() => setExpanded((v) => !v)}>
          <p className="font-semibold text-sm truncate capitalize" style={{ color: "var(--color-text)" }}>{ex.name}</p>
          <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {ex.targetMuscles.slice(0, 3).map(m => MUSCLE_PT[m] ?? m).join(", ")}
          </p>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => onUpdate({ sets: Math.max(1, config.sets - 1) })}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold leading-none transition-colors hover:bg-[var(--color-surface-2)]"
            style={{ color: "var(--color-text-muted)" }}>−</button>
          <div className="text-center min-w-[3rem]">
            <p className="text-sm font-bold" style={{ color: "var(--color-primary)" }}>{config.sets}×{config.reps}</p>
            <p className="text-[9px] uppercase tracking-wide" style={{ color: "var(--color-text-muted)" }}>séries</p>
          </div>
          <button onClick={() => onUpdate({ sets: Math.min(10, config.sets + 1) })}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold leading-none transition-colors hover:bg-[var(--color-surface-2)]"
            style={{ color: "var(--color-text-muted)" }}>+</button>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0 ml-1">
          <button onClick={() => onMove(-1)} disabled={idx === 0}
            className="text-[var(--color-text-muted)] disabled:opacity-20 text-[10px] leading-none hover:text-[var(--color-text)]">▲</button>
          <button onClick={() => onMove(1)} disabled={idx === total - 1}
            className="text-[var(--color-text-muted)] disabled:opacity-20 text-[10px] leading-none hover:text-[var(--color-text)]">▼</button>
        </div>
        <button onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-full text-lg leading-none transition-colors hover:bg-[var(--color-danger-bg)] hover:text-[var(--color-danger)] shrink-0"
          style={{ color: "var(--color-text-muted)" }}>×</button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 space-y-2.5 border-t" style={{ borderColor: "var(--color-border)" }}>
          <div className="flex flex-wrap gap-3 pt-2.5">
            <label className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>Séries</span>
              <input type="number" min={1} max={10} value={config.sets}
                onChange={(e) => onUpdate({ sets: +e.target.value })}
                className="input w-12 px-1.5 py-1 text-center text-xs" />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>Repetições</span>
              <input type="text" value={config.reps}
                onChange={(e) => onUpdate({ reps: e.target.value })}
                className="input w-16 px-1.5 py-1 text-center text-xs" placeholder="12" />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <span style={{ color: "var(--color-text-secondary)" }}>Descanso</span>
              <input type="number" min={0} step={15} value={config.rest}
                onChange={(e) => onUpdate({ rest: +e.target.value })}
                className="input w-16 px-1.5 py-1 text-center text-xs" />
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>s</span>
            </label>
          </div>
          <input type="text" value={config.notes ?? ""}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Observações (ex: manter costas retas)..."
            className="input text-xs py-1.5 w-full"
            style={{ background: "var(--color-surface-2)" }} />
          <Link href={`/exercises/${ex.slug}`}
            className="inline-block text-xs hover:underline"
            style={{ color: "var(--color-primary)" }}>
            Ver detalhes do exercício →
          </Link>
          {onToggleSuperset && (
            <button
              onClick={onToggleSuperset}
              className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-xl border transition-colors"
              style={{
                borderColor: isInSuperset ? "var(--color-primary)" : "var(--color-border)",
                color: isInSuperset ? "var(--color-primary)" : "var(--color-text-muted)",
                background: isInSuperset ? "var(--color-primary-bg, var(--color-surface-2))" : "transparent",
              }}
            >
              {isInSuperset ? <Link2Off size={12} /> : <Link2 size={12} />}
              {isInSuperset ? "Remover superset" : "Superset com próximo"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Exercise Picker Modal ────────────────────────────────────────────────────

function ExercisePicker({
  allExercises, search, onSearchChange,
  hideRisky, onHideRiskyToggle,
  respectEnv, onRespectEnvToggle,
  hasEnvFilter, hasInjuries,
  results, onAdd, onClose,
}: {
  allExercises: Exercise[]; search: string; onSearchChange: (s: string) => void;
  hideRisky: boolean; onHideRiskyToggle: () => void;
  respectEnv: boolean; onRespectEnvToggle: () => void;
  hasEnvFilter: boolean; hasInjuries: boolean;
  results: Exercise[]; onAdd: (ex: Exercise) => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="mt-auto rounded-t-3xl flex flex-col overflow-hidden max-h-[85vh]"
        style={{ background: "var(--color-surface)" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}>
          <input autoFocus type="search" placeholder="Buscar exercício..."
            value={search} onChange={(e) => onSearchChange(e.target.value)}
            className="input flex-1" />
          <button onClick={onClose} className="btn btn-sm shrink-0"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text)" }}>
            Fechar
          </button>
        </div>

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
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkoutEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get("id") ?? "";
  const { workouts, updateWorkout } = useWorkouts();
  const { injuredMuscleNames, isRisky } = useInjuries();
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [hideRisky, setHideRisky] = useState(false);
  const [respectEnv, setRespectEnv] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);

  // ── Session mode state ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<"edit" | "session">("edit");
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionLogs, setSessionLogs] = useState<SessionLogs>({});
  const [elapsed, setElapsed] = useState(0);
  const [showFinish, setShowFinish] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rest timer
  const [restTimer, setRestTimer] = useState<{ remaining: number; total: number } | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { getExercises().then(setAllExercises); }, []);

  useEffect(() => {
    const found = workouts.find((w) => w.id === id);
    if (found) setWorkout(found);
  }, [workouts, id]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

  const searchResults = useMemo(() =>
    filterExercises(allExercises, {
      search,
      environment: workout && respectEnv && workout.environment !== "any" ? workout.environment : undefined,
      injuredMuscles: injuredMuscleNames,
      hideRisky,
    }),
    [allExercises, search, workout, respectEnv, injuredMuscleNames, hideRisky]
  );

  const exerciseMap = useMemo(
    () => new Map(allExercises.map((e) => [e.id, e])),
    [allExercises]
  );

  // ── Edit mode handlers ──────────────────────────────────────────────────────

  const addExercise = useCallback((ex: Exercise) => {
    setWorkout((prev) => {
      if (!prev || prev.exercises.find((we) => we.exerciseId === ex.id)) return prev;
      const updated: Workout = { ...prev, exercises: [...prev.exercises, { exerciseId: ex.id, config: { ...DEFAULT_SET } }] };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  const removeExercise = useCallback((exerciseId: string) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      const updated: Workout = { ...prev, exercises: prev.exercises.filter((we) => we.exerciseId !== exerciseId) };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  const updateConfig = useCallback((exerciseId: string, patch: Partial<ExerciseSet>) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      const updated: Workout = {
        ...prev,
        exercises: prev.exercises.map((we) =>
          we.exerciseId === exerciseId ? { ...we, config: { ...we.config, ...patch } } : we
        ),
      };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  const moveExercise = useCallback((exerciseId: string, direction: -1 | 1) => {
    setWorkout((prev) => {
      if (!prev) return prev;
      const idx = prev.exercises.findIndex((we) => we.exerciseId === exerciseId);
      if (idx < 0) return prev;
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= prev.exercises.length) return prev;
      const items = [...prev.exercises];
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      const updated: Workout = { ...prev, exercises: items };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  const toggleSuperset = useCallback((idx: number) => {
    setWorkout((prev) => {
      if (!prev || idx >= prev.exercises.length - 1) return prev;
      const items = [...prev.exercises];
      const a = items[idx];
      const b = items[idx + 1];
      let updatedItems: typeof items;
      if (a.supersetGroupId && a.supersetGroupId === b.supersetGroupId) {
        // remove pairing
        updatedItems = items.map((we, i) =>
          i === idx || i === idx + 1 ? { ...we, supersetGroupId: undefined } : we
        );
      } else {
        const groupId = generateId();
        updatedItems = items.map((we, i) =>
          i === idx || i === idx + 1 ? { ...we, supersetGroupId: groupId } : we
        );
      }
      const updated: Workout = { ...prev, exercises: updatedItems };
      updateWorkout(updated);
      return updated;
    });
  }, [updateWorkout]);

  // ── Session mode handlers ───────────────────────────────────────────────────

  const handleStartSession = useCallback(() => {
    if (!workout) return;
    setSessionLogs(initSessionLogs(workout));
    setSessionStartedAt(nowISO());
    setElapsed(0);
    setMode("session");
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }, [workout]);

  const handleExitSession = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (restTimerRef.current) { clearInterval(restTimerRef.current); restTimerRef.current = null; }
    setMode("edit");
    setSessionLogs({});
    setSessionStartedAt(null);
    setElapsed(0);
    setShowFinish(false);
    setRestTimer(null);
  }, []);

  const startRestTimer = useCallback((seconds: number) => {
    if (restTimerRef.current) clearInterval(restTimerRef.current);
    setRestTimer({ remaining: seconds, total: seconds });
    restTimerRef.current = setInterval(() => {
      setRestTimer((prev) => {
        if (!prev || prev.remaining <= 1) {
          clearInterval(restTimerRef.current!);
          restTimerRef.current = null;
          // Vibrate when done (mobile)
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([200, 100, 200]);
          }
          return null;
        }
        return { ...prev, remaining: prev.remaining - 1 };
      });
    }, 1000);
  }, []);

  const skipRestTimer = useCallback(() => {
    if (restTimerRef.current) { clearInterval(restTimerRef.current); restTimerRef.current = null; }
    setRestTimer(null);
  }, []);

  const handleSaveSession = useCallback((rating: number | null, rir: number | null, notes: string) => {
    if (!workout || !sessionStartedAt) return;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const exerciseLogs: ExerciseLog[] = Object.entries(sessionLogs)
      .filter(([, state]) => state.sets.some((s) => s.completed))
      .map(([exerciseId, state]) => ({
        exerciseId,
        sets: state.sets.map<SetLog>((s) => ({
          reps: isNaN(Number(s.reps)) ? s.reps : Number(s.reps),
          weight: s.weight ? parseFloat(s.weight) : undefined,
          completed: s.completed,
        })),
      }));

    const session: WorkoutSession = {
      id: generateId(),
      workoutId: workout.id,
      workoutName: workout.name,
      date: new Date().toISOString().slice(0, 10),
      startedAt: sessionStartedAt,
      finishedAt: nowISO(),
      durationMinutes: Math.max(1, Math.round(elapsed / 60)),
      exercises: exerciseLogs,
      rating: (rating as WorkoutSession["rating"]) ?? undefined,
      rir: rir ?? undefined,
      notes: notes || undefined,
    };

    saveSession(session);
    router.push("/progress");
  }, [workout, sessionStartedAt, sessionLogs, elapsed, router]);

  const updateSetLog = useCallback((exerciseId: string, newState: ExerciseSessionState) => {
    setSessionLogs((prev) => ({ ...prev, [exerciseId]: newState }));
  }, []);

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!workout) {
    return <div className="text-center py-20" style={{ color: "var(--color-text-muted)" }}>Treino não encontrado</div>;
  }

  const riskyCount = workout.exercises.filter(({ exerciseId }) => {
    const ex = exerciseMap.get(exerciseId);
    return ex ? isRisky(ex) : false;
  }).length;

  const completedInSession = mode === "session"
    ? Object.values(sessionLogs).filter((s) => s.sets.some((st) => st.completed)).length
    : 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {detailEx && (
        <ExerciseDetailSheet ex={detailEx} onClose={() => setDetailEx(null)} />
      )}

      {showPicker && (
        <ExercisePicker
          allExercises={allExercises} search={search} onSearchChange={setSearch}
          hideRisky={hideRisky} onHideRiskyToggle={() => setHideRisky((v) => !v)}
          respectEnv={respectEnv} onRespectEnvToggle={() => setRespectEnv((v) => !v)}
          hasEnvFilter={workout.environment !== "any"}
          hasInjuries={injuredMuscleNames.length > 0}
          results={searchResults} onAdd={addExercise} onClose={() => setShowPicker(false)}
        />
      )}

      {showFinish && sessionStartedAt && (
        <FinishModal
          workout={workout} sessionLogs={sessionLogs}
          exerciseMap={exerciseMap} startedAt={sessionStartedAt}
          elapsed={elapsed} onSave={handleSaveSession} onCancel={() => setShowFinish(false)}
        />
      )}

      {/* ── Hero + Content ──────────────────────────────────────────────────── */}
      <div className="-mx-4 -mt-5">

        {/* Hero banner — design system gradients, no video */}
        <div className="relative overflow-hidden"
          style={{ background: "linear-gradient(160deg, var(--color-primary-soft-strong) 0%, var(--color-surface-2) 100%)", borderBottom: "1px solid var(--color-border)" }}>

          {/* Back button */}
          {mode === "edit" ? (
            <Link href="/workouts"
              className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center shadow"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              <ChevronLeft size={20} />
            </Link>
          ) : (
            <button onClick={handleExitSession}
              className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center shadow"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}>
              <ChevronLeft size={20} />
            </button>
          )}

          <div className="px-4 pt-14 pb-5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--color-text-muted)" }}>
                  Treino
                </p>
                <h1 className="text-2xl font-bold leading-tight truncate" style={{ color: "var(--color-text)" }}>{workout.name}</h1>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="badge badge-gray flex items-center gap-1">
                    {ENV_ICON[workout.environment]}{ENV_LABEL[workout.environment]}
                  </span>
                  <span className="badge badge-gray">
                    {workout.exercises.length} exercício{workout.exercises.length !== 1 ? "s" : ""}
                  </span>
                  {riskyCount > 0 && (
                    <span className="badge badge-red">⚠ {riskyCount} arriscado{riskyCount !== 1 ? "s" : ""}</span>
                  )}
                  {mode === "session" && (
                    <span className="badge flex items-center gap-1" style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)", border: "1px solid var(--color-primary-border)" }}>
                      <Timer size={11} /><span className="font-mono">{formatElapsed(elapsed)}</span>
                    </span>
                  )}
                </div>
              </div>
              {mode === "edit" && workout.exercises.length > 0 && (
                <button onClick={handleStartSession} className="btn btn-primary shrink-0 flex items-center gap-1.5">
                  <Play size={14} />Iniciar
                </button>
              )}
            </div>

            {/* Session progress bar */}
            {mode === "session" && workout.exercises.length > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                  <span>{completedInSession}/{workout.exercises.length} exercícios</span>
                  <span className="font-semibold" style={{ color: "var(--color-primary)" }}>
                    {Math.round((completedInSession / workout.exercises.length) * 100)}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ background: "var(--color-success)", width: `${(completedInSession / workout.exercises.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pt-5 space-y-5 pb-32">
          {/* Exercise list */}
          {workout.exercises.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="flex justify-center mb-3"><Dumbbell size={40} style={{ color: "var(--color-text-muted)", opacity: 0.3 }} /></div>
              <p className="font-semibold" style={{ color: "var(--color-text)" }}>Nenhum exercício</p>
              <p className="text-sm mt-1 mb-4" style={{ color: "var(--color-text-muted)" }}>Adicione exercícios ao seu treino</p>
              <button onClick={() => setShowPicker(true)} className="btn btn-primary">+ Adicionar exercício</button>
            </div>
          ) : mode === "edit" ? (
            <div className="space-y-2">
              {workout.exercises.map(({ exerciseId, config, supersetGroupId }, idx) => {
                const ex = exerciseMap.get(exerciseId);
                if (!ex) return null;
                const nextEx = workout.exercises[idx + 1];
                const isStart = !!(supersetGroupId && nextEx?.supersetGroupId === supersetGroupId);
                const isMember = !!(supersetGroupId && (
                  isStart ||
                  (idx > 0 && workout.exercises[idx - 1]?.supersetGroupId === supersetGroupId)
                ));
                return (
                  <div key={exerciseId}>
                    <WorkoutExerciseRow
                      ex={ex} config={config} idx={idx} total={workout.exercises.length}
                      risky={isRisky(ex)}
                      isInSuperset={isMember}
                      isStartOfSuperset={isStart}
                      onRemove={() => removeExercise(exerciseId)}
                      onMove={(dir) => moveExercise(exerciseId, dir)}
                      onUpdate={(p) => updateConfig(exerciseId, p)}
                      onToggleSuperset={idx < workout.exercises.length - 1 ? () => toggleSuperset(idx) : undefined}
                    />
                    {isStart && (
                      <div className="flex items-center gap-2 py-1 px-3">
                        <div className="flex-1 h-px" style={{ background: "var(--color-primary)", opacity: 0.3 }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ color: "var(--color-primary)", background: "var(--color-primary-soft)" }}>
                          superset
                        </span>
                        <div className="flex-1 h-px" style={{ background: "var(--color-primary)", opacity: 0.3 }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {workout.exercises.map(({ exerciseId, config, supersetGroupId }, idx) => {
                const ex = exerciseMap.get(exerciseId);
                const state = sessionLogs[exerciseId];
                if (!ex || !state) return null;
                const nextEx = workout.exercises[idx + 1];
                const isFirstInSuperset = !!(supersetGroupId && nextEx?.supersetGroupId === supersetGroupId);
                const prevEx = workout.exercises[idx - 1];
                const isSecondInSuperset = !!(supersetGroupId && prevEx?.supersetGroupId === supersetGroupId);
                const restOverride = isFirstInSuperset ? 15 : undefined;
                return (
                  <div key={exerciseId}>
                    {isSecondInSuperset && (
                      <div className="flex items-center gap-2 py-1 px-1">
                        <div className="flex-1 h-px" style={{ background: "var(--color-primary)", opacity: 0.3 }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                          style={{ color: "var(--color-primary)", background: "var(--color-primary-soft)" }}>
                          superset
                        </span>
                        <div className="flex-1 h-px" style={{ background: "var(--color-primary)", opacity: 0.3 }} />
                      </div>
                    )}
                    <ActiveExerciseCard
                      ex={ex} config={config}
                      sessionState={state}
                      onChange={(ns) => updateSetLog(exerciseId, ns)}
                      onViewDetail={() => setDetailEx(ex)}
                      onSetCompleted={(secs) => startRestTimer(restOverride ?? secs)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Edit mode: add more exercises */}
          {mode === "edit" && workout.exercises.length > 0 && (
            <button
              onClick={() => setShowPicker(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold transition-colors border border-dashed hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
            >
              + Adicionar exercício
            </button>
          )}
        </div>
      </div>

      {/* Sticky bottom bar — session mode only */}
      {mode === "session" && (
        <div
          className="fixed left-0 right-0 z-40 flex justify-center px-4 pt-3 pb-4"
          style={{
            bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
            background: "linear-gradient(to top, var(--color-bg) 85%, transparent)",
          }}
        >
          <div className="w-full max-w-3xl space-y-2">
            {/* Rest timer (shown above finish button) */}
            {restTimer && (
              <RestTimerOverlay
                remaining={restTimer.remaining}
                total={restTimer.total}
                onSkip={skipRestTimer}
              />
            )}
            <button
              onClick={() => setShowFinish(true)}
              disabled={completedInSession === 0}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: completedInSession > 0 ? "var(--color-primary)" : "var(--color-surface-2)",
                color: completedInSession > 0 ? "var(--color-primary-text)" : "var(--color-text-muted)",
              }}
            >
              {completedInSession === 0
                ? "Complete ao menos 1 exercício"
                : `✓ Finalizar treino (${completedInSession}/${workout.exercises.length})`}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Compact row for an exercise in the workout list */
