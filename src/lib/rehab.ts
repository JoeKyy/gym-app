/**
 * rehab.ts — Evidence-based rehabilitation protocols and injury condition library.
 *
 * Sources:
 * - McGill, S. (2015). Back Mechanic. Backfitpro Inc.
 * - McKenzie, R. (1981). The Lumbar Spine: Mechanical Diagnosis & Therapy.
 * - ACSM Guidelines for Exercise Testing and Prescription (11th ed.)
 * - Escamilla et al. (2010). Knee biomechanics during resistance training. Sports Health.
 * - Ludewig et al. (2011). Shoulder muscle activity. Journal of Orthopaedic & Sports PT.
 */

// ─── Injury Condition Library ─────────────────────────────────────────────────

export interface InjuryCondition {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  affectedMuscles: string[];
  // Exercise spinal load limits per phase
  spinalLoadLimit: Record<string, "low" | "medium" | "high">;
  // Blocked in ALL phases — absolute contraindications
  contraindicatedPatterns: string[];
  // Blocked only in acute + subacute (ok to attempt in chronic/performance with care)
  contraindicatedAcuteSubacute: string[];
  // Allow but show warning — risky, needs form awareness
  cautionPatterns: string[];
  // Recommended exercises per phase (slugs or categories)
  recommendedCategories: Record<string, string[]>;
  description: string;
  phaseDescriptions: Record<string, string>;
}

