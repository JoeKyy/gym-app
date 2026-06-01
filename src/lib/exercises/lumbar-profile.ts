/**
 * lumbar-profile.ts
 * ----------------------------------------------------------------------------
 * FONTE ÚNICA DA VERDADE do quadro lombar. O classificador (free-exercise-db.ts)
 * importa daqui; o Copilot lê este arquivo como contexto. Em vez de cravar o
 * risco no NOME do exercício, descrevemos:
 *   (a) o que cada exercício EXIGE da coluna  → MechanicalDemand (universal)
 *   (b) o que a SUA coluna TOLERA hoje        → este perfil (pessoal, editável)
 *
 * Assim, ajustar o app à evolução do seu quadro = editar UM arquivo, sem mexer
 * na lógica. Tudo que for clínico específico está marcado como "// PREENCHER".
 *
 * ⚠️ Triagem, não laudo. Confirme com o fisioterapeuta antes de fixar regras de
 * extensão. A regra que manda em tudo é a periferização (ver stopRules).
 * ----------------------------------------------------------------------------
 */

/** Demandas mecânicas que um exercício impõe à coluna lombar. */
export type MechanicalDemand =
  | "lumbar_flexion_loaded"     // flexão de tronco sob carga (sit-up, jefferson curl)
  | "lumbar_flexion_repeated"   // flexão repetida fim de curso (crunch, toe touch)
  | "rotation_loaded"           // rotação de tronco sob carga (russian twist, woodchop)
  | "axial_compression_standing"// carga axial em pé (back squat, overhead press)
  | "end_range_extension"       // extensão fim de curso (hyperextension, cobra)
  | "impact_ballistic"          // impacto/balístico (box jump, burpee, clean)
  | "hip_hinge"                 // dobradiça de quadril (deadlift/RDL) — cisalhamento, técnica
  | "static_prolonged"          // postura estática prolongada sob tensão
  | "anti_movement_core"        // core anti-movimento (plank, pallof, bird-dog)
  | "supported_isolation";      // isolamento com apoio de coluna (máquina, cabo)

export type Tolerance = "ok" | "caution" | "avoid";
export type Phase = 1 | 2 | 3 | 4;            // 1 acalmar · 2 reprogramar · 3 blindar · 4 performance
export type DayState = "good" | "tense" | "crisis";
export type DirectionalPreference = "extension" | "flexion" | "neutral" | "unknown";

export interface LumbarProfile {
  meta: {
    owner: string;
    updatedAt: string;        // ISO — atualize quando reavaliar
    reviewedByClinician: boolean;
  };

  /** Achados — preencha a partir do SEU laudo/fisio, não chute. */
  condition: {
    level: string;            // ex.: "L4-L5"
    findings: string[];       // ex.: ["extrusão", "Modic I", "protrusões adjacentes"]
    nerveContact: string | null; // ex.: "raiz L5" ou null se não confirmado // PREENCHER
    notes: string;            // contexto livre p/ humano e p/ Copilot
  };

  /** Estado atual — muda com frequência; alimenta o check-in diário. */
  phase: Phase;
  state: DayState;
  directionalPreference: DirectionalPreference;

  /**
   * Tolerância BASE por demanda mecânica (estado "good", fase atual).
   * Conservador por padrão. Os modificadores abaixo ajustam por fase/estado/preferência.
   */
  tolerances: Record<MechanicalDemand, Tolerance>;

  /** Regras de parada inegociáveis — texto puro, pra app e pra Copilot. */
  stopRules: string[];

  /** Padrões preferidos (sinais positivos de segurança). */
  preferred: string[];
}

/* ───────────────────────────  SEU PERFIL  ──────────────────────────── */

export const LUMBAR_PROFILE: LumbarProfile = {
  meta: {
    owner: "Jhomar",
    updatedAt: "2026-05-31",
    reviewedByClinician: false,   // vire true após validar com o fisio
  },

  condition: {
    level: "L4-L5",
    findings: ["extrusão discal", "Modic I", "protrusões em níveis adjacentes"],
    nerveContact: null,           // PREENCHER se o laudo confirmar contato radicular
    notes:
      "Modic I sugere componente inflamatório/sensível a carga. " +
      "Priorizar carga controlada, hip hinge bem ensinado e core de endurance.",
  },

  phase: 2,
  state: "good",
  directionalPreference: "unknown", // PREENCHER após teste de preferência com o fisio

  tolerances: {
    lumbar_flexion_loaded: "avoid",
    lumbar_flexion_repeated: "avoid",
    rotation_loaded: "avoid",
    impact_ballistic: "caution",
    axial_compression_standing: "caution",
    hip_hinge: "caution",
    end_range_extension: "caution",   // vira "ok" se directionalPreference = extension
    static_prolonged: "caution",
    anti_movement_core: "ok",
    supported_isolation: "ok",
  },

  stopRules: [
    "PERIFERIZAÇÃO: qualquer exercício que aumente ou irradie dor/formigamento " +
      "DESCENDO pela perna → parar imediatamente, independente da classificação.",
    "Centralização (a dor recua para a lombar) = sinal de que está no caminho certo.",
    "Perda de força ou sensibilidade na perna, ou alteração de controle de bexiga/intestino " +
      "→ não treinar, procurar avaliação médica.",
  ],

  preferred: [
    "Core anti-movimento (McGill Big 3): curl-up, side plank, bird-dog em endurance.",
    "Máquinas com encosto / exercícios isolados com coluna apoiada.",
    "Hip hinge ensinado e progressivo no lugar de flexão lombar carregada.",
    "Caminhada e mobilidade de quadril/torácica.",
  ],
};

/* ─────────────────────  RESOLVEDOR DE TOLERÂNCIA  ───────────────────── */

const WORST: Record<Tolerance, number> = { ok: 0, caution: 1, avoid: 2 };
const downgrade = (t: Tolerance): Tolerance => (t === "ok" ? "caution" : "avoid");

/**
 * Tolerância EFETIVA para uma demanda, aplicando os modificadores de
 * preferência direcional, estado do dia e fase. Esta é a função que o
 * classificador deve chamar (em vez de níveis fixos).
 */
export function toleranceFor(
  demand: MechanicalDemand,
  p: LumbarProfile = LUMBAR_PROFILE
): Tolerance {
  let t = p.tolerances[demand];

  // 1) preferência direcional libera/restringe extensão de fim de curso
  if (demand === "end_range_extension") {
    if (p.directionalPreference === "extension") t = "ok";
    else if (p.directionalPreference === "flexion") t = "avoid";
  }

  // 2) estado do dia endurece tudo
  if (p.state === "crisis") {
    // em crise só sobra core leve / isolado apoiado
    if (demand !== "anti_movement_core" && demand !== "supported_isolation") return "avoid";
    t = demand === "anti_movement_core" ? "caution" : t;
  } else if (p.state === "tense") {
    if (demand === "impact_ballistic" || demand === "axial_compression_standing") t = downgrade(t);
  }

  // 3) fase inicial é mais conservadora com carga axial e dobradiça
  if (p.phase <= 1 && (demand === "axial_compression_standing" || demand === "hip_hinge")) {
    t = downgrade(t);
  }

  return t;
}

/** Pior tolerância de uma lista de demandas (define o nível do exercício). */
export function worstTolerance(
  demands: MechanicalDemand[],
  p: LumbarProfile = LUMBAR_PROFILE
): Tolerance {
  return demands.reduce<Tolerance>(
    (acc, d) => (WORST[toleranceFor(d, p)] > WORST[acc] ? toleranceFor(d, p) : acc),
    "ok"
  );
}
