/** Difficulty labels PT-BR */
export const DIFFICULTY_PT: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  expert: "Avançado",
  advanced: "Avançado",
};

/** Body part labels PT-BR */
export const BODYPART_PT: Record<string, string> = {
  Abs: "Abdômen",
  Back: "Costas",
  Biceps: "Bíceps",
  Chest: "Peito",
  Forearms: "Antebraços",
  Glutes: "Glúteos",
  Hamstrings: "Isquiotibiais",
  "Hip Flexors": "Flexores do Quadril",
  Lats: "Dorsais",
  "Lower Back": "Lombar",
  Obliques: "Oblíquos",
  Quads: "Quadríceps",
  Shoulders: "Ombros",
  Traps: "Trapézio",
  Triceps: "Tríceps",
  Calves: "Panturrilhas",
  Neck: "Pescoço",
  "Full Body": "Corpo Inteiro",
};

/** Equipment labels PT-BR */
export const EQUIPMENT_PT: Record<string, string> = {
  Band: "Elástico / Banda",
  Barbell: "Barra",
  Bodyweight: "Peso Corporal",
  "Bosu-Ball": "Bosu Ball",
  Cables: "Cabo / Polia",
  Cardio: "Cardio",
  Dumbbells: "Halteres",
  Kettlebells: "Kettlebell",
  Machine: "Máquina",
  "Medicine-Ball": "Bola Medicinal",
  Plate: "Anilha",
  Recovery: "Recuperação",
  "Smith-Machine": "Máquina Smith",
  Stretches: "Alongamentos",
  TRX: "TRX",
  Yoga: "Yoga",
};

export const pt = (map: Record<string, string>, key: string) => map[key] ?? key;

/** Mechanic labels PT-BR */
export const MECHANIC_PT: Record<string, string> = {
  compound: "Composto",
  isolation: "Isolamento",
  isometric: "Isométrico",
  cardio: "Cardio",
  flexibility: "Flexibilidade",
};

/** Muscle name labels PT-BR (covers all MuscleWiki target/secondary muscles) */
export const MUSCLE_PT: Record<string, string> = {
  // Abs / Core
  "Abdominals":          "Abdômen",
  "Lower Abdominals":    "Abdômen Inferior",
  "Upper Abdominals":    "Abdômen Superior",
  "Obliques":            "Oblíquos",
  // Arms — biceps
  "Biceps":              "Bíceps",
  "Long Head Bicep":     "Bíceps (cabeça longa)",
  "Short Head Bicep":    "Bíceps (cabeça curta)",
  // Arms — triceps
  "Triceps":             "Tríceps",
  "Long Head Tricep":    "Tríceps (cabeça longa)",
  "Lateral Head Triceps":"Tríceps (cabeça lateral)",
  "Medial Head Triceps": "Tríceps (cabeça medial)",
  // Arms — forearms
  "Forearms":            "Antebraços",
  "Wrist Extensors":     "Extensores do Punho",
  "Wrist Flexors":       "Flexores do Punho",
  // Back
  "Lats":                "Dorsais",
  "Traps":               "Trapézio",
  "Upper Traps":         "Trapézio Superior",
  "Lower Traps":         "Trapézio Inferior",
  "Traps (mid-back)":    "Trapézio (região média)",
  "Lower back":          "Lombar",
  // Chest
  "Chest":               "Peito",
  "Mid and Lower Chest": "Peito Médio-Inferior",
  "Upper Pectoralis":    "Peitoral Superior",
  // Shoulders
  "Shoulders":           "Ombros",
  "Front Shoulders":     "Deltóide Frontal",
  "Rear Shoulders":      "Deltóide Posterior",
  "Anterior Deltoid":    "Deltóide Anterior",
  "Lateral Deltoid":     "Deltóide Lateral",
  "Posterior Deltoid":   "Deltóide Posterior",
  // Legs — quads
  "Quads":               "Quadríceps",
  "Inner Quadriceps":    "Quadríceps Interno",
  "Outer Quadricep":     "Quadríceps Externo",
  "Rectus Femoris":      "Reto Femoral",
  // Legs — hamstrings
  "Hamstrings":          "Isquiotibiais",
  "Lateral Hamstrings":  "Isquiotibiais Laterais",
  "Medial Hamstrings":   "Isquiotibiais Mediais",
  // Legs — glutes
  "Glutes":              "Glúteos",
  "Gluteus Maximus":     "Glúteo Máximo",
  "Gluteus Medius":      "Glúteo Médio",
  // Legs — calves / lower leg
  "Calves":              "Panturrilhas",
  "Gastrocnemius":       "Gastrocnêmio",
  "Soleus":              "Sóleo",
  "Tibialis":            "Tibial",
  // Other
  "Groin":               "Virilha / Adutores",
  "Inner Thigh":         "Face Interna da Coxa",
  "Neck":                "Pescoço",
  "Feet":                "Pés",
};