export const INJURY_CONDITIONS: InjuryCondition[] = [
  {
    id: "hernia-lombar",
    name: "Hérnia de Disco Lombar",
    nameEn: "Lumbar Disc Herniation",
    icon: "🦴",
    affectedMuscles: ["lower back", "erector spinae", "iliopsoas", "piriformis", "spine"],
    spinalLoadLimit: {
      acute: "low",
      subacute: "low",
      chronic: "medium",
      performance: "high",
    },
    // Absolute: never recommended, regardless of phase — high disc compression + shear
    contraindicatedPatterns: [
      "jefferson-curl",       // max spinal flexion + load
      "sit-up",               // 10x disc compression vs McGill curl-up (McGill 2015)
      "russian-twist",        // rotation + flexion simultaneously
      "seated-twist",         // axial rotation under spinal load
      "windmill",             // extreme lateral bend + rotation
      "toe-touch",            // standing forward flexion
      "standing-good-morning",// pure spinal flexion against gravity
    ],
    // Blocked in acute + subacute (may be cautiously reintroduced in chronic with form supervision)
    contraindicatedAcuteSubacute: [
      "deadlift",             // high axial + shear load (all variants)
      "good-morning",         // hip-hinge with spinal flexion
      "bent-over-row",        // sustained flexion position
      "barbell-row",          // high spinal shear
      "pendlay-row",          // barbell rows
      "leg-press",            // lumbar flexion under load at end range
      "back-extension",       // extension overload
      "hyperextension",       // spinal hyperextension
      "crunch",               // spinal flexion
      "leg-raise",            // hip flexors pull on L4-L5
      "hanging-leg",          // hip flexor tension on discs
      "hanging-knee",         // same
      "box-jump",             // impact load
      "jump-squat",           // impact
      "burpee",               // spinal flexion + impact
      "nordic",               // extreme hamstring stretch + lumbar
      "glute-ham-raise",      // similar to nordic
      "barbell-back-squat",   // axial compression
      "barbell-banded-back-squat",
      "barbell-heels-up-back-squat",
      "barbell-hack-squat",
      "barbell-zercher-squat",
      "barbell-front-squat",
      "hack-squat",           // machine/barbell deep axial load
    ],
    // Allow but warn — risk depends on form and load
    cautionPatterns: [
      "deadlift",             // in chronic phase: require neutral spine form
      "squat",                // monitor lumbar position
      "lunge",                // forward lean risk
      "hip-hinge",
      "romanian-deadlift",
      "stiff-leg",
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches"],
      subacute: ["recovery", "stretches", "yoga", "bodyweight"],
      chronic: ["bodyweight", "stretches", "yoga", "band", "pilates"],
      performance: ["bodyweight", "band", "cables", "dumbbells"],
    },
    description:
      "Protrusão ou extrusão de material do disco intervertebral. Requer redução de carga compressiva e cisalhamento na coluna lombar. Protocolo McGill Big 3 é primeira linha.",
    phaseDescriptions: {
      acute: "1-2 semanas: repouso relativo, somente McGill Big 3 e mobilização suave.",
      subacute: "2-6 semanas: adicionar extensões McKenzie, fortalecimento progressivo do core.",
      chronic: "6+ semanas: exercícios de baixo impacto, pilates, natação, fortalecimento funcional.",
      performance: "Retorno ao exercício completo com consciência postural permanente.",
    },
  },
  {
    id: "hernia-cervical",
    name: "Hérnia de Disco Cervical",
    nameEn: "Cervical Disc Herniation",
    icon: "🦴",
    affectedMuscles: ["neck", "traps", "traps (mid-back)", "upper back"],
    spinalLoadLimit: {
      acute: "low",
      subacute: "low",
      chronic: "medium",
      performance: "medium",
    },
    contraindicatedPatterns: [
      "behind-neck",          // extreme cervical compression
      "neck-extension",       // loaded cervical extension
      "neck-flexion",         // loaded cervical flexion
      "neck-rotation",        // loaded rotation
      "upright-row",          // cervical compression + shoulder impingement
    ],
    contraindicatedAcuteSubacute: [
      "overhead-press",       // axial cervical load
      "overhead-squat",       // cervical + thoracic
      "barbell-squat",        // bar rests on neck/traps area
      "barbell-back-squat",
      "barbell-front-squat",
      "deadlift",             // isometric cervical load
      "shrug",                // direct trap/cervical compression
      "clean",                // impact to cervical area
      "snatch",
      "power-clean",
    ],
    cautionPatterns: [
      "overhead",             // any overhead work
      "shrug",
      "pull-up",              // traction - can help or hurt depending on herniation direction
      "lat-pulldown",
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches"],
      subacute: ["recovery", "stretches", "yoga"],
      chronic: ["bodyweight", "stretches", "band", "dumbbells"],
      performance: ["dumbbells", "cables", "band"],
    },
    description:
      "Compressão das raízes nervosas cervicais. Evitar carga axial na coluna cervical e movimentos de extensão forçada.",
    phaseDescriptions: {
      acute: "1-2 semanas: retração cervical (chin tuck), mobilização suave.",
      subacute: "2-6 semanas: fortalecimento cervical isométrico, estabilização escapular.",
      chronic: "6+ semanas: exercícios funcionais sem carga cervical direta.",
      performance: "Exercícios completos evitando overhead pesado.",
    },
  },
  {
    id: "impacto-ombro",
    name: "Síndrome do Impacto do Ombro",
    nameEn: "Shoulder Impingement Syndrome",
    icon: "💪",
    affectedMuscles: ["shoulders", "rotator cuff", "rear delts", "serratus anterior"],
    spinalLoadLimit: { acute: "low", subacute: "medium", chronic: "medium", performance: "high" },
    contraindicatedPatterns: [
      "upright-row",          // worst: internal rotation + abduction = impingement position
      "behind-neck",          // extreme internal rotation + horizontal extension
      "full-lateral-raise",   // above-90° abduction compresses subacromial space
    ],
    contraindicatedAcuteSubacute: [
      "overhead-press",       // impingement arc (60-120°)
      "arnold-press",         // rotation through impingement arc
      "dip",                  // anterior capsule + subacromial stress
      "bench-dips",
      "muscle-up",
      "kipping",
      "overhead-squat",
    ],
    cautionPatterns: [
      "overhead",             // all overhead movements
      "lateral-raise",        // monitor range — stop at 90°
      "bench-press",          // anterior capsule stress at bottom
      "chest-fly",
      "push-up",              // protraction-based, often ok
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches"],
      subacute: ["band", "recovery"],
      chronic: ["band", "cables", "dumbbells", "bodyweight"],
      performance: ["dumbbells", "cables", "barbell"],
    },
    description:
      "Compressão dos tendões do manguito rotador no espaço subacromial. Foco em estabilização escapular e fortalecimento do manguito.",
    phaseDescriptions: {
      acute: "Evitar amplitude acima de 90° e rotação interna forçada.",
      subacute: "Exercícios com band para rotadores externos e serrátil.",
      chronic: "Fortalecimento progressivo do complexo do ombro.",
      performance: "Retorno ao treino completo com boa mecânica.",
    },
  },
  {
    id: "lesao-manguito",
    name: "Lesão do Manguito Rotador",
    nameEn: "Rotator Cuff Tear",
    icon: "💪",
    affectedMuscles: ["rotator cuff", "shoulders", "rear delts"],
    spinalLoadLimit: { acute: "low", subacute: "low", chronic: "medium", performance: "high" },
    contraindicatedPatterns: [
      "upright-row",          // impingement + shear on rotator tendons
      "behind-neck",          // extreme ROM + rotator stress
      "muscle-up",            // high rotator cuff load
      "kipping",              // ballistic rotator stress
    ],
    contraindicatedAcuteSubacute: [
      "overhead-press",       // load through impingement arc
      "bench-press",          // pectoralis pull on anterior rotator in wide grip
      "pull-up",              // traction on torn rotator
      "chin-up",
      "lat-pulldown",         // overhead traction
      "dip",                  // inferior traction + internal rotation
      "bench-dips",
      "chest-fly",            // horizontal adduction with rotator load
      "overhead-squat",
      "snatch",
      "clean",
    ],
    cautionPatterns: [
      "overhead",
      "lateral-raise",
      "row",                  // posterior rotator may be ok with low load
      "face-pull",            // often therapeutic but monitor
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches"],
      subacute: ["band", "recovery"],
      chronic: ["band", "cables"],
      performance: ["dumbbells", "cables"],
    },
    description:
      "Lesão parcial ou total dos tendões do manguito rotador. Progressão extremamente gradual. Pode requerer cirurgia em grau III.",
    phaseDescriptions: {
      acute: "Imobilização relativa, crioterapia, pendulum exercises.",
      subacute: "Rotação externa com band em ângulo neutro.",
      chronic: "Fortalecimento progressivo do manguito.",
      performance: "Retorno supervisionado ao esporte/treino.",
    },
  },
  {
    id: "tendinopatia-patelar",
    name: "Tendinopatia Patelar",
    nameEn: "Patellar Tendinopathy",
    icon: "🦵",
    affectedMuscles: ["quadriceps", "hamstrings"],
    spinalLoadLimit: { acute: "low", subacute: "medium", chronic: "medium", performance: "high" },
    contraindicatedPatterns: [
      "box-jump",             // peak patellar tendon load on landing
      "jump-squat",           // ballistic tendon stress
      "single-leg-box-jump",
      "seated-box-jump",
      "plyometric",
      "leg-extension",        // maximum patellar tendon tension in open chain (Escamilla 2001)
    ],
    contraindicatedAcuteSubacute: [
      "deep-squat",           // high knee flexion angle
      "barbell-squat",        // deep knee flexion + axial load
      "barbell-front-squat",  // anterior knee stress
      "lunge",                // deep forward lunge
      "step-down",            // eccentric knee control under patellar tendon load
      "nordic",               // peak hamstring - quad co-contraction stress
      "glute-ham-raise",
      "burpee",               // landing impact
      "jump",                 // all jumping
    ],
    cautionPatterns: [
      "squat",                // keep above 60° knee flexion in early phases
      "lunge",                // shallow lunges may be ok
      "leg-press",            // limit range to avoid full flexion
      "step-up",
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches"],
      subacute: ["bodyweight", "stretches"],
      chronic: ["bodyweight", "band", "cables"],
      performance: ["bodyweight", "band", "dumbbells"],
    },
    description:
      "Degeneração do tendão patelar. Protocolo de cargas excêntricas (Alfredson) é padrão-ouro.",
    phaseDescriptions: {
      acute: "Descarga relativa, gelo, exercícios isométricos (wall sit).",
      subacute: "Eccentric decline squats, isometria do quadríceps.",
      chronic: "Progressão excêntrica + concêntrica.",
      performance: "Retorno ao salto/corrida graduado.",
    },
  },
  {
    id: "sfp",
    name: "Síndrome Patelo-Femoral",
    nameEn: "Patellofemoral Pain Syndrome",
    icon: "🦵",
    affectedMuscles: ["quadriceps", "hip flexors", "adductors", "inner thighs"],
    spinalLoadLimit: { acute: "low", subacute: "medium", chronic: "medium", performance: "high" },
    contraindicatedPatterns: [
      "leg-extension",        // open chain, max patellofemoral compression at 90°
      "box-jump",
      "jump-squat",
      "plyometric",
    ],
    contraindicatedAcuteSubacute: [
      "squat-deep",
      "front-squat",
      "lunge-deep",
      "step-down",            // eccentric patellar load
      "nordic",
      "leg-press",            // full range knee flexion
      "burpee",
      "jump",
    ],
    cautionPatterns: [
      "squat",                // limit to 60° flexion
      "lunge",
      "step-up",
      "cycling",
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches", "yoga"],
      subacute: ["band", "bodyweight", "stretches"],
      chronic: ["band", "bodyweight", "cables"],
      performance: ["bodyweight", "dumbbells", "cables"],
    },
    description:
      "Dor na região anterior do joelho. Foco em fortalecimento do glúteo médio e VMO para corrigir dinâmica patelar.",
    phaseDescriptions: {
      acute: "Evitar flexão >60° do joelho, fortalecimento do glúteo médio.",
      subacute: "Exercícios de cadeia cinética fechada de baixa amplitude.",
      chronic: "Fortalecimento funcional completo.",
      performance: "Retorno ao esporte com boa mecânica de joelho.",
    },
  },
  {
    id: "osteoartrite-joelho",
    name: "Osteoartrite de Joelho",
    nameEn: "Knee Osteoarthritis",
    icon: "🦵",
    affectedMuscles: ["quadriceps", "hamstrings", "calves"],
    spinalLoadLimit: { acute: "low", subacute: "medium", chronic: "medium", performance: "medium" },
    contraindicatedPatterns: [
      "box-jump",
      "jump-squat",
      "single-leg-box-jump",
      "jump",                 // impact loading on arthritic joint
      "plyometric",
      "running",              // high-impact
      "sprint",
    ],
    contraindicatedAcuteSubacute: [
      "squat-deep",
      "leg-press-full",
      "lunge-deep",
      "nordic",
      "leg-extension",        // shear forces on arthritic patella
      "burpee",
    ],
    cautionPatterns: [
      "squat",
      "lunge",
      "leg-press",            // limit range
      "step-up",
      "step-down",
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches"],
      subacute: ["bodyweight", "stretches", "yoga"],
      chronic: ["bodyweight", "band", "cables", "recovery"],
      performance: ["bodyweight", "band", "dumbbells"],
    },
    description:
      "Degeneração da cartilagem articular. Exercício é terapêutico — ACSM recomenda 150min/semana de exercício aeróbico de baixo impacto.",
    phaseDescriptions: {
      acute: "Aqua therapy, mobilização suave.",
      subacute: "Fortalecimento do quadríceps em amplitude reduzida.",
      chronic: "Exercício funcional regular, baixo impacto.",
      performance: "Manutenção com exercícios de baixo impacto.",
    },
  },
  {
    id: "epicondilite-lateral",
    name: "Epicondilite Lateral (Cotovelo de Tenista)",
    nameEn: "Lateral Epicondylitis",
    icon: "💪",
    affectedMuscles: ["forearms", "wrist flexors"],
    spinalLoadLimit: { acute: "low", subacute: "medium", chronic: "medium", performance: "high" },
    contraindicatedPatterns: [
      "wrist-curl",           // loaded wrist flexion/extension — direct tendon stress
      "reverse-wrist-curl",
      "wrist-extension",
    ],
    contraindicatedAcuteSubacute: [
      "pull-up",              // gripping load on lateral epicondyle
      "chin-up",
      "barbell-curl",         // wrist supination + elbow flexion load
      "dumbbell-curl",
      "hammer-curl",
      "reverse-curl",
      "preacher-curl",
      "cable-curl",
      "grip",                 // any direct grip strengthening
      "farmer",               // farmer carries
      "deadlift",             // grip + wrist load
      "kettlebell",           // kettlebell grip
      "row",                  // gripping + wrist deviation
    ],
    cautionPatterns: [
      "pull-up",
      "curl",
      "row",
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches"],
      subacute: ["band", "stretches"],
      chronic: ["band", "cables", "dumbbells"],
      performance: ["dumbbells", "cables"],
    },
    description:
      "Inflamação/degeneração dos tendões extensores do punho na inserção no epicôndilo lateral. Protocolo Tyler (band) é eficaz.",
    phaseDescriptions: {
      acute: "Repouso, crioterapia, órtese de contrapressão.",
      subacute: "Alongamentos excêntricos dos extensores.",
      chronic: "Tyler twist com theraband, fortalecimento gradual.",
      performance: "Retorno ao treino com cuidado com preensão.",
    },
  },
  {
    id: "dor-lombar",
    name: "Dor Lombar Inespecífica",
    nameEn: "Non-Specific Low Back Pain",
    icon: "🔴",
    affectedMuscles: ["lower back", "erector spinae", "abdominals", "hip flexors"],
    spinalLoadLimit: {
      acute: "low",
      subacute: "medium",
      chronic: "medium",
      performance: "high",
    },
    contraindicatedPatterns: [
      "jefferson-curl",
      "sit-up",
      "russian-twist",
      "windmill",
    ],
    contraindicatedAcuteSubacute: [
      "deadlift",
      "good-morning",
      "crunch",
      "back-extension",
      "hyperextension",
      "bent-over-row",
      "barbell-row",
      "leg-press",
      "leg-raise",
      "hanging-leg",
      "box-jump",
      "jump-squat",
      "burpee",
    ],
    cautionPatterns: [
      "deadlift",
      "squat",
      "lunge",
      "hip-thrust",
    ],
    recommendedCategories: {
      acute: ["recovery", "stretches"],
      subacute: ["recovery", "stretches", "yoga", "bodyweight"],
      chronic: ["bodyweight", "band", "stretches", "yoga"],
      performance: ["bodyweight", "band", "cables", "dumbbells"],
    },
    description:
      "Dor lombar sem causa estrutural identificada. Exercício é o tratamento mais eficaz — movimento é medicina.",
    phaseDescriptions: {
      acute: "Manter movimento suave, evitar repouso prolongado.",
      subacute: "McGill Big 3, caminhada, mobilidade do quadril.",
      chronic: "Fortalecimento do core, exercício aeróbico regular.",
      performance: "Exercício completo com boa mecânica de movimento.",
    },
  },
];

