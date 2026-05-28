"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { getExercises } from "@/lib/data";
import { suggestWorkout, WORKOUT_TEMPLATES } from "@/lib/suggestions";
import { getInjuriesV2, getRecentSessions, saveWorkout, generateId, now, getEquipmentProfile } from "@/lib/storage";
import { getRehabProtocolsForConditions, INJURY_CONDITIONS_MAP } from "@/lib/rehab";
import { exerciseMatchesEquipment } from "@/lib/suggestions";
import { calculateFreshness, recommendFocusFromFreshness, GROUP_LABELS } from "@/lib/recovery";
import ExerciseMedia from "@/components/ExerciseMedia";
import { MECHANIC_PT, MUSCLE_PT } from "@/lib/translations";
import { Dumbbell, HeartPulse, Sparkles, Target, Zap, Flame, RefreshCw, X, Save } from "lucide-react";
import BackButton from "@/components/BackButton";
import type {
  Exercise,
  WorkoutSuggestion,
  SuggestionRequest,
  WorkoutEnvironment,
  WorkoutFocus,
  FitnessLevel,
  Injury,
  MuscleRecoveryStatus,
} from "@/lib/types";

/** Modal para substituir um exercício por outro compatível */
function ReplaceModal({
  targetEx,
  candidates,
  onSelect,
  onClose,
}: {
  targetEx: Exercise;
  candidates: Exercise[];
  onSelect: (ex: Exercise) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    const sameMuscle = candidates.filter((e) =>
      e.targetMuscles[0] === targetEx.targetMuscles[0]
    );
    const others = candidates.filter((e) =>
      e.targetMuscles[0] !== targetEx.targetMuscles[0]
    );
    const sorted = [...sameMuscle, ...others];
    if (!q) return sorted.slice(0, 60);
    return sorted.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.targetMuscles.some((m) => m.toLowerCase().includes(q))
    ).slice(0, 60);
  }, [candidates, targetEx, query]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "var(--color-surface)", maxHeight: "92dvh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com preview do exercício atual */}
        <div className="flex items-center gap-4 px-4 pt-4 pb-3 border-b"
             style={{ borderColor: "var(--color-border)" }}>
          <ExerciseMedia
            exercise={targetEx}
            className="w-16 h-16 rounded-xl shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              Substituindo
            </p>
            <p className="font-bold text-base truncate" style={{ color: "var(--color-text)" }}>
              {targetEx.name}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
              {targetEx.targetMuscles.slice(0, 3).map(m => MUSCLE_PT[m] ?? m).join(", ")}
            </p>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-lg shrink-0 transition-colors hover:opacity-70"
            style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}
            aria-label="Fechar">✕</button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "var(--color-border)" }}>
          <input
            autoFocus
            type="search"
            placeholder="Buscar por nome ou músculo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "var(--color-surface-2)",
              border: "1.5px solid var(--color-border)",
              color: "var(--color-text)",
            }}
          />
          <p className="text-xs mt-1.5 px-1" style={{ color: "var(--color-text-muted)" }}>
            {filtered.length} exercício{filtered.length !== 1 ? "s" : ""} disponíveis
            {query === "" && " · mesmo músculo aparece primeiro"}
          </p>
        </div>

        {/* Grid de cards */}
        <div className="overflow-y-auto flex-1 p-3">
          {filtered.length === 0 ? (
            <p className="text-center py-10 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Nenhum exercício encontrado
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((ex) => {
                const isSameMuscle = ex.targetMuscles[0] === targetEx.targetMuscles[0];
                const isHovered = hovered === ex.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => onSelect(ex)}
                    onMouseEnter={() => setHovered(ex.id)}
                    onMouseLeave={() => setHovered(null)}
                    className="flex flex-col rounded-xl overflow-hidden text-left transition-all border"
                    style={{
                      background: isHovered ? "var(--color-surface-2)" : "var(--color-surface-2)",
                      borderColor: isSameMuscle
                        ? "var(--color-primary-border)"
                        : isHovered
                        ? "var(--color-border)"
                        : "var(--color-border-subtle)",
                      transform: isHovered ? "scale(1.02)" : "scale(1)",
                      boxShadow: isHovered ? "0 4px 16px rgba(0,0,0,0.3)" : "none",
                    }}
                  >
                    {/* Imagem com autoplay */}
                    <div className="w-full aspect-square overflow-hidden"
                         style={{ background: "var(--color-surface)" }}>
                      <ExerciseMedia exercise={ex} className="w-full h-full" />
                    </div>

                    {/* Info */}
                    <div className="p-2.5">
                      <p className="text-xs font-bold leading-tight line-clamp-2"
                         style={{ color: "var(--color-text)" }}>
                        {ex.name}
                      </p>
                      <p className="text-[10px] mt-1 truncate"
                         style={{ color: "var(--color-text-muted)" }}>
                        {MUSCLE_PT[ex.targetMuscles[0]] ?? ex.targetMuscles[0]}
                      </p>
                      {isSameMuscle && (
                        <span className="inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{
                            background: "var(--color-primary)",
                            color: "var(--color-primary-text)",
                          }}>
                          mesmo músculo
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


const ENV_LABELS: Record<WorkoutEnvironment, string> = {
  home:    "Casa",
  gym:     "Academia",
  pilates: "Pilates/Mobilidade",
  any:     "Qualquer",
};

const FOCUS_LABELS: Record<WorkoutFocus, string> = {
  full_body: "Corpo Inteiro",
  upper:     "Superior",
  lower:     "Inferior",
  push:      "Empurrar",
  pull:      "Puxar",
  core:      "Core",
  rehab:     "Reabilitação",
  mobility:  "Mobilidade",
};

const LEVEL_LABELS: Record<FitnessLevel, string> = {
  beginner:     "Iniciante",
  intermediate: "Intermediário",
  advanced:     "Avançado",
};

export default function SuggestPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [suggestion, setSuggestion] = useState<WorkoutSuggestion | null>(null);
  const [saved, setSaved] = useState(false);
  const [exercisesMap, setExercisesMap] = useState<Map<string, Exercise>>(new Map());
  const [equipmentProfile, setEquipmentProfile] = useState<string[]>([]);
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [freshness, setFreshness] = useState<MuscleRecoveryStatus[]>([]);

  const [env, setEnv] = useState<WorkoutEnvironment>("home");
  const [focus, setFocus] = useState<WorkoutFocus>("full_body");
  const [duration, setDuration] = useState<20 | 30 | 45 | 60>(45);
  const [level, setLevel] = useState<FitnessLevel>("beginner");

  useEffect(() => {
    getExercises().then((exs) => {
      setExercises(exs);
      const exMap = new Map(exs.map((e) => [e.id, e]));
      setExercisesMap(exMap);
      // Calculate freshness once exercises are loaded
      const injuriesLoaded = getInjuriesV2();
      const sessions = getRecentSessions(7);
      setFreshness(calculateFreshness(sessions, exMap, injuriesLoaded));
    });
    setInjuries(getInjuriesV2());
    setEquipmentProfile(getEquipmentProfile());
  }, []);

  const conditionIds = injuries.map((i) => i.conditionId);
  const rehabProtocols = getRehabProtocolsForConditions(
    conditionIds,
    injuries[0]?.phase
  );
  const focusRecommendation = useMemo(() => recommendFocusFromFreshness(freshness), [freshness]);

  const handleGenerate = () => {
    const request: SuggestionRequest = {
      environment: env,
      focus,
      durationMinutes: duration,
      fitnessLevel: level,
      injuries,
      recentSessions: getRecentSessions(7),
      equipmentProfile,
    };
    setSuggestion(suggestWorkout(request, exercises));
    setSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTemplate = (templateId: string) => {
    const tpl = WORKOUT_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    const request: SuggestionRequest = {
      ...tpl.request,
      injuries,
      recentSessions: getRecentSessions(7),
      equipmentProfile,
    };
    setSuggestion(suggestWorkout(request, exercises));
    setSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = () => {
    if (!suggestion) return;
    const workout = {
      id: generateId(),
      name: suggestion.name,
      environment: env,
      exercises: suggestion.exercises.map((se) => ({
        exerciseId: se.exerciseId,
        config: se.config,
      })),
      createdAt: now(),
      updatedAt: now(),
    };
    saveWorkout(workout);
    setSaved(true);
  };

  const handleRemove = (idx: number) => {
    if (!suggestion) return;
    setSuggestion({
      ...suggestion,
      exercises: suggestion.exercises.filter((_, i) => i !== idx),
    });
    setSaved(false);
  };

  const handleReplace = (idx: number, newEx: Exercise) => {
    if (!suggestion) return;
    const old = suggestion.exercises[idx];
    setSuggestion({
      ...suggestion,
      exercises: suggestion.exercises.map((se, i) =>
        i === idx
          ? { ...old, exerciseId: newEx.id, reason: `Substituído manualmente por ${newEx.name}`, warning: undefined }
          : se
      ),
    });
    setReplacingIdx(null);
    setSaved(false);
  };

  /** Exercícios candidatos para substituição: compatíveis com equipamento, excluindo os já no treino */
  const replaceCandidates = useMemo(() => {
    if (replacingIdx === null || !suggestion) return [];
    const usedIds = new Set(suggestion.exercises.map((se) => se.exerciseId));
    return exercises.filter(
      (ex) =>
        !usedIds.has(ex.id) &&
        (equipmentProfile.length === 0 || exerciseMatchesEquipment(ex, equipmentProfile))
    );
  }, [replacingIdx, suggestion, exercises, equipmentProfile]);

  return (
    <div className="space-y-6">
      {/* Replace Modal */}
      {replacingIdx !== null && suggestion && (() => {
        const ex = exercisesMap.get(suggestion.exercises[replacingIdx]?.exerciseId ?? "");
        if (!ex) return null;
        return (
          <ReplaceModal
            targetEx={ex}
            candidates={replaceCandidates}
            onSelect={(newEx) => handleReplace(replacingIdx, newEx)}
            onClose={() => setReplacingIdx(null)}
          />
        );
      })()}
      <div className="flex items-center justify-between">
        <div>
          <BackButton className="mb-1" />
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles size={22} style={{ color: "var(--color-primary)" }} />
            Sugestão de Treino
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Treino gerado com base nas suas lesões, equipamento disponível e histórico recente
          </p>
        </div>
      </div>

      {injuries.length > 0 && (
        <div className="rounded-xl p-4 bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
          <p className="text-[var(--color-warning-text)] text-sm font-medium flex items-center gap-2">
            <HeartPulse size={14} /> {injuries.length} lesão(ões) ativa(s)
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {injuries.map((inj) => {
              const cond = INJURY_CONDITIONS_MAP.get(inj.conditionId);
              return (
                <span key={inj.id} className="badge badge-amber">
                  <HeartPulse size={12} className="shrink-0" /> {cond?.name ?? inj.conditionId} · Fase: {inj.phase}
                </span>
              );
            })}
          </div>
          <p className="text-[var(--color-warning-text)]/80 text-xs mt-2">
            Exercícios contraindicados serão automaticamente excluídos.
          </p>
        </div>
      )}

      {/* ── Freshness Panel (Fitbod-style) ─────────────────────────────── */}
      {freshness.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Dumbbell size={14} style={{ color: "var(--color-primary)" }} />
              Músculos de Hoje
            </h3>
            {focusRecommendation && (
              <span className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: "var(--color-primary)", color: "var(--color-primary-text)" }}>
                Recomendado: {FOCUS_LABELS[focusRecommendation.focus]}
              </span>
            )}
          </div>

          {focusRecommendation && (
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {focusRecommendation.reason}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {freshness.map((s) => {
              const dotColor = s.status === "ready" ? "bg-green-500" : s.status === "partial" ? "bg-amber-500" : "bg-red-500";
              const barColor = s.status === "ready"
                ? "var(--color-primary)"
                : s.status === "partial"
                ? "#f59e0b"
                : "#ef4444";
              return (
                <div key={s.group}
                  className="rounded-lg p-2.5 space-y-1.5"
                  style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate flex items-center gap-1" style={{ color: "var(--color-text)" }}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                      {GROUP_LABELS[s.group]}
                    </span>
                    <span className="text-[10px] font-bold ml-1 shrink-0"
                      style={{ color: barColor }}>
                      {s.freshnessPct}%
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: "var(--color-border)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${s.freshnessPct}%`, background: barColor }} />
                  </div>
                  {s.status !== "ready" && s.hoursRemaining > 0 && (
                    <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                      ~{s.hoursRemaining}h para 100%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {suggestion && (
        <div className="card p-5 space-y-4 border-[var(--color-primary-border)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-[var(--color-primary)] text-lg">{suggestion.name}</h2>
              {suggestion.protocolName && (
                <span className="inline-flex mt-1 text-xs bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] border border-[var(--color-border)] px-2 py-0.5 rounded-full">
                  📚 Protocolo Clínico: {suggestion.protocolName}
                </span>
              )}
              <p className="text-[var(--color-text-secondary)] text-sm mt-1">{suggestion.rationale}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              {!saved ? (
                <button
                  onClick={handleSave}
                  className="btn btn-primary flex items-center gap-1.5"
                >
                  <Save size={14} />Salvar Treino
                </button>
              ) : (
                <Link
                  href="/workouts"
                  className="btn btn-secondary"
                >
                  ✓ Salvo → Ver Treinos
                </Link>
              )}
            </div>
          </div>

          {suggestion.warnings.length > 0 && (
            <div className="space-y-1">
              {suggestion.warnings.map((w, i) => (
                <p key={i} className="text-xs text-[var(--color-warning-text)] bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)] rounded-lg px-3 py-2">
                  {w}
                </p>
              ))}
            </div>
          )}

          {suggestion.exercises.length === 0 ? (
            <p className="text-[var(--color-text-muted)] text-center py-4">
              Nenhum exercício disponível para os critérios selecionados.
              {injuries.length > 0 && " As lesões ativas podem ter restringido muito o catálogo."}
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">
                {suggestion.exercises.filter(se => exercisesMap.has(se.exerciseId) || !!se.displayName).length} exercício(s)
              </p>
              {suggestion.exercises.map((se, i) => {
                const ex = exercisesMap.get(se.exerciseId);
                // Rehab exercises may not exist in the database — render a simple card
                if (!ex) {
                  if (!se.displayName) return null;
                  const mediaEx = se.mediaSlug ? exercisesMap.get(se.mediaSlug) : undefined;
                  return (
                    <div key={se.exerciseId}
                      className="card overflow-hidden flex flex-col sm:flex-row"
                      style={{ background: "var(--color-surface-2)" }}>
                      {mediaEx && (
                        <ExerciseMedia
                          exercise={mediaEx}
                          className="w-full h-[180px] sm:w-[clamp(120px,28%,200px)] sm:h-auto sm:shrink-0 sm:self-stretch"
                        />
                      )}
                      {!mediaEx && (
                        <div className="w-full h-[100px] sm:w-[120px] sm:h-auto sm:self-stretch flex items-center justify-center text-4xl"
                          style={{ background: "var(--color-surface)" }}>🏥</div>
                      )}
                      <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-xs mr-1" style={{ color: "var(--color-text-muted)" }}>{i + 1}.</span>
                            <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>{se.displayName}</span>
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--color-primary-soft)", color: "var(--color-primary)" }}>reabilitação</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                              <span className="font-bold" style={{ color: "var(--color-text)" }}>{se.config.sets}×{se.config.reps}</span>
                              {se.config.rest > 0 && <span className="ml-1" style={{ color: "var(--color-text-muted)" }}>| {se.config.rest}s</span>}
                            </span>
                            <button
                              onClick={() => handleRemove(i)}
                              title="Remover exercício"
                              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                              style={{ color: "var(--color-text-muted)" }}
                            >✕</button>
                          </div>
                        </div>
                        {se.config.notes && (
                          <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{se.config.notes}</p>
                        )}
                        <p className="text-xs leading-relaxed italic" style={{ color: "var(--color-primary)" }}>{se.reason}</p>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={se.exerciseId}
                    className="card overflow-hidden flex flex-col sm:flex-row"
                    style={{ background: "var(--color-surface-2)" }}>
                    {/* Imagem com autoplay */}
                    <ExerciseMedia
                      exercise={ex}
                      className="w-full h-[180px] sm:w-[clamp(120px,28%,200px)] sm:h-auto sm:shrink-0 sm:self-stretch"
                    />
                    <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-xs mr-1" style={{ color: "var(--color-text-muted)" }}>{i + 1}.</span>
                          <Link
                            href={`/exercises/${ex.slug}`}
                            className="text-sm font-bold hover:text-[var(--color-primary)] transition-colors"
                            style={{ color: "var(--color-text)" }}
                          >{ex.name}</Link>
                          {se.warning && (
                            <span className="ml-2 text-xs" style={{ color: "var(--color-warning-text)" }}>&#9888; {se.warning}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-right" style={{ color: "var(--color-text-secondary)" }}>
                            <span className="font-bold" style={{ color: "var(--color-text)" }}>{se.config.sets}×{se.config.reps}</span>
                            <span className="ml-1" style={{ color: "var(--color-text-muted)" }}>| {se.config.rest}s</span>
                          </span>
                          <button
                            onClick={() => setReplacingIdx(i)}
                            title="Substituir exercício"
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                            style={{ color: "var(--color-primary)" }}
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button
                            onClick={() => handleRemove(i)}
                            title="Remover exercício"
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ex.targetMuscles.slice(0, 2).map((m) => (
                          <span key={m} className="badge badge-gray text-[10px]">{MUSCLE_PT[m] ?? m}</span>
                        ))}
                        {ex.mechanic && (
                          <span className="badge badge-green text-[10px]">{MECHANIC_PT[ex.mechanic] ?? ex.mechanic}</span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{se.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {rehabProtocols.length > 0 && (
        <div className="card p-4 space-y-3 bg-[var(--color-surface-2)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-2">
            📚 Protocolos de Reabilitação Disponíveis
          </h3>
          <div className="space-y-2">
            {rehabProtocols.map((proto) => (
              <div key={proto.id} className="rounded-lg p-3 bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">{proto.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {proto.exercises.length} exercícios · {proto.frequency}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">📚 {proto.source}</p>
                  </div>
                  <button
                    onClick={() => {
                      const request: SuggestionRequest = {
                        environment: "home",
                        focus: "rehab",
                        durationMinutes: 30,
                        fitnessLevel: level,
                        injuries,
                        recentSessions: getRecentSessions(7),
                        equipmentProfile,
                      };
                      setSuggestion(suggestWorkout(request, exercises));
                      setSaved(false);
                    }}
                    className="btn btn-secondary btn-sm shrink-0"
                  >
                    Usar →
                  </button>
                </div>
                <div className="mt-2 space-y-1">
                  {proto.exercises.map((ex) => (
                    <p key={ex.name} className="text-xs text-[var(--color-text-secondary)]">
                      • <span className="text-[var(--color-text)]">{ex.name}</span> — {ex.sets}×{ex.reps}
                    </p>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-2 italic">{proto.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="section-label">Templates Prontos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {WORKOUT_TEMPLATES.map((tpl) => {
            const safeForMe =
              !tpl.targetConditions ||
              tpl.targetConditions.some((c) => conditionIds.includes(c)) ||
              conditionIds.length === 0;
            return (
              <button
                key={tpl.id}
                onClick={() => handleTemplate(tpl.id)}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  safeForMe
                    ? "card card-interactive"
                    : "bg-[var(--color-surface)] border-[var(--color-border-subtle)] opacity-60"
                }`}
              >
                <Dumbbell size={16} style={{ color: "var(--color-text-muted)" }} className="mb-1" />
                <p className="text-sm font-semibold mt-1">{tpl.name}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{tpl.description}</p>
                {tpl.targetConditions && tpl.targetConditions.some((c) => conditionIds.includes(c)) && (
                  <span className="text-xs text-[var(--color-primary)] mt-1 block">✓ Recomendado para você</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="section-label">Personalizar</h2>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)] block">Local</label>
            <div className="flex flex-wrap gap-1.5">
              {(["home", "gym", "pilates", "any"] as WorkoutEnvironment[]).map((e) => (
                <button
                  key={e}
                  onClick={() => setEnv(e)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    env === e
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  }`}
                >
                  {ENV_LABELS[e]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)] block">Nível</label>
            <div className="flex flex-wrap gap-1.5">
              {(["beginner", "intermediate", "advanced"] as FitnessLevel[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    level === l
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  }`}
                >
                  {LEVEL_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[var(--color-text-muted)] block">Foco</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FOCUS_LABELS) as WorkoutFocus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFocus(f)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  focus === f
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                }`}
              >
                {FOCUS_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-[var(--color-text-muted)] block">Duração</label>
          <div className="flex gap-1.5">
            {([20, 30, 45, 60] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`text-xs px-4 py-1.5 rounded-lg border transition-colors ${
                  duration === d
                    ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]"
                    : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                }`}
              >
                {d}min
              </button>
            ))}
          </div>
        </div>

        {/* Equipamentos ativos */}
        <div className="card p-3 flex items-center gap-3">
          <Dumbbell size={20} className="shrink-0" style={{ color: "var(--color-text-muted)" }} />
          <div className="flex-1 min-w-0">
            {equipmentProfile.length > 0 ? (
              <>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {equipmentProfile.length} equipamento{equipmentProfile.length !== 1 ? "s" : ""} disponível{equipmentProfile.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                  {equipmentProfile.join(", ")}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold" style={{ color: "var(--color-warning-text)" }}>
                  Equipamentos não configurados
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  O filtro usará o ambiente selecionado como fallback
                </p>
              </>
            )}
          </div>
          <Link href="/equipment" className="btn btn-secondary btn-sm shrink-0">
            Configurar
          </Link>
        </div>

        <button
          onClick={handleGenerate}
          disabled={exercises.length === 0}
          className="w-full btn btn-primary btn-lg"
        >
          {exercises.length === 0 ? "Carregando exercícios..." : (
            <span className="flex items-center justify-center gap-2">
              <Sparkles size={16} /> Gerar Treino
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
