/**
 * free-exercise-db.ts
 * ----------------------------------------------------------------------------
 * Camada COMPLEMENTAR ao GymApp (gym.joekyy.com.br).
 *
 * Objetivo: importar o dataset público (yuhonas/free-exercise-db, 800+ exercícios,
 * licença Unlicense / domínio público) SEM substituir os exercícios curados.
 *
 * O classificador lombar usa MechanicalDemand + toleranceFor() de lumbar-profile.ts —
 * nunca cravar risco no nome do exercício.
 * ----------------------------------------------------------------------------
 */

import {
  type MechanicalDemand,
  type Tolerance,
  LUMBAR_PROFILE,
  toleranceFor,
  worstTolerance,
} from "./lumbar-profile";

/* ─────────────────────────  1. SCHEMA OFICIAL  ───────────────────────── */

export type Force = "push" | "pull" | "static" | null;
export type Level = "beginner" | "intermediate" | "expert";
export type Mechanic = "compound" | "isolation" | null;
export type Category =
  | "strength"
  | "stretching"
  | "plyometrics"
  | "strongman"
  | "powerlifting"
  | "cardio"
  | "olympic weightlifting";

/** Documento bruto, exatamente como vem do dist/exercises.json */
export interface RawExercise {
  id: string;
  name: string;
  force: Force;
  level: Level;
  mechanic: Mechanic;
  equipment: string | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  instructions: string[];
  category: Category;
  images: string[]; // ex.: "Air_Bike/0.jpg"
}

/* ──────────────────────────  2. FORMATO DO APP  ──────────────────────── */

export type Local = "Casa" | "Smart Fit" | "Ambos";
export type SafetyLevel = "safe" | "caution" | "avoid";

/** Formato existente dos exercícios curados. */
export interface AppExercise {
  n: string;
  eq: string;
  s: string;
  v: string | null;
  slug: string;
  loc: Local;
  steps: string[];
  tip: string;
}

/** Exercício complementar = AppExercise + metadados do dataset + segurança. */
export interface ComplementaryExercise extends AppExercise {
  source: "free-exercise-db";
  images: string[];
  level: Level;
  force: Force;
  mechanic: Mechanic;
  category: Category;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  safety: { level: SafetyLevel; reasons: string[] };
}

/* ─────────────────────────────  3. FONTES  ───────────────────────────── */

export const FED_DIST_JSON =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
export const FED_IMAGE_BASE =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

export async function fetchFreeExerciseDb(
  url: string = FED_DIST_JSON
): Promise<RawExercise[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`free-exercise-db: HTTP ${res.status}`);
  return (await res.json()) as RawExercise[];
}

export const imageUrl = (path: string): string => FED_IMAGE_BASE + path;

/* ─────────────────────  4. MAPEADOR DE DEMANDAS  ─────────────────────── */

/** Razões humanas por demanda mecânica (para exibição no UI). */
const DEMAND_REASONS: Record<MechanicalDemand, string> = {
  lumbar_flexion_loaded:        "Flexão lombar sob carga (alto risco para disco)",
  lumbar_flexion_repeated:      "Flexão lombar repetida em fim de curso",
  rotation_loaded:              "Rotação de tronco sob carga",
  axial_compression_standing:   "Carga axial em pé sobre a coluna",
  end_range_extension:          "Extensão lombar de fim de curso",
  impact_ballistic:             "Padrão impacto/balístico",
  hip_hinge:                    "Dobradiça de quadril — técnica crítica",
  static_prolonged:             "Postura estática prolongada sob tensão",
  anti_movement_core:           "Core anti-movimento (padrão McGill)",
  supported_isolation:          "Isolamento com coluna apoiada",
};

const SUPPORTED_EQUIPMENT = new Set(["machine", "cable", "leverage (machine)"]);

/**
 * Mapeia um exercício para as demandas mecânicas que ele impõe.
 * Cada padrão detectado via nome do exercício, categoria ou equipamento.
 */