export const INJURY_CONDITIONS_MAP = new Map(
  INJURY_CONDITIONS.map((c) => [c.id, c])
);

// ─── Rehab Protocols ──────────────────────────────────────────────────────────

export interface RehabExercise {
  name: string;
  slug?: string;           // matches exercise slug in exercises.json (if exists)
  mediaSlug?: string;      // fallback slug for media when slug doesn't exist in DB
  description: string;
  sets: number;
  reps: string;
  restSeconds: number;
  videoTip?: string;
  scienceNote?: string;
}

export interface RehabProtocol {
  id: string;
  name: string;
  targetConditions: string[]; // condition IDs
  phase: "acute" | "subacute" | "chronic" | "all";
  exercises: RehabExercise[];
  frequency: string;       // e.g. "Daily" or "3x/week"
  source: string;
  notes: string;
}

export const REHAB_PROTOCOLS: RehabProtocol[] = [
  {
    id: "mcgill-big-3",
    name: "McGill Big 3",
    targetConditions: ["hernia-lombar", "dor-lombar"],
    phase: "all",
    frequency: "Diário (manhã e tarde)",
    source: "McGill, S. (2015). Back Mechanic. Backfitpro Inc.",
    notes:
      "Os 3 exercícios mais eficazes para estabilização da coluna lombar com mínima carga discal. Progressão: aumentar séries, não reps.",
    exercises: [
      {
        name: "Modified Curl-Up (Crunch Modificado de McGill)",
        slug: "modified-curl-up",
        mediaSlug: "reverse-crunch",
        description:
          "Deite de costas, uma perna esticada, outra com joelho dobrado. Mãos sob a lombar para preservar curvatura neutra. Levante apenas cabeça e ombros alguns centímetros. Não curve a lombar.",
        sets: 3,
        reps: "5-10 (progressão em séries, não reps)",
        restSeconds: 30,
        scienceNote:
          "Ativa os abdominais com <2.5× peso corporal de compressão discal vs 10× nos sit-ups tradicionais. (McGill, 2015)",
      },
      {
        name: "Bird-Dog (Cão-Pássaro)",
        slug: "bird-dog",
        mediaSlug: "bird-dog",
        description:
          "Quadrupedia, coluna neutra. Estenda braço oposto e perna simultaneamente até paralelo ao chão. Segure 7-10 segundos. Alterne os lados. Não deixe o quadril rotar ou a lombar arquear.",
        sets: 3,
        reps: "5 por lado (segure 7-10s cada)",
        restSeconds: 30,
        scienceNote:
          "Co-ativação máxima dos extensores com carga mínima. Melhor exercício para treinar controle motor lombo-pélvico. (McGill & Karpowicz, 2009)",
      },
      {
        name: "Side Plank (Prancha Lateral)",
        slug: "side-plank",
        mediaSlug: "hand-side-plank",
        description:
          "Decúbito lateral, apoio no cotovelo (iniciante: joelhos dobrados). Eleve o quadril formando linha reta. Mantenha a posição. Progressão: pés empilhados.",
        sets: 3,
        reps: "Segure 10-30s (iniciante: joelhos dobrados)",
        restSeconds: 30,
        scienceNote:
          "Maior ativação do quadratus lumborum e oblíquos com mínima compressão. Essencial para equilíbrio lateral. (McGill, 2002)",
      },
    ],
  },
  {
    id: "mckenzie-extension",
    name: "Protocolo McKenzie — Extensão",
    targetConditions: ["hernia-lombar", "dor-lombar"],
    phase: "subacute",
    frequency: "6-8x por dia nas primeiras 2 semanas",
    source: "McKenzie, R. (1981). The Lumbar Spine: Mechanical Diagnosis & Therapy.",
    notes:
      "Indicado para hérnias posteriores (maioria). A extensão da coluna centraliza a dor — se a dor se mover da perna para a lombar, é sinal positivo.",
    exercises: [
      {
        name: "Prone Press-Up (Cobra Modificada)",
        slug: "prone-press-up",
        mediaSlug: "cobra-stretch-1",
        description:
          "Deite de bruços. Coloque as palmas na altura dos ombros. Pressione o tronco para cima deixando a pelve no chão. Mantenha os quadris relaxados. Vá até onde for confortável.",
        sets: 2,
        reps: "10 repetições",
        restSeconds: 60,
        scienceNote:
          "Cria pressão intradiscal anterior que pode reposicionar material herniado posterior. (McKenzie, 1981; Donelson et al., 1997)",
      },
      {
        name: "Standing Extension (Extensão em Pé)",
        slug: "standing-lumbar-extension",
        mediaSlug: "is-prone",
        description:
          "Em pé, pés na largura dos ombros. Coloque as mãos na lombar. Incline o tronco para trás (extensão) por 2-3 segundos. Retorne. Útil para fazer várias vezes ao dia no trabalho.",
        sets: 1,
        reps: "10 repetições",
        restSeconds: 0,
        scienceNote:
          "Contrapõe o padrão de flexão acumulada da postura sentada. (McGill, 2015)",
      },
    ],
  },
  {
    id: "mckenzie-cervical",
    name: "Protocolo McKenzie — Cervical",
    targetConditions: ["hernia-cervical"],
    phase: "subacute",
    frequency: "6-8x por dia",
    source: "McKenzie, R. (1990). The Cervical and Thoracic Spine: Mechanical Diagnosis & Therapy.",
    notes:
      "Chin tuck é o exercício mais importante para centralizar dor cervical radicular.",
    exercises: [
      {
        name: "Chin Tuck (Retração Cervical)",
        slug: "chin-tuck",
        description:
          "Sentado ou em pé, olhe para frente. Puxe o queixo em direção ao pescoço (fazendo 'papada') sem inclinar a cabeça. Segure 3 segundos. Sentirá um alongamento suave na base do crânio.",
        sets: 2,
        reps: "10 repetições",
        restSeconds: 30,
        scienceNote:
          "Mobiliza C0-C2, ativa flexores cervicais profundos (longus colli), estabiliza a cervical. (Falla et al., 2004)",
      },
      {
        name: "Cervical Extension (Extensão Cervical)",
        slug: "cervical-extension",
        description:
          "Após chin tuck, incline a cabeça suavemente para trás. Somente se não reproduzir dor na parte superior. 3-5 segundos. Para hérnias que respondem à extensão.",
        sets: 2,
        reps: "10 repetições",
        restSeconds: 30,
        scienceNote: "Indicado para compressão anterior do disco. Interromper se dor radicular piorar.",
      },
    ],
  },
  {
    id: "ombro-rotadores",
    name: "Fortalecimento do Manguito Rotador",
    targetConditions: ["impacto-ombro", "lesao-manguito"],
    phase: "subacute",
    frequency: "3-4x por semana",
    source: "Reinold et al. (2009). AJSM. / Ludewig & Braman (2011). JOSPT.",
    notes:
      "Foco nos rotadores externos (infraespinhal, redondo menor) e serrátil anterior para correção da dinâmica escapular.",
    exercises: [
      {
        name: "Band External Rotation (Rotação Externa com Elástico)",
        slug: "band-external-rotation",
        description:
          "Cotovelo a 90° ao lado do corpo. Puxe o elástico para fora (rotação externa). Controle o retorno. Mantenha o cotovelo junto ao corpo e não eleve o ombro.",
        sets: 3,
        reps: "15-20 repetições",
        restSeconds: 60,
        scienceNote:
          "Ativa infraespinhal (60-80% EMG) com mínima compressão subacromial. (Reinold et al., 2009)",
      },
      {
        name: "Band W (Exercício W com Elástico)",
        slug: "band-w-exercise",
        description:
          "Elástico na frente, cotovelos a 90°. Puxe para trás formando um 'W' com os braços. Aperte as escápulas. Foco em deltóide posterior e rombóides.",
        sets: 3,
        reps: "15 repetições",
        restSeconds: 60,
        scienceNote: "Ativa músculos escapulares para corrigir postura protusa do ombro.",
      },
    ],
  },
  {
    id: "joelho-vmo",
    name: "Reforço do VMO e Glúteo Médio",
    targetConditions: ["sfp", "tendinopatia-patelar"],
    phase: "subacute",
    frequency: "3-4x por semana",
    source: "Crossley et al. (2016). BJSM. Systematic review on PFP.",
    notes:
      "Fraqueza do glúteo médio causa dinâmica em valgo que aumenta carga patelofemoral. VMO estabiliza a patela medialmente.",
    exercises: [
      {
        name: "Clamshell (Abertura de Concha com Elástico)",
        slug: "clamshell",
        description:
          "Deite de lado com joelhos dobrados a 60°. Mantenha os pés juntos e eleve o joelho superior como uma concha abrindo. Não deixe o quadril rotar. Adicione elástico para progredir.",
        sets: 3,
        reps: "20 repetições por lado",
        restSeconds: 45,
        scienceNote:
          "Ativa glúteo médio (78% MVIC) com mínima compressão patelofemoral. (Boren et al., 2011)",
      },
      {
        name: "Terminal Knee Extension (Extensão Terminal de Joelho)",
        slug: "terminal-knee-extension",
        description:
          "Com elástico atrás do joelho, semiflexão do joelho (~30°). Estenda completamente o joelho contra resistência. Foco nos últimos 30° de extensão onde o VMO é mais ativo.",
        sets: 3,
        reps: "15-20 repetições",
        restSeconds: 45,
        scienceNote:
          "Isola o VMO nos últimos graus de extensão, onde ele tem mais vantagem mecânica.",
      },
    ],
  },
];

