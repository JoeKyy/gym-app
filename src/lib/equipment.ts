export interface EquipmentInfo {
  id: string;          // exact name used in exercises.json
  name: string;        // PT-BR name
  emoji: string;
  description: string;
  category: "free" | "machine" | "bodyweight" | "accessory" | "cardio" | "wellness";
  available?: boolean; // set by user
}

export const ALL_EQUIPMENT: EquipmentInfo[] = [
  // ── Ordem de relevância (mais usado primeiro, estilo Fitbod) ──────────────
  { id: "Bodyweight",      name: "Peso Corporal",        emoji: "🧍", description: "Flexão, agachamento, prancha — sem nada extra", category: "bodyweight" },
  { id: "Dumbbells",       name: "Halteres",             emoji: "🏋️", description: "Par de halteres fixo ou ajustável", category: "free" },
  { id: "Barbell",         name: "Barra Olímpica",       emoji: "⚖️", description: "Barra para deadlift, rows, press no chão…", category: "free" },
  { id: "Bench",           name: "Banco",                emoji: "🪑", description: "Banco plano ou inclinado para supino e rosca", category: "free" },
  { id: "Squat-Rack",      name: "Rack de Agachamento",  emoji: "🏗️", description: "Power rack ou suporte para agachamento e bench press seguro", category: "free" },
  { id: "Kettlebells",     name: "Kettlebell",           emoji: "🫙", description: "Peso com alça para swing, clean & press", category: "free" },
  { id: "Cables",          name: "Cabo / Polia",         emoji: "🔗", description: "Polia ajustável para puxadas, flies e mais", category: "machine" },
  { id: "Machine",         name: "Máquina Guiada",       emoji: "🤖", description: "Máquinas de academia para isolamento muscular", category: "machine" },
  { id: "Band",            name: "Elástico",             emoji: "🎗️", description: "Faixas elásticas de resistência leve ou pesada", category: "accessory" },
  { id: "Pull-up-Bar",     name: "Barra Fixa",           emoji: "🔝", description: "Para pull-up, chin-up e exercícios suspensos", category: "bodyweight" },
  { id: "Plate",           name: "Anilha",               emoji: "🔘", description: "Anilhas avulsas para adicionar carga ou usar livres", category: "free" },
  { id: "Smith-Machine",   name: "Máquina Smith",        emoji: "🏗️", description: "Barra guiada para agachamento, supino e mais", category: "machine" },
  { id: "TRX",             name: "TRX / Suspensão",      emoji: "🪢", description: "Fitas de suspensão para treino funcional", category: "accessory" },
  { id: "Parallel-Bars",   name: "Barras Paralelas",     emoji: "🤸", description: "Dipstation ou barras para dips e apoio", category: "bodyweight" },
  { id: "Gymnastic-Rings", name: "Anéis de Ginástica",   emoji: "⭕", description: "Anéis suspensos para ring pull-up, flies…", category: "bodyweight" },
  { id: "Stability-Ball",  name: "Bola de Estabilidade", emoji: "🔵", description: "Bola suíça para core, glúteos e mobilidade", category: "accessory" },
  { id: "Bosu-Ball",       name: "Bosu Ball",            emoji: "🟡", description: "Bola hemisférica para equilíbrio e funcional", category: "accessory" },
  { id: "Medicine-Ball",   name: "Bola Medicinal",       emoji: "⚽", description: "Bola pesada para lançamentos e explosão", category: "accessory" },
  { id: "Cardio",          name: "Cardio",               emoji: "🏃", description: "Esteira, bike, elíptico e aeróbico em geral", category: "cardio" },
  { id: "Stretches",       name: "Alongamentos",         emoji: "🤸", description: "Exercícios de flexibilidade e mobilidade", category: "wellness" },
  { id: "Recovery",        name: "Recuperação",          emoji: "🩹", description: "Fisioterapia, rolo de espuma e reabilitação", category: "wellness" },
  { id: "Yoga",            name: "Yoga",                 emoji: "🧘", description: "Posturas e práticas de yoga e meditação", category: "wellness" },
];

export const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = {
  bodyweight: "Peso Corporal",
  free: "Pesos Livres",
  machine: "Máquinas",
  accessory: "Acessórios",
  cardio: "Cardio",
  wellness: "Bem-estar",
};

export const EQUIPMENT_CATEGORIES = ["bodyweight", "free", "machine", "accessory", "cardio", "wellness"] as const;
