"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ThumbsUp, ThumbsDown, Ban, Trophy, Dumbbell, ChevronLeft } from "lucide-react";
import { getExercises } from "@/lib/data";
import { useInjuries } from "@/hooks/useInjuries";
import { useRouter } from "next/navigation";
import { DIFFICULTY_PT, EQUIPMENT_PT, MECHANIC_PT, MUSCLE_PT } from "@/lib/translations";
import BodyMapImage from "@/components/BodyMapImage";
import { getExercisePreference, setExercisePreference } from "@/lib/storage";
import type { Exercise } from "@/lib/types";
import type { ExercisePreferenceState } from "@/lib/types";

interface SetRow { id: number; weight: string; reps: string; done: boolean; }
const DEFAULT_SETS = 3;
const DEFAULT_REPS = "12";
const REST_SECONDS = 60;

function RestTimer({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(REST_SECONDS);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) { clearInterval(ref.current!); onDone(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current!);
  }, [onDone]);

  const pct = (seconds / REST_SECONDS) * 100;
  const r = 24;
  const circ = 2 * Math.PI * r;

  return (
    <div className="card p-4 border-[var(--color-primary-border)] flex items-center gap-4">
      <div className="relative w-14 h-14 shrink-0">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} stroke="var(--color-surface-2)" strokeWidth="4" fill="none" />
          <circle cx="28" cy="28" r={r} stroke="var(--color-primary)" strokeWidth="4" fill="none"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round" className="transition-all duration-1000"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-[var(--color-primary)]">
          {seconds}s
        </span>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-[var(--color-primary)]">Descanso</p>
        <p className="text-xs text-[var(--color-text-muted)]">Próxima série em {seconds} segundos</p>
      </div>
      <button onClick={onDone} className="btn btn-primary btn-sm">Pular</button>
    </div>
  );
}