export const REHAB_PROTOCOLS_MAP = new Map(
  REHAB_PROTOCOLS.map((p) => [p.id, p])
);

/**
 * Get rehab protocols relevant to a set of injury condition IDs and phase.
 */
export function getRehabProtocolsForConditions(
  conditionIds: string[],
  phase?: string
): RehabProtocol[] {
  return REHAB_PROTOCOLS.filter((p) => {
    const conditionMatch = p.targetConditions.some((c) => conditionIds.includes(c));
    const phaseMatch = !phase || p.phase === "all" || p.phase === phase;
    return conditionMatch && phaseMatch;
  });
}

/**
 * Get all affected muscles from a list of active injury condition IDs.
 */
export function getAffectedMusclesForConditions(conditionIds: string[]): string[] {
  const muscles = new Set<string>();
  for (const id of conditionIds) {
    const condition = INJURY_CONDITIONS_MAP.get(id);
    if (condition) {
      condition.affectedMuscles.forEach((m) => muscles.add(m));
    }
  }
  return Array.from(muscles);
}

/**
 * Check if an exercise slug matches any contraindicated patterns.
 */
/**
 * Check if an exercise slug matches any contraindicated patterns.
 * Returns contraindicated: true to block the exercise entirely.
 * Returns caution: true to allow the exercise but show a warning.
 *
 * Contraindication logic (evidence-based, phase-aware):
 *  1. contraindicatedPatterns → blocked in ALL phases
 *  2. contraindicatedAcuteSubacute → blocked only in acute + subacute phases
 *  3. cautionPatterns → allowed in all phases, but with a warning
 */
