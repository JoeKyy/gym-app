"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getExercises } from "@/lib/data";
import { getEquipmentProfile, getInjuriesV2, saveWorkout, getProfile } from "@/lib/storage";
import {
  generateWorkout,
  generatedToWorkout,
  FOCUS_OPTIONS,
  GOAL_OPTIONS,
  FOCUS_LABELS,
  GOAL_LABELS,
  type TrainingFocus,
  type TrainingGoal,
  type GeneratedWorkout,
  type GeneratorOptions,
} from "@/lib/generator";
import { ALL_EQUIPMENT } from "@/lib/equipment";
import EquipmentIcon from "@/components/EquipmentIcon";
import ExerciseMedia from "@/components/ExerciseMedia";
import { Zap, RefreshCw, Play, LayoutList, Clock, Target, Dumbbell, Save, Shuffle, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { Exercise } from "@/lib/types";

type Step = "focus" | "equipment" | "settings" | "result";

const DIFFICULTIES = [
  { id: "beginner",     label: "Iniciante",      color: "#22c55e" },
  { id: "intermediate", label: "Intermediário",   color: "#f59e0b" },
  { id: "advanced",     label: "Avançado",        color: "#ef4444" },
] as const;

const COUNT_OPTIONS = [4, 6, 8, 10];

const EQUIPMENT_PRESETS = [
  { label: "Sem equipamento", ids: ["Bodyweight"] },
  { label: "Em casa", ids: ["Bodyweight", "Dumbbells", "Band", "Kettlebells"] },
  { label: "Academia completa", ids: ["Bodyweight", "Dumbbells", "Barbell", "Cables", "Machine", "Plate", "Smith-Machine", "Kettlebells"] },
];

export default function GeneratePage() {
  const router = useRouter();

  // Wizard state
  const [step, setStep] = useState<Step>("focus");
  const [focus, setFocus] = useState<TrainingFocus>("full_body");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [goal, setGoal] = useState<TrainingGoal>("hypertrophy");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [exerciseCount, setExerciseCount] = useState(6);

  // Data
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [generatedWorkout, setGeneratedWorkout] = useState<GeneratedWorkout | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    getExercises().then(setExercises);
    // Pre-fill equipment from profile
    const saved = getEquipmentProfile();
    if (saved.length > 0) setEquipment(saved);
    // Pre-fill from user profile
    const profile = getProfile();
    setDifficulty(profile.experienceLevel);
    // Map profile goal → generator goal
    const goalMap: Record<string, TrainingGoal> = {
      build_muscle: "hypertrophy",
      get_stronger: "strength",
      get_lean: "endurance",
      general_fitness: "hypertrophy",
      rehab: "hypertrophy",
    };
    setGoal(goalMap[profile.goal] ?? "hypertrophy");
    // Map split → focus
    const splitMap: Record<string, TrainingFocus> = {
      full_body: "full_body",
      upper_lower: "upper",
      ppl: "push",
      fresh_muscle: "full_body",
    };
    setFocus(splitMap[profile.split] ?? "full_body");
    // Map duration → exercise count
    const countMap: Record<number, number> = { 30: 4, 45: 6, 60: 8, 75: 9, 90: 10 };
    setExerciseCount(countMap[profile.durationMinutes] ?? 6);
  }, []);

  // Injured muscles to avoid
  const avoidMuscles = useMemo(() => {
    const injuries = getInjuriesV2();
    return injuries.flatMap((i) => i.affectedMuscles);
  }, []);

  function toggleEquipment(id: string) {
    setEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  function applyPreset(ids: string[]) {
    setEquipment(ids);
  }

  function handleGenerate() {
    const opts: GeneratorOptions = {
      equipment,
      focus,
      goal,
      difficulty,
      exerciseCount,
      avoidMuscles,
    };
    const result = generateWorkout(exercises, opts);
    setGeneratedWorkout(result);
    setStep("result");
  }

  function handleRegenerate() {
    if (!generatedWorkout) return;
    const opts: GeneratorOptions = {
      equipment,
      focus,
      goal,
      difficulty,
      exerciseCount,
      avoidMuscles,
    };
    setGeneratedWorkout(generateWorkout(exercises, opts));
  }

  function handleSave() {
    if (!generatedWorkout) return;
    const workout = generatedToWorkout(generatedWorkout);
    saveWorkout(workout);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  }

  function handleStartNow() {
    if (!generatedWorkout) return;
    const workout = generatedToWorkout(generatedWorkout);
    saveWorkout(workout);
    router.push(`/workout?id=${workout.id}`);
  }

  function swapExercise(idx: number) {
    if (!generatedWorkout || exercises.length === 0) return;
    const current = generatedWorkout.exercises[idx];
    const pool = exercises.filter((ex) => {
      if (ex.id === current.exerciseId) return false;
      if (generatedWorkout.exercises.some((ge) => ge.exerciseId === ex.id)) return false;
      const hasEquip = !ex.equipments?.length ||
        ex.equipments.some((e) => [...equipment, "Bodyweight"].includes(e));
      const sameMuscle = ex.targetMuscles.some((m) =>
        current.exercise.targetMuscles.some((cm) => m.toLowerCase() === cm.toLowerCase())
      );
      return hasEquip && sameMuscle;
    });
    if (pool.length === 0) return;
    const replacement = pool[Math.floor(Math.random() * pool.length)];
    const newExercises = [...generatedWorkout.exercises];
    const config = current.config;
    newExercises[idx] = { exerciseId: replacement.id, exercise: replacement, config };
    setGeneratedWorkout({ ...generatedWorkout, exercises: newExercises });
  }

  // ── STEP INDICATORS ──────────────────────────────────────────────────────────

  const steps: { id: Step; label: string }[] = [
    { id: "focus", label: "Foco" },
    { id: "equipment", label: "Equipamento" },
    { id: "settings", label: "Configurações" },
    { id: "result", label: "Treino" },
  ];
  const currentStepIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <Link href="/" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] inline-flex items-center gap-1 mb-2">
          ← Início
        </Link>
        <h1 className="text-2xl font-bold">Gerador de Treino</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Monte um treino em segundos</p>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-1.5 flex-1">
            <div className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentStepIdx ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
            }`} />
            {i === steps.length - 1 && (
              <div className={`h-1.5 w-3 rounded-full transition-colors ${
                step === "result" ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: FOCUS ────────────────────────────────────────────────────── */}
      {step === "focus" && (
        <div className="space-y-5">
          <h2 className="text-lg font-bold">O que você quer trabalhar?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setFocus(opt.id)}
                className={`card text-left p-4 transition-all cursor-pointer ${
                  focus === opt.id
                    ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]"
                    : "card-interactive"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  {focus === opt.id && (
                    <Check size={16} style={{ color: "var(--color-primary)" }} className="ml-auto" />
                  )}
                </div>
                <p className="font-semibold text-sm">{opt.label}</p>
                {opt.muscles.length > 0 && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug line-clamp-1">
                    {opt.muscles.join(", ")}
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="sticky bottom-28 flex justify-end pt-4">
            <button onClick={() => setStep("equipment")} className="btn btn-primary btn-lg">
              Próximo: Equipamento →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: EQUIPMENT ────────────────────────────────────────────────── */}
      {step === "equipment" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Onde você vai treinar?</h2>
            <button onClick={() => setStep("focus")} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              ← Voltar
            </button>
          </div>

          {/* Quick presets */}
          <div>
            <p className="section-label mb-2">Atalho rápido</p>
            <div className="flex flex-wrap gap-2">
              {EQUIPMENT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset.ids)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors border ${
                    JSON.stringify([...equipment].sort()) === JSON.stringify([...preset.ids].sort())
                      ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] border-[var(--color-primary)]"
                      : "border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-text)]"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Individual equipment */}
          <div>
            <p className="section-label mb-2">Ou selecione individualmente</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ALL_EQUIPMENT.filter((e) => !["Bench", "Squat-Rack", "Pull-up-Bar", "Parallel-Bars", "Gymnastic-Rings", "Stability-Ball"].includes(e.id)).map((eq) => {
                const isSelected = equipment.includes(eq.id);
                return (
                  <button
                    key={eq.id}
                    onClick={() => toggleEquipment(eq.id)}
                    className={`card p-4 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]"
                        : "card-interactive opacity-75"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <EquipmentIcon
                        id={eq.id}
                        size={36}
                        color={isSelected ? "var(--color-primary)" : "var(--color-text-muted)"}
                      />
                      {isSelected && (
                        <span className="text-[var(--color-primary)] font-bold text-base leading-none shrink-0">✓</span>
                      )}
                    </div>
                    <p className="font-semibold text-sm leading-tight">{eq.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sticky bottom-28 flex justify-end pt-4">
            <button
              onClick={() => setStep("settings")}
              disabled={equipment.length === 0}
              className="btn btn-primary btn-lg disabled:opacity-40"
            >
              {equipment.length === 0
                ? "Selecione ao menos 1 equipamento"
                : `Próximo: Configurações (${equipment.length}) →`}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: SETTINGS ─────────────────────────────────────────────────── */}
      {step === "settings" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Como você quer treinar?</h2>
            <button onClick={() => setStep("equipment")} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              ← Voltar
            </button>
          </div>

          {/* Goal */}
          <div>
            <p className="section-label mb-3">Objetivo</p>
            <div className="grid grid-cols-2 gap-3">
              {GOAL_OPTIONS.map((g) => (
                <button key={g.id} onClick={() => setGoal(g.id)}
                  className={`card p-4 text-left transition-all cursor-pointer ${
                    goal === g.id
                      ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]"
                      : "card-interactive"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    {goal === g.id && <Check size={16} style={{ color: "var(--color-primary)" }} className="ml-auto" />}
                  </div>
                  <p className="font-semibold text-sm">{g.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">{g.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <p className="section-label mb-3">Nível de dificuldade</p>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button key={d.id} onClick={() => setDifficulty(d.id)}
                  className={`flex-1 card p-3 text-center transition-all cursor-pointer ${
                    difficulty === d.id
                      ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]"
                      : "card-interactive"
                  }`}
                >
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ background: d.color }} />
                  <p className="text-xs font-semibold">{d.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Exercise count */}
          <div>
            <p className="section-label mb-3">Número de exercícios</p>
            <div className="flex gap-2">
              {COUNT_OPTIONS.map((c) => (
                <button key={c} onClick={() => setExerciseCount(c)}
                  className={`flex-1 card py-3 text-center transition-all cursor-pointer font-bold text-sm ${
                    exerciseCount === c
                      ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                      : "card-interactive text-[var(--color-text)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Summary card */}
          <div className="card p-4 space-y-1.5 text-sm">
            <p className="font-semibold text-[var(--color-text-muted)] text-xs uppercase tracking-wide mb-2">Resumo</p>
            <p className="flex items-center gap-1.5"><Target size={13} style={{ color: "var(--color-primary)" }} /><strong>Foco:</strong> {FOCUS_LABELS[focus]}</p>
            <p className="flex items-center gap-1.5"><Dumbbell size={13} style={{ color: "var(--color-primary)" }} /><strong>Equipamento:</strong> {equipment.length} item{equipment.length !== 1 ? "s" : ""}</p>
            <p className="flex items-center gap-1.5"><Zap size={13} style={{ color: "var(--color-primary)" }} /><strong>Objetivo:</strong> {GOAL_LABELS[goal]}</p>
            <p className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: DIFFICULTIES.find((d) => d.id === difficulty)?.color }} />
              <strong>Nível:</strong> {DIFFICULTIES.find((d) => d.id === difficulty)?.label}
            </p>
            <p className="flex items-center gap-1.5"><LayoutList size={13} style={{ color: "var(--color-primary)" }} /><strong>Exercícios:</strong> {exerciseCount}</p>
          </div>

          <div className="sticky bottom-28 flex justify-end pt-4">
            <button
              onClick={handleGenerate}
              disabled={exercises.length === 0}
              className="btn btn-primary btn-lg shadow-lg flex items-center gap-2"
            >
              <Zap size={16} />Gerar Treino
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: RESULT ───────────────────────────────────────────────────── */}
      {step === "result" && generatedWorkout && (
        <div className="space-y-5">
          {/* Workout header */}
          <div className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg leading-tight">{generatedWorkout.name}</h2>
                <div className="flex flex-wrap gap-2 mt-2 text-sm text-[var(--color-text-secondary)]">
                  <span>{generatedWorkout.exercises.length} exercícios</span>
                  <span className="flex items-center gap-1"><LayoutList size={12} />{generatedWorkout.totalSets} séries</span>
                  <span className="flex items-center gap-1"><Clock size={12} />~{generatedWorkout.estimatedMinutes} min</span>
                </div>
              </div>
              <button onClick={handleRegenerate}
                className="btn btn-secondary text-sm shrink-0 flex items-center gap-1.5">
                <RefreshCw size={14} />Gerar novamente
              </button>
            </div>
          </div>

          {/* Exercise list */}
          <div className="space-y-3">
            {generatedWorkout.exercises.map((ge, idx) => (
              <div key={ge.exerciseId} className="card p-0 overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-[var(--color-surface-2)]">
                    <ExerciseMedia exercise={ge.exercise} className="w-full h-full object-contain" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm capitalize leading-tight line-clamp-1">{ge.exercise.name}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ge.exercise.targetMuscles.slice(0, 2).map((m) => (
                        <span key={m} className="badge badge-green text-[10px]">{m}</span>
                      ))}
                    </div>
                  </div>

                  {/* Prescription */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-[var(--color-primary)]">{ge.config.sets}×{ge.config.reps}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)]">{ge.config.rest}s descanso</p>
                  </div>
                </div>

                {/* Swap button */}
                <div className="border-t px-3 py-2 flex justify-between items-center" style={{ borderColor: "var(--color-border-subtle)" }}>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {ge.exercise.mechanic === "compound" ? "Composto" : "Isolamento"} · {ge.exercise.equipments[0] ?? "Peso corporal"}
                  </span>
                  <button onClick={() => swapExercise(idx)}
                    className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors flex items-center gap-1">
                    <Shuffle size={12} />Trocar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="space-y-3 pt-2">
            <button onClick={handleStartNow} className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2">
              <Play size={16} />Iniciar treino agora
            </button>
            <button onClick={handleSave}
              className={`btn w-full btn-secondary flex items-center justify-center gap-2`}>
              {savedMsg ? <><Check size={16} />Treino salvo!</> : <><Save size={16} />Salvar treino</>}
            </button>
            <button onClick={() => setStep("settings")}
              className="btn btn-ghost w-full text-[var(--color-text-muted)]">
              ← Ajustar configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