export default function ExerciseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [videoAngle, setVideoAngle] = useState<"frontMale" | "sideMale" | "frontFemale" | "sideFemale">("frontMale");
  const [videoError, setVideoError] = useState(false);
  const { isRisky, injuredMuscleNames } = useInjuries();

  const initSets = (): SetRow[] =>
    Array.from({ length: DEFAULT_SETS }, (_, i) => ({ id: i + 1, weight: "", reps: DEFAULT_REPS, done: false }));
  const [sets, setSets] = useState<SetRow[]>(initSets);
  const [restingAfter, setRestingAfter] = useState<number | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [preference, setPreference] = useState<ExercisePreferenceState>("default");

  useEffect(() => {
    getExercises().then((exs) => {
      const found = exs.find((e) => e.slug === slug || e.id === slug);
      setExercise(found ?? null);
      if (found) {
        setPreference(getExercisePreference(found.id));
        if (found.videoUrls) {
          const angles = ["frontMale", "sideMale", "frontFemale", "sideFemale"] as const;
          const first = angles.find((a) => found.videoUrls?.[a]);
          if (first) setVideoAngle(first);
        }
      }
    });
  }, [slug]);

  useEffect(() => {
    setSets(initSets());
    setRestingAfter(null);
    setAllDone(false);
  }, [slug]);

  if (!exercise) {
    return (
      <div className="flex items-center justify-center min-h-64 text-[var(--color-text-muted)]">
        <div className="text-center">
          <Dumbbell size={36} className="mx-auto mb-2 opacity-40" />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  const risky = isRisky(exercise);
  const riskyMuscles = injuredMuscleNames.filter((m) =>
    [...exercise.targetMuscles, ...exercise.secondaryMuscles].map((s) => s.toLowerCase()).includes(m.toLowerCase())
  );

  const allAngles = (["frontMale", "sideMale", "frontFemale", "sideFemale"] as const).filter((a) => exercise.videoUrls?.[a]);
  const videoUrl = exercise.videoUrls?.[videoAngle] ?? allAngles.map((a) => exercise.videoUrls?.[a]).find(Boolean);

  const angleLabels: Record<string, string> = {
    frontMale: "♂ Frontal", sideMale: "♂ Lateral",
    frontFemale: "♀ Frontal", sideFemale: "♀ Lateral",
  };
  const diffPt = exercise.difficulty ? (DIFFICULTY_PT[exercise.difficulty] ?? exercise.difficulty) : null;

  const toggleSet = (id: number) => {
    setSets((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
      const justDone = !prev.find((s) => s.id === id)?.done;
      if (justDone) {
        if (updated.find((s) => !s.done)) setRestingAfter(id);
        else setAllDone(true);
      }
      return updated;
    });
  };
  const updateSet = (id: number, field: "weight" | "reps", value: string) =>
    setSets((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  const addSet = () => { setSets((prev) => [...prev, { id: Date.now(), weight: "", reps: DEFAULT_REPS, done: false }]); setAllDone(false); };
  const resetSets = () => { setSets(initSets()); setRestingAfter(null); setAllDone(false); };
  const doneSetsCount = sets.filter((s) => s.done).length;

  return (
    <div className="-mx-4 -mt-5">
      {/* ── Video Hero ─────────────────────────────────────────────────── */}
      <div className="relative w-full bg-black" style={{ aspectRatio: "1 / 1", maxHeight: "60vw" }}>
        {videoUrl && !videoError ? (
          <video key={videoUrl} src={videoUrl} autoPlay loop muted playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-contain" />
        ) : exercise.gifUrl ? (
          <img src={exercise.gifUrl} alt={exercise.name} className="w-full h-full object-contain" />
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-20">
            <Dumbbell size={64} style={{ color: "var(--color-text-muted)" }} />
          </div>
        )}

        {/* Back button overlaid top-left */}
        <button
          onClick={() => router.back()}
          className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-sm"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <ChevronLeft size={20} />
        </button>

        {/* Angle switcher overlaid bottom */}
        {allAngles.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 px-4">
            {allAngles.map((angle) => (
              <button key={angle}
                onClick={() => { setVideoAngle(angle); setVideoError(false); }}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap backdrop-blur-sm transition-colors ${
                  videoAngle === angle
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] font-bold"
                    : "text-white"
                }`}
                style={videoAngle !== angle ? { background: "rgba(0,0,0,0.45)" } : {}}
              >{angleLabels[angle]}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 space-y-5">

        {/* Title + badges */}
        <div>
          <h1 className="text-2xl font-bold leading-tight capitalize">{exercise.name}</h1>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {diffPt && (
              <span className={`badge ${exercise.difficulty === "beginner" ? "badge-green" : exercise.difficulty === "intermediate" ? "badge-amber" : "badge-red"}`}>
                {diffPt}
              </span>
            )}
            {exercise.mechanic && <span className="badge badge-gray">{MECHANIC_PT[exercise.mechanic] ?? exercise.mechanic}</span>}
            {exercise.equipments.length > 0 && exercise.equipments.map((eq) => (
              <span key={eq} className="badge badge-gray">{EQUIPMENT_PT[eq] ?? eq}</span>
            ))}
            {risky && <span className="badge badge-red">⚠ Risco: {riskyMuscles.join(", ")}</span>}
          </div>
        </div>

        {/* Preference buttons */}
        <div className="card p-3">
          <p className="text-[10px] uppercase tracking-wide mb-2" style={{ color: "var(--color-text-muted)" }}>
            Preferência no gerador
          </p>
          <div className="flex gap-2">
            {([
              { state: "more" as const,     Icon: ThumbsUp,   label: "Mais",    desc: "Priorizar" },
              { state: "less" as const,     Icon: ThumbsDown, label: "Menos",   desc: "Reduzir" },
              { state: "excluded" as const, Icon: Ban,        label: "Excluir", desc: "Nunca sugerir" },
            ]).map(({ state, Icon, label }) => {
              const active = preference === state;
              return (
                <button key={state}
                  onClick={() => {
                    const next: ExercisePreferenceState = active ? "default" : state;
                    setExercisePreference(exercise!.id, next);
                    setPreference(next);
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center justify-center gap-1.5 ${
                    active
                      ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                  style={{ background: active ? "var(--color-primary-soft)" : "var(--color-surface-2)" }}>
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
          {preference !== "default" && (
            <p className="text-[10px] text-[var(--color-primary)] mt-1.5 text-center">
              {preference === "more" ? "Priorizado no gerador" : preference === "less" ? "Reduzido no gerador" : "Nunca será sugerido"}
            </p>
          )}
        </div>

        {/* Muscles + bodymap */}
        {(exercise.targetMuscles.length > 0 || exercise.secondaryMuscles.length > 0) && (
          <div className="card p-4 space-y-3">
            <p className="section-label">Músculos</p>
            <div className="flex gap-6 items-start">
              <BodyMapImage
                slug={exercise.slug}
                targetMuscles={exercise.targetMuscles}
                defaultView="auto"
                size="md"
                className="shrink-0"
              />
              <div className="flex flex-col gap-3 pt-2">
                {exercise.targetMuscles.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>Primários</p>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.targetMuscles.map((m) => (
                        <span key={m} className={`badge font-semibold ${injuredMuscleNames.includes(m.toLowerCase()) ? "badge-red" : "badge-green"}`}>{MUSCLE_PT[m] ?? m}</span>
                      ))}
                    </div>
                  </div>
                )}
                {exercise.secondaryMuscles.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wide mb-1.5" style={{ color: "var(--color-text-muted)" }}>Secundários</p>
                    <div className="flex flex-wrap gap-1.5">
                      {exercise.secondaryMuscles.map((m) => (
                        <span key={m} className={`badge ${injuredMuscleNames.includes(m.toLowerCase()) ? "badge-red" : "badge-gray"}`}>{MUSCLE_PT[m] ?? m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {exercise.instructions.length > 0 && (
          <div className="card p-4">
            <p className="section-label mb-3">Como executar</p>
            <ol className="space-y-3">
              {exercise.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="text-[var(--color-primary)] font-bold shrink-0 w-5">{i + 1}.</span>
                  <span className="text-[var(--color-text-secondary)] leading-relaxed">
                    {step.replace(/^Step:\d+\s*/i, "")}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Sets tracker */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-label">
              Séries{doneSetsCount > 0 && ` — ${doneSetsCount}/${sets.length} feitas`}
            </p>
            {doneSetsCount > 0 && (
              <button onClick={resetSets} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                Reiniciar
              </button>
            )}
          </div>

          {allDone && (
            <div className="bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] rounded-xl p-3 text-center flex items-center justify-center gap-2">
              <Trophy size={16} className="text-[var(--color-primary)]" />
              <p className="text-[var(--color-primary)] font-semibold">Exercício concluído!</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Todas as {sets.length} séries feitas</p>
            </div>
          )}

          {restingAfter !== null && !allDone && <RestTimer onDone={() => setRestingAfter(null)} />}

          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <span className="w-7 shrink-0" />
              <span className="text-xs text-[var(--color-text-muted)] w-8 text-center">#</span>
              <span className="text-xs text-[var(--color-text-muted)] flex-1 text-center">Peso (kg)</span>
              <span className="text-xs text-[var(--color-text-muted)] flex-1 text-center">Repetições</span>
              <span className="w-8 shrink-0" />
            </div>

            {sets.map((set, idx) => (
              <div key={set.id} className={`flex items-center gap-2 rounded-xl px-1 py-1.5 transition-all ${set.done ? "opacity-50" : ""}`}>
                <button
                  onClick={() => toggleSet(set.id)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    set.done
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  {set.done && <span className="text-xs font-bold">✓</span>}
                </button>
                <span className="text-xs text-[var(--color-text-muted)] w-8 text-center">{idx + 1}</span>
                <input type="number" inputMode="decimal" placeholder="—"
                  value={set.weight} disabled={set.done}
                  onChange={(e) => updateSet(set.id, "weight", e.target.value)}
                  className="input flex-1 text-center py-2 disabled:opacity-40 disabled:cursor-default"
                />
                <input type="number" inputMode="numeric" placeholder="12"
                  value={set.reps} disabled={set.done}
                  onChange={(e) => updateSet(set.id, "reps", e.target.value)}
                  className="input flex-1 text-center py-2 disabled:opacity-40 disabled:cursor-default"
                />
                <button onClick={() => setSets((prev) => prev.filter((s) => s.id !== set.id))}
                  className="w-8 h-8 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors text-lg">
                  ×
                </button>
              </div>
            ))}
          </div>

          <button onClick={addSet}
            className="w-full border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] rounded-xl py-2.5 text-sm transition-colors">
            + Adicionar série
          </button>
        </div>

        {/* External link */}
        {exercise.musclewikiUrl && (
          <div className="pb-2">
            <a href={exercise.musclewikiUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
              Ver no MuscleWiki ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
