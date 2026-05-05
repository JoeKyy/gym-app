/**
 * suggestions.ts — Evidence-based workout suggestion engine.
 *
 * Generates balanced workouts based on:
 * - Equipment availability (environment)
 * - Active injuries and rehabilitation phase
 * - Target muscle groups / workout focus
 * - Fitness level (volume/intensity)
 * - Per-muscle-group freshness (Fitbod-style, via recovery.ts)
 * - Contraindication check per exercise
 */

import type {
  Exercise,
  Injury,
  WorkoutSession,
  WorkoutSuggestion,
  SuggestedExercise,
  SuggestionRequest,
  ExerciseSet,
  WorkoutEnvironment,
  FitnessLevel,
  WorkoutFocus,
  MuscleGroup,
  MuscleRecoveryStatus,
} from "./types";
import {
  getRehabProtocolsForConditions,
  getAffectedMusclesForConditions,
  isExerciseContraindicated,
  INJURY_CONDITIONS_MAP,
  REHAB_PROTOCOLS,
} from "./rehab";
import { getPrimaryEquipments } from "./exercise-corrections";
import { calculateFreshness, normalizeMuscle, GROUP_LABELS } from "./recovery";

// ─── Constants ────────────────────────────────────────────────────────────────

const VOLUME_BY_LEVEL: Record<FitnessLevel, { sets: number; exercises: number }> = {
  beginner: { sets: 2, exercises: 5 },
  intermediate: { sets: 3, exercises: 7 },
  advanced: { sets: 4, exercises: 9 },
};

const DURATION_EXERCISES: Record<number, number> = {
  20: 4,
  30: 5,
  45: 7,
  60: 9,
};

// Muscle groups for focus targets
const FOCUS_MUSCLES: Record<WorkoutFocus, string[]> = {
  full_body: ["chest", "back", "quadriceps", "hamstrings", "shoulders", "core"],
  upper: ["chest", "lats", "shoulders", "biceps", "triceps", "upper back"],
  lower: ["quadriceps", "hamstrings", "glutes", "calves", "hip flexors"],
  push: ["chest", "shoulders", "triceps", "pecs"],
  pull: ["lats", "biceps", "upper back", "rear delts", "traps"],
  core: ["abdominals", "obliques", "lower back", "erector spinae"],
  rehab: [], // determined by injuries
  mobility: ["hip flexors", "hamstrings", "calves", "chest", "upper back"],
};

// Map workout environment to exercise categories
const ENV_CATEGORIES: Record<WorkoutEnvironment, string[]> = {
  home: ["bodyweight", "band", "yoga", "recovery", "stretches"],
  gym: ["barbell", "dumbbells", "cables", "machine", "kettlebells", "plate", "smith-machine"],
  pilates: ["bodyweight", "band", "yoga", "recovery", "stretches", "trx", "bosu-ball"],
  any: [], // all categories
};

// ─── Utility functions ────────────────────────────────────────────────────────

function setsForLevel(level: FitnessLevel): number {
  return VOLUME_BY_LEVEL[level].sets;
}

function repsForFocus(focus: WorkoutFocus, level: FitnessLevel): string {
  if (focus === "rehab" || focus === "mobility") return "10-15";
  if (level === "beginner") return "12-15";
  if (level === "intermediate") return "8-12";
  return "6-10";
}

function getRestSeconds(focus: WorkoutFocus, mechanic: string | undefined): number {
  if (focus === "rehab" || focus === "mobility") return 30;
  if (mechanic === "compound") return 90;
  return 60;
}

function exerciseMatchesFocus(ex: Exercise, focus: WorkoutFocus): boolean {
  if (focus === "rehab" || focus === "mobility") return true;
  const targets = FOCUS_MUSCLES[focus];
  if (targets.length === 0) return true; // full_body — handled separately
  const allMuscles = [
    ...ex.targetMuscles.map((m) => m.toLowerCase()),
    ...ex.secondaryMuscles.map((m) => m.toLowerCase()),
  ];
  return targets.some((t) =>
    allMuscles.some((m) => m.includes(t.toLowerCase()) || t.toLowerCase().includes(m))
  );
}

