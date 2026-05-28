// ─── Exercise (from scraper / exercises.json) ───────────────────────────────

export type MediaType = "video" | "gif" | "none";

export interface VideoUrls {
  frontMale?: string;
  sideMale?: string;
  frontFemale?: string;
  sideFemale?: string;
}

export interface Exercise {
  id: string;
  name: string;
  slug: string;
  source?: string;          // "wger" | "kaggle" | "musclewiki" | "exrx"
  category?: string;        // equipment category (barbell, dumbbells, etc.)
  difficulty?: string;      // beginner | intermediate | advanced | novice
  force?: string;           // push | pull | static
  mechanic?: string;        // isolation | compound
  utility?: "basic" | "auxiliary" | "ancillary";
  grips?: string[];
  tags?: string[];
  targetMuscles: string[];
  secondaryMuscles: string[];
  tertiaryMuscles?: string[];
  bodyParts: string[];
  equipments: string[];
  mediaType: MediaType;
  videoUrls?: VideoUrls;
  gifUrl?: string;
  instructions: string[];
  instructions_pt?: string[];
  musclewikiUrl?: string;
  exrxUrl?: string;
  wgerUrl?: string;
  // ─── Scientific layer ────────────────────────────────────────────────────
  evidenceLevel?: "A" | "B" | "C";     // A=RCT/meta-analysis, B=observational, C=expert
  spinalLoad?: "low" | "medium" | "high";
  emgActivation?: Record<string, number>; // muscle → % max activation
  contraindications?: string[];           // clinical condition IDs
  rehabPhase?: "acute" | "subacute" | "chronic" | "performance";
  isRehabSafe?: boolean;
  sources?: string[];                     // cited references
}

// ─── Clinical Injury System ───────────────────────────────────────────────────

export type InjuryPhase = "acute" | "subacute" | "chronic" | "recovered";
export type InjurySeverity = "recovering" | "injured"; // kept for backwards compat