export function isExerciseContraindicated(
  exerciseSlug: string,
  conditionIds: string[],
  phase: string
): { contraindicated: boolean; caution?: boolean; reason?: string } {
  const slug = exerciseSlug.toLowerCase();
  const isEarlyPhase = phase === "acute" || phase === "subacute";

  for (const id of conditionIds) {
    const condition = INJURY_CONDITIONS_MAP.get(id);
    if (!condition) continue;

    // 1. Absolute contraindications (all phases)
    const absoluteMatch = condition.contraindicatedPatterns.find((p) =>
      slug.includes(p.toLowerCase())
    );
    if (absoluteMatch) {
      return {
        contraindicated: true,
        reason: `Contraindicado para ${condition.name}: movimento "${absoluteMatch}" é de alto risco independente da fase.`,
      };
    }

    // 2. Phase-specific contraindications (only acute + subacute)
    if (isEarlyPhase) {
      const phaseMatch = (condition.contraindicatedAcuteSubacute ?? []).find((p) =>
        slug.includes(p.toLowerCase())
      );
      if (phaseMatch) {
        return {
          contraindicated: true,
          reason: `Contraindicado na fase ${phase} para ${condition.name}: "${phaseMatch}" — reintroduzir com cautela na fase crônica.`,
        };
      }
    }

    // 3. Caution (allowed but flagged)
    const cautionMatch = (condition.cautionPatterns ?? []).find((p) =>
      slug.includes(p.toLowerCase())
    );
    if (cautionMatch) {
      return {
        contraindicated: false,
        caution: true,
        reason: `Atenção: "${cautionMatch}" requer boa técnica com ${condition.name}. Prefira cargas leves e acompanhamento.`,
      };
    }
  }
  return { contraindicated: false };
}