function exerciseMatchesEnvironment(ex: Exercise, env: WorkoutEnvironment): boolean {
  if (env === "any") return true;
  const allowed = ENV_CATEGORIES[env];
  const cat = (ex.category ?? "").toLowerCase();
  return allowed.some((a) => cat === a || cat.includes(a));
}

/**
 * Verifica se o exercício pode ser feito com os equipamentos disponíveis.
 *
 * Lógica ALL (every): todos os equipamentos primários do exercício devem estar
 * no perfil do usuário. Equipamentos secundários (Recovery, Stretches, Yoga,
 * Cardio) são ignorados pois não representam uma restrição de posse.
 *
 * Retorna true quando:
 *  - o perfil está vazio (sem filtro)
 *  - TODOS os equipamentos primários do exercício estão no perfil
 *
 * Exercícios com SOMENTE equipamentos secundários (Yoga, Recovery, etc.)
 * retornam false quando o perfil está configurado — eles são controlados
 * pelo foco do treino (mobility/rehab), não pelo equipamento.
 */
export function exerciseMatchesEquipment(ex: Exercise, profile: string[]): boolean {
  if (profile.length === 0) return true;
  const allEquips = ex.equipments ?? [];
  const primary = getPrimaryEquipments(allEquips);

  // Exercício tem APENAS categorias secundárias (Yoga, Recovery, Stretches, Cardio)
  // → não é controlado por equipamento, é controlado pelo foco
  if (allEquips.length > 0 && primary.length === 0) return false;

  // Sem equipamento definido → sem restrição (bodyweight puro)
  if (primary.length === 0) return true;

  return primary.every((eq) => profile.includes(eq));
}

function getSpinalLoadFromInjuries(injuries: Injury[]): "low" | "medium" | "high" {
  let limit: "low" | "medium" | "high" = "high";
  for (const inj of injuries) {
    const cond = INJURY_CONDITIONS_MAP.get(inj.conditionId);
    if (!cond) continue;
    const condLimit = cond.spinalLoadLimit[inj.phase] ?? "high";
    if (condLimit === "low") return "low";
    if (condLimit === "medium" && limit === "high") limit = "medium";
  }
  return limit;
}

function spinalLoadOk(
  exSpinalLoad: string | undefined,
  maxLoad: "low" | "medium" | "high"
): boolean {
  if (!exSpinalLoad) return true; // unknown → allow
  const order = { low: 0, medium: 1, high: 2 };
  return (order[exSpinalLoad as keyof typeof order] ?? 0) <= (order[maxLoad] ?? 2);
}

/**
 * Classify exercise spinal load based on slug patterns.
 * Used instead of the missing `spinalLoad` field in exercise data.
 */
function getSlugSpinalLoad(slug: string): "low" | "medium" | "high" {
  const s = slug.toLowerCase();
  // High: heavy axial compression or spinal shear
  if (
    s.includes("deadlift") ||
    s.includes("good-morning") ||
    s.includes("jefferson-curl") ||
    s.includes("barbell-squat") ||
    s.includes("barbell-back-squat") ||
    s.includes("barbell-front-squat") ||
    s.includes("hack-squat") ||
    s.includes("barbell-row") ||
    s.includes("bent-over-row") ||
    s.includes("pendlay-row") ||
    s.includes("barbell-overhead-press") ||
    s.includes("leg-press")
  ) return "high";

  // Medium: moderate spinal involvement
  if (
    s.includes("squat") ||
    s.includes("lunge") ||
    s.includes("hip-thrust") ||
    s.includes("step-up") ||
    s.includes("dumbbell-row") ||
    s.includes("kettlebell-row") ||
    s.includes("cable-row") ||
    s.includes("overhead-press") ||
    s.includes("overhead")
  ) return "medium";

  // Low: lying, seated with support, or purely upper-body isolation
  return "low";
}