/** Weekly pain check-in recorded by the user */
export interface InjuryCheckIn {
  date: string;                  // ISO date
  severity: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface Injury {
  id: string;
  conditionId: string;           // key from INJURY_CONDITIONS library
  customLabel?: string;          // override display name
  affectedMuscles: string[];     // muscle names that are injured
  severity: 1 | 2 | 3 | 4 | 5; // 1=mild discomfort, 5=severe/surgery
  phase: InjuryPhase;
  startDate: string;             // ISO date
  expectedRecovery?: string;     // ISO date (optional)
  notes?: string;
  whenItHurts?: string[];        // "rest" | "load" | "range_of_motion"
  checkIns?: InjuryCheckIn[];    // chronological pain check-in history
}

// Legacy type — kept so existing localStorage data still loads
export interface InjuredMuscle {
  muscle: string;
  severity: InjurySeverity;
}

// ─── Workout ──────────────────────────────────────────────────────────────────

export type WorkoutEnvironment = "home" | "gym" | "pilates" | "any";

export interface ExerciseSet {
  sets: number;
  reps: number | string; // "AMRAP", "hold 30s", "12-15", etc.
  rest: number; // seconds
  notes?: string;
}

export interface WorkoutExercise {
  exerciseId: string;
  config: ExerciseSet;
  supersetGroupId?: string; // exercises sharing the same groupId are paired as a superset
}

export interface Workout {
  id: string;
  name: string;
  environment: WorkoutEnvironment;
  exercises: WorkoutExercise[];
  createdAt: string;
  updatedAt: string;
}

// ─── Weekly Plan ─────────────────────────────────────────────────────────────

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type WeeklySchedule = Partial<Record<DayOfWeek, string[]>>; // day → workout IDs

export interface WeeklyPlan {
  id: string;
  name: string;
  schedule: WeeklySchedule;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Progress Tracking ────────────────────────────────────────────────────────

export interface SetLog {
  reps: number | string;
  weight?: number;       // kg, optional
  rpe?: number;          // Rate of Perceived Exertion 1-10
  completed: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  workoutId?: string;   // if based on a saved workout
  workoutName: string;
  date: string;         // ISO date (YYYY-MM-DD)
  startedAt: string;    // ISO datetime
  finishedAt?: string;
  durationMinutes?: number;
  exercises: ExerciseLog[];
  rating?: 1 | 2 | 3 | 4 | 5; // session feel
  rir?: number;                 // Reps in Reserve (0=failure, 5=very easy)
  notes?: string;
  // ─── Health / external sync ───────────────────────────────────────────────
  heartRateAvg?: number;       // bpm
  heartRateMax?: number;       // bpm
  calories?: number;           // kcal (active calories)
  stravaActivityId?: string;   // prevents duplicate exports
  externalSource?: "strava" | "apple_health";
}

// ─── Workout Suggestion ───────────────────────────────────────────────────────

export type FitnessLevel = "beginner" | "intermediate" | "advanced";
export type WorkoutFocus = "full_body" | "upper" | "lower" | "push" | "pull" | "core" | "rehab" | "mobility";

// ─── Muscle Recovery (Fitbod-style freshness model) ──────────────────────────

/** Canonical muscle group keys used in the recovery system */
export type MuscleGroup =
  | "biceps"
  | "triceps"
  | "calves"
  | "forearms"
  | "chest"
  | "shoulders"
  | "core"
  | "quadriceps"
  | "hamstrings"
  | "glutes"
  | "lats"
  | "upper_back"
  | "lower_back";

export interface MuscleRecoveryStatus {
  group: MuscleGroup;
  /** 0–100: 0% = just trained, 100% = fully recovered */
  freshnessPct: number;
  /** Remaining hours until fully recovered (0 when ready) */
  hoursRemaining: number;
  /** ISO datetime of most recent training session for this group */
  lastTrainedAt: string | null;
  /** Semantic status derived from freshnessPct */
  status: "ready" | "partial" | "resting";
}

export interface SuggestionRequest {
  environment: WorkoutEnvironment;
  focus: WorkoutFocus;
  durationMinutes: 20 | 30 | 45 | 60;
  fitnessLevel: FitnessLevel;
  injuries: Injury[];
  recentSessions: WorkoutSession[]; // last 7 days
  /** IDs dos equipamentos disponíveis (de equipment.ts). Quando fornecido,
   *  substitui o filtro genérico por ambiente — mais preciso. */
  equipmentProfile?: string[];
}

export interface SuggestedExercise {
  exerciseId: string;
  displayName?: string; // for rehab exercises not in the exercises database
  mediaSlug?: string;   // fallback media slug for rehab exercises
  reason: string;     // why this exercise was selected
  config: ExerciseSet;
  warning?: string;   // if slightly risky but manageable
}

export interface WorkoutSuggestion {
  name: string;
  rationale: string;
  exercises: SuggestedExercise[];
  warnings: string[];
  isRehabProtocol?: boolean;
  protocolName?: string;  // e.g. "McGill Big 3"
}

// ─── User Profile (Fitbod-style "My Plan") ───────────────────────────────────

export type FitnessGoal =
  | "build_muscle"
  | "get_stronger"
  | "get_lean"
  | "general_fitness"
  | "rehab";

export type TrainingSplit =
  | "fresh_muscle"
  | "full_body"
  | "upper_lower"
  | "ppl";

export interface UserProfile {
  goal: FitnessGoal;
  experienceLevel: FitnessLevel;
  split: TrainingSplit;
  durationMinutes: 30 | 45 | 60 | 75 | 90;
  units: "kg" | "lb";
  bodyStats: {
    age?: number;
    weight?: number;    // kg
    height?: number;    // cm
    gender?: "male" | "female" | "other";
  };
}

// ─── Exercise Preferences (Fitbod-style Recommend More/Less/Exclude) ─────────

export type ExercisePreferenceState = "default" | "more" | "less" | "excluded";

export interface ExercisePreference {
  exerciseId: string;
  state: ExercisePreferenceState;
}

// ─── App State ───────────────────────────────────────────────────────────────

export interface AppFilters {
  search: string;
  bodyPart: string;
  equipment: string;
  environment: WorkoutEnvironment | "all";
  hideRisky: boolean;
  myEquipmentOnly?: boolean;
}
