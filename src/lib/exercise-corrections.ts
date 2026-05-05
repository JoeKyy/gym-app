/**
 * exercise-corrections.ts
 *
 * O MuscleWiki classifica exercícios de forma genérica (ex: tudo como
 * "Bodyweight" ou apenas "Barbell"). Este módulo corrige o campo `equipments`
 * em tempo de execução usando padrões de slug, sem modificar o JSON fonte.
 *
 * Existem dois tipos de regra:
 * - REPLACE: substitui o equipments original (ex: pull-up bar)
 * - APPEND:  adiciona equipamento extra obrigatório (ex: banco para bench press)
 *
 * O filtro em suggestions.ts usa lógica ALL (every): todos os equipamentos não
 * secundários devem estar no perfil do usuário.
 */

import type { Exercise } from "./types";

// IDs que são categorias secundárias/wellness — não "bloqueiam" um exercício
const SECONDARY_IDS = new Set(["Recovery", "Stretches", "Yoga", "Cardio"]);

// ─── Regras de SUBSTITUIÇÃO (slug → novo equipments) ─────────────────────────

type ReplaceRule = {
  mode: "replace";
  test: (slug: string) => boolean;
  equipments: string[];
};

// ─── Regras de ADIÇÃO (slug + equipamento extra obrigatório) ─────────────────

type AppendRule = {
  mode: "append";
  test: (slug: string, currentEquipments: string[]) => boolean;
  add: string[];
};

type CorrectionRule = ReplaceRule | AppendRule;

const CORRECTIONS: CorrectionRule[] = [
  // ── SUBSTITUIÇÕES ─────────────────────────────────────────────────────────

  // Pull-up Bar — barra fixa, barra australiana, suspensão
  {
    mode: "replace",
    test: (s) =>
      s.includes("pull-up") ||
      s.includes("pullup") ||
      s.includes("chin-up") ||
      s.includes("chinup") ||
      s.startsWith("hanging-") ||
      s.includes("-hanging-") ||
      s.includes("l-sit-pull") ||
      s.includes("l-sit-chin") ||
      s.includes("l-sit-hang") ||
      s.includes("muscle-up") ||
      s.includes("bar-hang"),
    equipments: ["Pull-up-Bar"],
  },

  // Gymnastic Rings — anéis de ginástica (não confundir com "hamstring")
  {
    mode: "replace",
    test: (s) => s.startsWith("ring-") || (s.includes("-ring-") && !s.includes("hamstring")),
    equipments: ["Gymnastic-Rings"],
  },

  // Parallel Bars — dipstation, barras paralelas
  {
    mode: "replace",
    test: (s) =>
      s.includes("parallel-bar") ||
      s.includes("parralel-bar"), // typo no dataset original
    equipments: ["Parallel-Bars"],
  },

  // Stability Ball — bola suíça
  {
    mode: "replace",
    test: (s) => s.includes("stability-ball"),
    equipments: ["Stability-Ball"],
  },

  // ── ADIÇÕES ───────────────────────────────────────────────────────────────

  // Banco (Bench) — exercícios inclinados, declinados, bench press e preacher
  // Requer Barbell OU Dumbbells como base + Bench
  {
    mode: "append",
    test: (s, equips) =>
      (equips.includes("Barbell") || equips.includes("Dumbbells")) &&
      (s.includes("bench-press") ||
        s.includes("incline") ||
        s.includes("decline") ||
        s.includes("preacher") ||
        s.includes("lying-tricep") ||
        s.includes("lying-extension") ||
        s.includes("lying-skullcrusher") ||
        s.includes("skullcrusher") ||
        s.includes("skull-crusher")),
    add: ["Bench"],
  },

  // Rack / Squat Rack — barbell squat e rack pulls
  // Exige Barbell + Squat-Rack (agachamentos com barra só são seguros com rack)
  {
    mode: "append",
    test: (s, equips) =>
      equips.includes("Barbell") &&
      ((s.includes("squat") && s.includes("barbell") &&
        !s.includes("zercher") &&
        !s.includes("landmine") &&
        !s.includes("hack")) ||
        s.includes("rack-pull")),
    add: ["Squat-Rack"],
  },
];

// ─── Aplicação das correções ──────────────────────────────────────────────────

/**
 * Aplica as correções de equipamento em todos os exercícios.
 * Retorna um novo array (não muta o original).
 */
export function applyEquipmentCorrections(exercises: Exercise[]): Exercise[] {
  return exercises.map((ex) => {
    const slug = ex.slug ?? "";
    let equipments = [...(ex.equipments ?? [])];

    for (const rule of CORRECTIONS) {
      if (rule.mode === "replace") {
        if (rule.test(slug)) {
          return { ...ex, equipments: rule.equipments };
        }
      } else {
        if (rule.test(slug, equipments)) {
          for (const id of rule.add) {
            if (!equipments.includes(id)) equipments.push(id);
          }
        }
      }
    }

    return equipments === ex.equipments ? ex : { ...ex, equipments };
  });
}

/**
 * Filtra os IDs de equipamento de um exercício que são "primários"
 * (requerem estar no perfil do usuário).
 * IDs de wellness/cardio são ignorados no filtro de obrigatoriedade.
 */
export function getPrimaryEquipments(equipments: string[]): string[] {
  return equipments.filter((eq) => !SECONDARY_IDS.has(eq));
}