export function suggestWorkout(
  request: SuggestionRequest,
  allExercises: Exercise[]
): WorkoutSuggestion {
  const {
    environment,
    focus,
    durationMinutes,
    fitnessLevel,
    injuries,
    recentSessions,
    equipmentProfile,
  } = request;

  const exercisesMap = new Map(allExercises.map((e) => [e.id, e]));
  const conditionIds = injuries.map((i) => i.conditionId);

  // ── 1. Special case: rehab protocol ───────────────────────────────────────
  if (focus === "rehab" && injuries.length > 0) {
    return buildRehabWorkout(injuries, conditionIds, fitnessLevel);
  }

  // ── 2. Determine muscle constraints ──────────────────────────────────────
  const freshness = calculateFreshness(recentSessions, exercisesMap, injuries);
  const freshnessMap = new Map<MuscleGroup, MuscleRecoveryStatus>(
    freshness.map((s) => [s.group, s])
  );
  const injuredMuscles = new Set(
    getAffectedMusclesForConditions(conditionIds).map((m) => m.toLowerCase())
  );
  const spinalLoadLimit = getSpinalLoadFromInjuries(injuries);
  const maxExercises = Math.min(
    DURATION_EXERCISES[durationMinutes] ?? 7,
    VOLUME_BY_LEVEL[fitnessLevel].exercises
  );

  // ── 3. Filter candidate exercises ────────────────────────────────────────
  const warnings: string[] = [];

  // Quando o usuário cadastrou equipamentos, usamos o perfil diretamente.
  // Caso contrário, filtramos pelo mapeamento genérico de ambiente.
  const hasEquipmentProfile = Array.isArray(equipmentProfile) && equipmentProfile.length > 0;

  const candidates = allExercises.filter((ex) => {
    // Filtro por equipamento (se perfil cadastrado) ou por ambiente (fallback)
    if (hasEquipmentProfile) {
      const allEquips = ex.equipments ?? [];
      const primary = getPrimaryEquipments(allEquips);
      const isSecondaryOnly = allEquips.length > 0 && primary.length === 0;

      // Exercícios de yoga/recovery/stretches/cardio: só permitidos no foco de
      // mobilidade ou reabilitação — nunca em treinos de força
      if (isSecondaryOnly) {
        if (focus !== "mobility" && focus !== "rehab") return false;
      } else {
        if (!exerciseMatchesEquipment(ex, equipmentProfile!)) return false;
      }
    } else {
      if (!exerciseMatchesEnvironment(ex, environment)) return false;
    }

    // Must match focus
    if (focus !== "full_body" && !exerciseMatchesFocus(ex, focus)) return false;

    // Must not be directly contraindicated — phase-aware check
    const phase = injuries[0]?.phase ?? "chronic";
    const contra = isExerciseContraindicated(ex.slug, conditionIds, phase);
    if (contra.contraindicated) return false;

    // Check spinal load via slug classification (field not present in data)
    const exSpinalLoad = getSlugSpinalLoad(ex.slug ?? "");
    if (!spinalLoadOk(exSpinalLoad, spinalLoadLimit)) return false;

    // Check injured muscles (target muscles)
    const allMuscles = [
      ...ex.targetMuscles.map((m) => m.toLowerCase()),
      ...(ex.tertiaryMuscles ?? []).map((m) => m.toLowerCase()),
    ];
    if (allMuscles.some((m) => injuredMuscles.has(m))) return false;

    return true;
  });

  // ── 4. Sort: prefer compound, fresh muscles, harder exercises first
  const scored = candidates.map((ex) => {
    let score = 0;
    if (ex.mechanic === "compound") score += 3;
    if (ex.utility === "basic") score += 2;

    // Prefer exercises targeting fresh muscles (Fitbod-style)
    const primaryGroups = ex.targetMuscles
      .map((m) => normalizeMuscle(m))
      .filter(Boolean) as MuscleGroup[];
    const avgFreshness = primaryGroups.length > 0
      ? primaryGroups.reduce((sum, g) => sum + (freshnessMap.get(g)?.freshnessPct ?? 100), 0) / primaryGroups.length
      : 100;
    score += (avgFreshness / 100) * 2; // 0–2 points based on muscle freshness

    if (ex.difficulty === fitnessLevel) score += 1;
    if (ex.isRehabSafe) score += 1;
    score += Math.random() * 0.5; // small shuffle for variety
    return { ex, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // ── 5. Select diverse exercises (avoid muscle overlap) ───────────────────
  const selected: Exercise[] = [];
  const usedMuscles = new Set<string>();

  // First pass: pick compound movements
  for (const { ex } of scored) {
    if (selected.length >= maxExercises) break;
    if (ex.mechanic !== "compound") continue;
    const exMuscles = ex.targetMuscles.map((m) => m.toLowerCase());
    const overlap = exMuscles.filter((m) => usedMuscles.has(m)).length;
    if (overlap <= 1) {
      selected.push(ex);
      exMuscles.forEach((m) => usedMuscles.add(m));
    }
  }

  // Second pass: fill with isolation/auxiliary
  for (const { ex } of scored) {
    if (selected.length >= maxExercises) break;
    if (selected.includes(ex)) continue;
    const exMuscles = ex.targetMuscles.map((m) => m.toLowerCase());
    const overlap = exMuscles.filter((m) => usedMuscles.has(m)).length;
    if (overlap === 0 || selected.length < maxExercises - 2) {
      selected.push(ex);
      exMuscles.forEach((m) => usedMuscles.add(m));
    }
  }

  // ── 6. Warn about muscles with low freshness (<30%) ──────────────────────
  const restingGroups = freshness.filter((s) => s.status === "resting");
  if (restingGroups.length > 0) {
    const labels = restingGroups.map((s) => `${GROUP_LABELS[s.group]} (${s.freshnessPct}%)`);
    warnings.push(
      `⚠️ ${labels.join(", ")} ainda em recuperação. Esses músculos foram priorizados por outros com maior frescor.`
    );
  }

  if (injuredMuscles.size > 0) {
    warnings.push(
      `🩹 Exercícios que envolvem ${[...injuredMuscles].join(", ")} foram excluídos por causa das lesões ativas.`
    );
  }

  // ── 7. Build suggestion ───────────────────────────────────────────────────
  const sets = setsForLevel(fitnessLevel);
  const reps = repsForFocus(focus, fitnessLevel);

  const phase = injuries[0]?.phase ?? "chronic";
  const suggestedExercises: SuggestedExercise[] = selected.map((ex) => {
    const cautionCheck = conditionIds.length > 0
      ? isExerciseContraindicated(ex.slug, conditionIds, phase)
      : null;

    // Per-muscle freshness for this exercise
    const primaryGroups = ex.targetMuscles
      .map((m) => normalizeMuscle(m))
      .filter(Boolean) as MuscleGroup[];
    const lowestFreshness = primaryGroups.length > 0
      ? Math.min(...primaryGroups.map((g) => freshnessMap.get(g)?.freshnessPct ?? 100))
      : 100;
    const isPartialRecovery = lowestFreshness < 70 && lowestFreshness >= 30;

    // Reduce sets by 1 for muscles in partial recovery
    const baseSets = setsForLevel(fitnessLevel);
    const adjustedSets = isPartialRecovery ? Math.max(1, baseSets - 1) : baseSets;

    const config: ExerciseSet = {
      sets: adjustedSets,
      reps,
      rest: getRestSeconds(focus, ex.mechanic),
    };

    const exWarnings: string[] = [];
    if (isPartialRecovery) {
      const groupLabel = primaryGroups
        .map((g) => GROUP_LABELS[g])
        .join("/");
      exWarnings.push(`${groupLabel} ${lowestFreshness}% recuperado — série reduzida`);
    }
    if (cautionCheck?.caution && cautionCheck.reason) exWarnings.push(cautionCheck.reason);

    return {
      exerciseId: ex.id,
      reason: buildReason(ex, focus, fitnessLevel),
      config,
      warning: exWarnings.length > 0 ? exWarnings.join(" · ") : undefined,
    };
  });

  const focusLabels: Record<WorkoutFocus, string> = {
    full_body: "Corpo Inteiro",
    upper: "Superior",
    lower: "Inferior",
    push: "Empurrar",
    pull: "Puxar",
    core: "Core",
    rehab: "Reabilitação",
    mobility: "Mobilidade",
  };

  const envLabels: Record<WorkoutEnvironment, string> = {
    home: "Casa",
    gym: "Academia",
    pilates: "Pilates/Mobilidade",
    any: "Qualquer",
  };

  const levelLabels: Record<FitnessLevel, string> = {
    beginner: "Iniciante",
    intermediate: "Intermediário",
    advanced: "Avançado",
  };

  return {
    name: `${focusLabels[focus]} — ${envLabels[environment]} (${levelLabels[fitnessLevel]})`,
    rationale: buildRationale(focus, environment, fitnessLevel, durationMinutes, injuries),
    exercises: suggestedExercises,
    warnings,
  };
}

// ─── Rehab workout builder ────────────────────────────────────────────────────

function buildRehabWorkout(
  injuries: Injury[],
  conditionIds: string[],
  level: FitnessLevel
): WorkoutSuggestion {
  const phase = injuries[0]?.phase ?? "subacute";
  const protocols = getRehabProtocolsForConditions(conditionIds, phase);

  if (protocols.length === 0) {
    return {
      name: "Protocolo de Reabilitação",
      rationale: "Sem protocolo específico encontrado para as condições. Consulte um fisioterapeuta.",
      exercises: [],
      warnings: ["Consulte um profissional de saúde antes de iniciar exercícios de reabilitação."],
      isRehabProtocol: true,
    };
  }

  const protocol = protocols[0];
  const suggestedExercises: SuggestedExercise[] = protocol.exercises.map((ex) => ({
    exerciseId: ex.slug ?? ex.name.toLowerCase().replace(/\s+/g, "-"),
    displayName: ex.name,
    mediaSlug: ex.mediaSlug ?? ex.slug,
    reason: ex.scienceNote ?? ex.description,
    config: {
      sets: ex.sets,
      reps: ex.reps,
      rest: ex.restSeconds,
      notes: ex.description,
    },
  }));

  const conditionNames = [...new Set(
    injuries
      .map((i) => INJURY_CONDITIONS_MAP.get(i.conditionId)?.name)
      .filter(Boolean)
  )];

  return {
    name: protocol.name,
    rationale: `Protocolo baseado em evidências para: ${conditionNames.join(", ")}. Fase: ${phase}. Frequência recomendada: ${protocol.frequency}.`,
    exercises: suggestedExercises,
    warnings: [
      "⚕️ Consulte um fisioterapeuta ou médico antes de iniciar.",
      `📚 Fonte: ${protocol.source}`,
      protocol.notes,
    ],
    isRehabProtocol: true,
    protocolName: protocol.name,
  };
}

// ─── Helper text builders ─────────────────────────────────────────────────────

function buildReason(ex: Exercise, focus: WorkoutFocus, level: FitnessLevel): string {
  const parts: string[] = [];

  if (ex.mechanic === "compound") parts.push("Exercício composto");
  else if (ex.utility === "auxiliary") parts.push("Auxiliar");
  else parts.push("Isolamento");

  if (ex.targetMuscles.length > 0) {
    parts.push(`alvo: ${ex.targetMuscles.slice(0, 2).join(", ")}`);
  }

  if (ex.evidenceLevel === "A") parts.push("evidência A");
  if (ex.isRehabSafe) parts.push("seguro para reabilitação");
  if (ex.difficulty === level) parts.push("dificuldade adequada ao nível");

  return parts.join(" · ");
}

function buildRationale(
  focus: WorkoutFocus,
  env: WorkoutEnvironment,
  level: FitnessLevel,
  duration: number,
  injuries: Injury[]
): string {
  let text = `Treino de ${duration} min para ${level === "beginner" ? "iniciante" : level === "intermediate" ? "intermediário" : "avançado"}.`;

  if (injuries.length > 0) {
    const condNames = injuries
      .map((i) => INJURY_CONDITIONS_MAP.get(i.conditionId)?.name)
      .filter(Boolean)
      .join(", ");
    text += ` Adaptado para: ${condNames}.`;
    text += " Exercícios contraindicados e de alta carga espinal foram removidos.";
  }

  if (focus === "full_body") {
    text += " Selecionados exercícios compostos principais para cada grupo muscular.";
  } else if (focus === "push") {
    text += " Foco em peitorais, ombros e tríceps (padrão de empurrar).";
  } else if (focus === "pull") {
    text += " Foco em costas, bíceps e deltóides posteriores (padrão de puxar).";
  }

  return text;
}

// ─── Workout Templates ────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  targetConditions?: string[]; // injury condition IDs it's safe for
  request: Omit<SuggestionRequest, "injuries" | "recentSessions">;
}

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "hernia-protocolo",
    name: "Protocolo Hérnia de Disco",
    icon: "🦴",
    description: "McGill Big 3 + mobilidade. Ideal para fase subaguda e crônica.",
    targetConditions: ["hernia-lombar", "dor-lombar"],
    request: {
      environment: "home",
      focus: "rehab",
      durationMinutes: 30,
      fitnessLevel: "beginner",
    },
  },
  {
    id: "iniciante-casa",
    name: "Iniciante em Casa",
    icon: "🏠",
    description: "Treino completo só com peso corporal. 3-4x por semana.",
    request: {
      environment: "home",
      focus: "full_body",
      durationMinutes: 30,
      fitnessLevel: "beginner",
    },
  },
  {
    id: "forca-academia",
    name: "Força na Academia",
    icon: "🏋️",
    description: "Exercícios compostos com peso livre. Progressão linear.",
    request: {
      environment: "gym",
      focus: "full_body",
      durationMinutes: 60,
      fitnessLevel: "intermediate",
    },
  },
  {
    id: "pilates-mobilidade",
    name: "Pilates & Mobilidade",
    icon: "🧘",
    description: "Alongamento, mobilidade e reforço muscular suave.",
    targetConditions: ["hernia-lombar", "dor-lombar", "sfp", "osteoartrite-joelho"],
    request: {
      environment: "pilates",
      focus: "mobility",
      durationMinutes: 45,
      fitnessLevel: "beginner",
    },
  },
  {
    id: "upper-intermediario",
    name: "Superior Intermediário",
    icon: "💪",
    description: "Push/Pull para o tronco superior. Academia ou casa com pesos.",
    request: {
      environment: "gym",
      focus: "upper",
      durationMinutes: 45,
      fitnessLevel: "intermediate",
    },
  },
  {
    id: "lower-iniciante",
    name: "Inferior Iniciante",
    icon: "🦵",
    description: "Fortalecimento de quadríceps, glúteos e posteriores.",
    request: {
      environment: "home",
      focus: "lower",
      durationMinutes: 30,
      fitnessLevel: "beginner",
    },
  },
  {
    id: "core-reabilitacao",
    name: "Core para Reabilitação",
    icon: "🔴",
    description: "Fortalecimento do core com mínima carga espinal.",
    targetConditions: ["hernia-lombar", "dor-lombar"],
    request: {
      environment: "home",
      focus: "core",
      durationMinutes: 30,
      fitnessLevel: "beginner",
    },
  },
];
