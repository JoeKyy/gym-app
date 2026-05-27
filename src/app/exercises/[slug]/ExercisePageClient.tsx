"use client";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getExercises } from "@/lib/data";
import { useInjuries } from "@/hooks/useInjuries";
import { DIFFICULTY_PT, EQUIPMENT_PT } from "@/lib/translations";
import BodyMapImage from "@/components/BodyMapImage";
import type { Exercise } from "@/lib/types";

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
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [videoAngle, setVideoAngle] = useState<"frontMale" | "sideMale" | "frontFemale" | "sideFemale">("frontMale");
  const [videoError, setVideoError] = useState(false);
  const { isRisky, injuredMuscleNames } = useInjuries();

  const initSets = (): SetRow[] =>
    Array.from({ length: DEFAULT_SETS }, (_, i) => ({ id: i + 1, weight: "", reps: DEFAULT_REPS, done: false }));
  const [sets, setSets] = useState<SetRow[]>(initSets);
  const [restingAfter, setRestingAfter] = useState<number | null>(null);
  const [allDone, setAllDone] = useState(false);

  useEffect(() => {
    getExercises().then((exs) => {
      const found = exs.find((e) => e.slug === slug || e.id === slug);
      setExercise(found ?? null);
      if (found?.videoUrls) {
        const angles = ["frontMale", "sideMale", "frontFemale", "sideFemale"] as const;
        const first = angles.find((a) => found.videoUrls?.[a]);
        if (first) setVideoAngle(first);
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
          <p className="text-4xl mb-2">🏋</p>
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
  const mechanicPt: Record<string, string> = { compound: "Composto", isolation: "Isolamento" };
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
    <div>
      <div className="pb-3">
        <Link href="/exercises" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] inline-flex items-center gap-1 transition-colors">
          ← Exercícios
        </Link>
      </div>

      <div className="lg:flex lg:gap-6 lg:items-start">
        <div className="lg:w-96 lg:shrink-0 lg:sticky lg:top-4 mb-4 lg:mb-0">
          <div className="mb-3 lg:hidden">
            <h1 className="text-xl font-bold leading-tight">{exercise.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {diffPt && (
                <span className={`badge ${exercise.difficulty === "beginner" ? "badge-green" : exercise.difficulty === "intermediate" ? "badge-amber" : "badge-red"}`}>
                  {diffPt}
                </span>
              )}
              {exercise.mechanic && <span className="badge badge-gray">{mechanicPt[exercise.mechanic] ?? exercise.mechanic}</span>}
              {risky && <span className="badge badge-red">⚠ Risco: {riskyMuscles.join(", ")}</span>}
            </div>
          </div>

          <div className="rounded-2xl overflow-hidden card">
            <div className="aspect-square bg-[var(--color-surface-2)]">
              {videoUrl && !videoError ? (
                <video key={videoUrl} src={videoUrl} autoPlay loop muted playsInline
                  onError={() => setVideoError(true)}
                  className="w-full h-full object-contain" />
              ) : exercise.gifUrl ? (
                <img src={exercise.gifUrl} alt={exercise.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">🏋</div>
              )}
            </div>

            {allAngles.length > 1 && (
              <div className="flex gap-2 p-3 border-t border-[var(--color-border-subtle)] overflow-x-auto">
                {allAngles.map((angle) => (
                  <button key={angle}
                    onClick={() => { setVideoAngle(angle); setVideoError(false); }}
                    className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                      videoAngle === angle
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] font-bold"
                        : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
                    }`}
                  >{angleLabels[angle]}</button>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block mt-4 card p-4 space-y-2">
            <p className="section-label">Músculos</p>
            <BodyMapImage
              slug={exercise.slug}
              targetMuscles={exercise.targetMuscles}
              defaultView="auto"
              size="md"
              className="py-2"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {exercise.targetMuscles.map((m) => (
                <span key={m} className={`badge font-semibold ${
                  injuredMuscleNames.includes(m.toLowerCase()) ? "badge-red" : "badge-green"
                }`}>{m}</span>
              ))}
              {exercise.secondaryMuscles.map((m) => (
                <span key={m} className={`badge ${
                  injuredMuscleNames.includes(m.toLowerCase()) ? "badge-red" : "badge-gray"
                }`}>{m}</span>
              ))}
            </div>
            {exercise.equipments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {exercise.equipments.map((eq) => (
                  <span key={eq} className="badge badge-gray">{EQUIPMENT_PT[eq] ?? eq}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 space-y-4">
          <div className="hidden lg:block">
            <h1 className="text-2xl font-bold leading-tight">{exercise.name}</h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {diffPt && (
                <span className={`badge ${exercise.difficulty === "beginner" ? "badge-green" : exercise.difficulty === "intermediate" ? "badge-amber" : "badge-red"}`}>
                  {diffPt}
                </span>
              )}
              {exercise.mechanic && <span className="badge badge-gray">{mechanicPt[exercise.mechanic] ?? exercise.mechanic}</span>}
              {risky && <span className="badge badge-red">⚠ Risco: {riskyMuscles.join(", ")}</span>}
            </div>
          </div>

          <div className="lg:hidden card p-4 space-y-2">
            <p className="section-label">Músculos</p>
            <BodyMapImage
              slug={exercise.slug}
              targetMuscles={exercise.targetMuscles}
              defaultView="auto"
              size="md"
              className="py-2"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {exercise.targetMuscles.map((m) => (
                <span key={m} className={`badge font-semibold ${
                  injuredMuscleNames.includes(m.toLowerCase()) ? "badge-red" : "badge-green"
                }`}>{m}</span>
              ))}
              {exercise.secondaryMuscles.map((m) => (
                <span key={m} className={`badge ${
                  injuredMuscleNames.includes(m.toLowerCase()) ? "badge-red" : "badge-gray"
                }`}>{m}</span>
              ))}
            </div>
            {exercise.equipments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {exercise.equipments.map((eq) => (
                  <span key={eq} className="badge badge-gray">{EQUIPMENT_PT[eq] ?? eq}</span>
                ))}
              </div>
            )}
          </div>

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
              <div className="bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] rounded-xl p-3 text-center">
                <p className="text-[var(--color-primary)] font-semibold">🎉 Exercício concluído!</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Todas as {sets.length} séries feitas</p>
              </div>
            )}

            {restingAfter !== null && !allDone && <RestTimer onDone={() => setRestingAfter(null)} />}

            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="w-7 shrink-0" />
                <span className="text-xs text-[var(--color-text-muted)] w-8 text-center">#</span>
                <span className="text-xs text-[var(--color-text-muted)] flex-1 text-center">Peso (kg)</span>
                <span className="text-xs text-[var(--color-text-muted)] flex-1 text-center">Reps</span>
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

          <div className="flex gap-3 pb-2">
            {exercise.musclewikiUrl && (
              <a href={exercise.musclewikiUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                MuscleWiki ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
