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