export function mapToDemands(ex: RawExercise): MechanicalDemand[] {
  const demands = new Set<MechanicalDemand>();
  const name = ex.name.toLowerCase();

  // lumbar_flexion_loaded: flexão de tronco sob carga
  if (/\b(sit-?up|good morning|jefferson curl|v[- ]?up|jackknife|toe touch|janda|ab roller)\b/.test(name) ||
      /\b(hanging|lying|captain'?s chair).*(leg|knee) raise/.test(name) ||
      /^leg raise\b/.test(name)) {
    demands.add("lumbar_flexion_loaded");
  }

  // lumbar_flexion_repeated: flexão repetida fim de curso
  if (/\b(crunch|roman chair|oblique crunch|cable crunch|decline crunch)\b/.test(name)) {
    demands.add("lumbar_flexion_repeated");
  }

  // rotation_loaded: rotação de tronco sob carga
  if (/\b(russian twist|woodchop|woodchopper|landmine twist|seated.*twist|cable twist|rotational)\b/.test(name)) {
    demands.add("rotation_loaded");
  }

  // olympic weightlifting → axial + balístico
  if (ex.category === "olympic weightlifting" ||
      /\b(clean|snatch|jerk|clean and press)\b/.test(name)) {
    demands.add("impact_ballistic");
    demands.add("axial_compression_standing");
  }

  // plyometrics → impacto
  if (ex.category === "plyometrics" ||
      /\b(box jump|jump squat|tuck jump|burpee|broad jump|depth jump|plyo|bound)\b/.test(name)) {
    demands.add("impact_ballistic");
  }

  // powerlifting / strongman → carga axial
  if (ex.category === "powerlifting" || ex.category === "strongman") {
    demands.add("axial_compression_standing");
  }

  // axial_compression_standing: agachamento com barra, press em pé
  if (/\b(back squat|front squat|overhead squat|zercher|barbell squat|goblet squat|standing.*(overhead|military|shoulder) press|push press|barbell row|bent[- ]?over row)\b/.test(name)) {
    demands.add("axial_compression_standing");
  }

  // hip_hinge: deadlift, RDL, levantamento terra
  if (/\b(deadlift|romanian|rdl|stiff[- ]?leg|sumo|clean pull|snatch pull)\b/.test(name)) {
    demands.add("hip_hinge");
  }

  // end_range_extension
  if (/\b(back extension|hyperextension|superman|cobra pose|locust|donkey kick|prone|hip extension)\b/.test(name)) {
    demands.add("end_range_extension");
  }

  // static_prolonged: postura estática
  if (/\b(wall sit|isometric|static hold|horse stance)\b/.test(name)) {
    demands.add("static_prolonged");
  }

  // anti_movement_core: padrão McGill
  if (/\b(plank|bird[- ]?dog|dead[- ]?bug|pallof|glute bridge|hip thrust|side plank|hollow hold|ab wheel|mcgill|suitcase carry|farmer carry|single[- ]?leg.*bridge)\b/.test(name)) {
    demands.add("anti_movement_core");
  }

  // supported_isolation: máquina, cabo, isolamento com apoio, ou alongamento
  if (
    (ex.equipment !== null && SUPPORTED_EQUIPMENT.has(ex.equipment ?? "")) ||
    ex.mechanic === "isolation" ||
    ex.category === "stretching" ||
    ex.category === "cardio"
  ) {
    demands.add("supported_isolation");
  }

  return Array.from(demands);
}

/* ─────────────────────  5. CLASSIFICADOR LOMBAR  ─────────────────────── */

const TOLERANCE_TO_SAFETY: Record<Tolerance, SafetyLevel> = {
  ok: "safe",
  caution: "caution",
  avoid: "avoid",
};

/**
 * Classifica a segurança lombar de um exercício usando MechanicalDemand +
 * toleranceFor() do perfil. Nunca cravar risco no nome — sempre via demanda.
 */
export function classifyLumbarSafety(ex: RawExercise): {
  level: SafetyLevel;
  reasons: string[];
} {
  const demands = mapToDemands(ex);

  if (demands.length === 0) {
    return {
      level: "caution",
      reasons: ["Padrão mecânico não identificado — revise a execução antes de incluir no treino"],
    };
  }

  const worstTol = worstTolerance(demands, LUMBAR_PROFILE);
  const worstSafety = TOLERANCE_TO_SAFETY[worstTol];

  // Reasons = demands whose tolerance matches the worst
  const reasons = demands
    .filter((d) => toleranceFor(d, LUMBAR_PROFILE) === worstTol)
    .map((d) => DEMAND_REASONS[d]);

  return { level: worstSafety, reasons: reasons.length > 0 ? reasons : [DEMAND_REASONS[demands[0]]] };
}

/* ──────────────────────────  6. ADAPTADOR  ───────────────────────────── */

const SETS_BY_CATEGORY: Record<Category, string> = {
  strength: "3×10-12",
  stretching: "2×30s",
  plyometrics: "3×8",
  cardio: "—",
  strongman: "3×6",
  powerlifting: "3×5",
  "olympic weightlifting": "3×5",
};

const HOME_EQUIPMENT = new Set([
  "body only", "none", "bands", "exercise ball", "foam roll", "medicine ball", "stability ball",
]);
const BOTH_EQUIPMENT = new Set([
  "dumbbell", "kettlebell", "barbell", "e-z curl bar", "weighted",
]);

function deriveLocal(equipment: string | null): Local {
  if (!equipment || HOME_EQUIPMENT.has(equipment)) return "Casa";
  if (BOTH_EQUIPMENT.has(equipment)) return "Ambos";
  return "Smart Fit";
}

/** EN → PT para exibição dos músculos. */
const MUSCLE_PT: Record<string, string> = {
  abdominals: "abdômen", abductors: "abdutores", adductors: "adutores",
  biceps: "bíceps", calves: "panturrilha", chest: "peitoral", forearms: "antebraço",
  glutes: "glúteos", hamstrings: "posteriores", lats: "dorsais",
  "lower back": "lombar", "middle back": "costas (meio)", neck: "pescoço",
  quadriceps: "quadríceps", shoulders: "ombros", traps: "trapézio", triceps: "tríceps",
};
export const musclePT = (m: string): string => MUSCLE_PT[m] ?? m;

/** Adapta UM exercício bruto para o formato complementar do GymApp. */
export function adaptExercise(ex: RawExercise): ComplementaryExercise {
  const safety = classifyLumbarSafety(ex);
  const eqLabel = [ex.equipment, ex.mechanic].filter(Boolean).join(" · ") || "—";

  return {
    n: ex.name,
    eq: eqLabel,
    s: SETS_BY_CATEGORY[ex.category] ?? "3×12",
    v: null,
    slug: ex.id,
    loc: deriveLocal(ex.equipment),
    steps: ex.instructions,
    tip: safety.reasons[0] ?? "",
    source: "free-exercise-db",
    images: ex.images.map(imageUrl),
    level: ex.level,
    force: ex.force,
    mechanic: ex.mechanic,
    category: ex.category,
    primaryMuscles: ex.primaryMuscles,
    secondaryMuscles: ex.secondaryMuscles,
    safety,
  };
}

/** Adapta o dataset inteiro. */
export function adaptAll(raw: RawExercise[]): ComplementaryExercise[] {
  return raw.map(adaptExercise);
}

/** Atalho: busca + adapta. Filtra exercícios "avoid" se requested. */
export async function loadComplementaryLibrary(
  url?: string
): Promise<ComplementaryExercise[]> {
  return adaptAll(await fetchFreeExerciseDb(url));
}
