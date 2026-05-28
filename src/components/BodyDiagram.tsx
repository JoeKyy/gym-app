"use client";

import { useState } from "react";
import type { InjurySeverity } from "@/lib/types";

export type MuscleDisplayStatus = InjurySeverity | "fresh" | "sore" | "fatigued" | "normal";

interface Region {
  id: string;
  label: string;
  muscles: string[]; // Must match muscle names used in exercises.json / InjuryPanel
  pathData: string;
  view: "front" | "back";
}

// ─── Front-view regions (viewBox 0 0 100 250) ───────────────────────────────
const FRONT_REGIONS: Region[] = [
  {
    id: "chest",
    label: "Peitoral",
    muscles: ["chest", "pecs"],
    pathData: "M35,32 C40,28 60,28 65,32 L67,60 C62,66 38,66 33,60 Z",
    view: "front",
  },
  {
    id: "left_shoulder",
    label: "Ombro E.",
    muscles: ["shoulders"],
    pathData: "M33,32 C24,30 14,38 10,50 L10,62 C14,66 24,66 33,60 Z",
    view: "front",
  },
  {
    id: "right_shoulder",
    label: "Ombro D.",
    muscles: ["shoulders"],
    pathData: "M67,32 C76,30 86,38 90,50 L90,62 C86,66 76,66 67,60 Z",
    view: "front",
  },
  {
    id: "left_bicep",
    label: "Bíceps E.",
    muscles: ["biceps"],
    pathData: "M10,62 C6,74 6,90 10,102 L22,102 C20,90 18,74 20,62 Z",
    view: "front",
  },
  {
    id: "right_bicep",
    label: "Bíceps D.",
    muscles: ["biceps"],
    pathData: "M90,62 C94,74 94,90 90,102 L78,102 C80,90 82,74 80,62 Z",
    view: "front",
  },
  {
    id: "left_forearm_f",
    label: "Antebraço E.",
    muscles: ["forearms", "wrist flexors"],
    pathData: "M10,102 C6,118 8,132 12,142 L22,142 C20,132 18,118 20,102 Z",
    view: "front",
  },
  {
    id: "right_forearm_f",
    label: "Antebraço D.",
    muscles: ["forearms", "wrist flexors"],
    pathData: "M90,102 C94,118 92,132 88,142 L78,142 C80,132 82,118 80,102 Z",
    view: "front",
  },
  {
    id: "abs",
    label: "Abdômen",
    muscles: ["abdominals"],
    pathData: "M35,60 L65,60 L63,102 C58,108 42,108 37,102 Z",
    view: "front",
  },
  {
    id: "left_oblique",
    label: "Oblíquo E.",
    muscles: ["obliques"],
    pathData: "M33,60 L35,60 L37,102 L27,114 C20,108 10,96 10,80 L10,62 L22,62 Z",
    view: "front",
  },
  {
    id: "right_oblique",
    label: "Oblíquo D.",
    muscles: ["obliques"],
    pathData: "M67,60 L65,60 L63,102 L73,114 C80,108 90,96 90,80 L90,62 L78,62 Z",
    view: "front",
  },
  {
    id: "hip_flexors",
    label: "Flex. Quadril",
    muscles: ["hip flexors", "iliopsoas"],
    pathData: "M37,102 L63,102 L61,126 C57,132 43,132 39,126 Z",
    view: "front",
  },
  {
    id: "left_quad",
    label: "Quadríceps E.",
    muscles: ["quadriceps"],
    pathData: "M25,130 L50,128 L50,200 L24,203 C18,186 16,156 25,130 Z",
    view: "front",
  },
  {
    id: "right_quad",
    label: "Quadríceps D.",
    muscles: ["quadriceps"],
    pathData: "M75,130 L50,128 L50,200 L76,203 C82,186 84,156 75,130 Z",
    view: "front",
  },
  {
    id: "left_adductor",
    label: "Addutor E.",
    muscles: ["inner thighs", "adductors"],
    pathData: "M39,126 L50,128 L50,200 L42,200 C36,183 36,155 39,126 Z",
    view: "front",
  },
  {
    id: "right_adductor",
    label: "Addutor D.",
    muscles: ["inner thighs", "adductors"],
    pathData: "M61,126 L50,128 L50,200 L58,200 C64,183 64,155 61,126 Z",
    view: "front",
  },
  {
    id: "left_shin",
    label: "Panturrilha E.",
    muscles: ["calves", "shins"],
    pathData: "M24,203 L48,200 L46,244 L24,244 Z",
    view: "front",
  },
  {
    id: "right_shin",
    label: "Panturrilha D.",
    muscles: ["calves", "shins"],
    pathData: "M76,203 L52,200 L54,244 L76,244 Z",
    view: "front",
  },
];

// ─── Back-view regions (viewBox 0 0 100 250) ────────────────────────────────
const BACK_REGIONS: Region[] = [
  {
    id: "traps",
    label: "Trapézio",
    muscles: ["traps", "traps (mid-back)", "upper back"],
    pathData: "M36,26 L64,26 L70,56 C62,62 38,62 30,56 Z",
    view: "back",
  },
  {
    id: "left_rear_delt",
    label: "Deltoide Post. E.",
    muscles: ["rear delts", "shoulders"],
    pathData: "M30,56 C20,52 12,60 10,72 L12,82 C18,86 26,82 32,74 Z",
    view: "back",
  },
  {
    id: "right_rear_delt",
    label: "Deltoide Post. D.",
    muscles: ["rear delts", "shoulders"],
    pathData: "M70,56 C80,52 88,60 90,72 L88,82 C82,86 74,82 68,74 Z",
    view: "back",
  },
  {
    id: "left_tricep",
    label: "Tríceps E.",
    muscles: ["triceps"],
    pathData: "M12,72 C8,88 8,104 12,116 L22,116 C20,104 18,88 20,72 Z",
    view: "back",
  },
  {
    id: "right_tricep",
    label: "Tríceps D.",
    muscles: ["triceps"],
    pathData: "M88,72 C92,88 92,104 88,116 L78,116 C80,104 82,88 80,72 Z",
    view: "back",
  },
  {
    id: "left_forearm_b",
    label: "Antebraço E.",
    muscles: ["forearms", "wrist flexors"],
    pathData: "M12,116 C8,130 10,144 14,154 L24,154 C22,144 20,130 20,116 Z",
    view: "back",
  },
  {
    id: "right_forearm_b",
    label: "Antebraço D.",
    muscles: ["forearms", "wrist flexors"],
    pathData: "M88,116 C92,130 90,144 86,154 L76,154 C78,144 80,130 80,116 Z",
    view: "back",
  },
  {
    id: "left_lat",
    label: "Latíssimo E.",
    muscles: ["lats"],
    pathData: "M30,56 L40,62 L38,116 L20,126 C12,116 10,100 10,84 L10,72 L20,72 Z",
    view: "back",
  },
  {
    id: "right_lat",
    label: "Latíssimo D.",
    muscles: ["lats"],
    pathData: "M70,56 L60,62 L62,116 L80,126 C88,116 90,100 90,84 L90,72 L80,72 Z",
    view: "back",
  },
  {
    id: "lower_back",
    label: "Lombar",
    muscles: ["lower back", "erector spinae", "spine", "piriformis"],
    pathData: "M38,116 L62,116 L60,152 C56,158 44,158 40,152 Z",
    view: "back",
  },
  {
    id: "glutes",
    label: "Glúteos",
    muscles: ["glutes"],
    pathData: "M24,152 L76,152 L74,178 C64,186 36,186 26,178 Z",
    view: "back",
  },
  {
    id: "left_hamstring",
    label: "Isquiotibial E.",
    muscles: ["hamstrings"],
    pathData: "M24,178 L50,178 L48,218 L24,220 C18,203 18,188 24,178 Z",
    view: "back",
  },
  {
    id: "right_hamstring",
    label: "Isquiotibial D.",
    muscles: ["hamstrings"],
    pathData: "M76,178 L50,178 L52,218 L76,220 C82,203 82,188 76,178 Z",
    view: "back",
  },
  {
    id: "left_calf_b",
    label: "Panturrilha E.",
    muscles: ["calves"],
    pathData: "M24,220 L48,218 L46,244 L24,244 Z",
    view: "back",
  },
  {
    id: "right_calf_b",
    label: "Panturrilha D.",
    muscles: ["calves"],
    pathData: "M76,220 L52,218 L54,244 L76,244 Z",
    view: "back",
  },
];

// ─── Color helpers ───────────────────────────────────────────────────────────

function getStatusForMuscles(muscles: string[], statusMap: Map<string, string>): string | null {
  // Priority: injured/fatigued > recovering/sore > fresh/normal
  let best: string | null = null;
  for (const m of muscles) {
    const s = statusMap.get(m);
    if (!s) continue;
    if (s === "injured" || s === "fatigued") return s; // worst case, return immediately
    if (s === "recovering" || s === "sore") best = s;
    else if (!best) best = s;
  }
  return best;
}

function statusToColors(status: string | null): { fill: string; stroke: string } {
  switch (status) {
    case "injured":
    case "fatigued":
      return { fill: "rgba(239,68,68,0.38)", stroke: "rgba(239,68,68,0.85)" };
    case "recovering":
    case "sore":
      return { fill: "rgba(245,158,11,0.38)", stroke: "rgba(245,158,11,0.85)" };
    case "fresh":
      return { fill: "rgba(34,197,94,0.32)", stroke: "rgba(34,197,94,0.7)" };
    default:
      return { fill: "transparent", stroke: "transparent" };
  }
}

// ─── Body side (single SVG) ──────────────────────────────────────────────────

interface BodySideProps {
  side: "front" | "back";
  regions: Region[];
  statusMap: Map<string, string>;
  onRegionClick?: (region: Region) => void;
  readOnly?: boolean;
  width?: number;
}

function BodySide({ side, regions, statusMap, onRegionClick, readOnly, width = 100 }: BodySideProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Body silhouette outline path for front/back (same shape, simplified)
  const silhouetteColor = "rgba(255,255,255,0.08)";
  const outlineColor = "rgba(255,255,255,0.18)";

  return (
    <div style={{ width }}>
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide mb-1"
        style={{ color: "var(--color-text-muted)" }}>
        {side === "front" ? "Frente" : "Costas"}
      </p>
      <svg
        viewBox="0 0 100 250"
        width={width}
        height={width * 2.5}
        style={{ overflow: "visible", display: "block", margin: "0 auto" }}
        aria-label={`Corpo - vista ${side === "front" ? "frontal" : "posterior"}`}
      >
        {/* Body background silhouette */}
        <g opacity={0.5}>
          {/* Head */}
          <circle cx="50" cy="12" r="10" fill={silhouetteColor} stroke={outlineColor} strokeWidth="0.8" />
          {/* Neck */}
          <rect x="44" y="22" width="12" height="10" rx="3" fill={silhouetteColor} stroke="none" />
          {/* Torso */}
          <path
            d={side === "front"
              ? "M20,32 L80,32 L82,125 C75,132 25,132 18,125 Z"
              : "M22,32 L78,32 L80,125 C74,132 26,132 20,125 Z"}
            fill={silhouetteColor} stroke={outlineColor} strokeWidth="0.6"
          />
          {/* Left arm */}
          <path d="M8,38 L22,38 L24,145 L8,145 Z" rx="4" fill={silhouetteColor} stroke={outlineColor} strokeWidth="0.5" />
          {/* Right arm */}
          <path d="M92,38 L78,38 L76,145 L92,145 Z" rx="4" fill={silhouetteColor} stroke={outlineColor} strokeWidth="0.5" />
          {/* Hips */}
          <path d="M18,125 C16,132 16,142 22,148 L78,148 C84,142 84,132 82,125 Z"
            fill={silhouetteColor} stroke={outlineColor} strokeWidth="0.5" />
          {/* Left leg */}
          <path d="M20,148 L50,148 L48,246 L20,246 Z" fill={silhouetteColor} stroke={outlineColor} strokeWidth="0.5" />
          {/* Right leg */}
          <path d="M80,148 L50,148 L52,246 L80,246 Z" fill={silhouetteColor} stroke={outlineColor} strokeWidth="0.5" />
        </g>

        {/* Muscle regions */}
        {regions.map((region) => {
          const status = getStatusForMuscles(region.muscles, statusMap);
          const colors = statusToColors(status);
          const isHovered = hovered === region.id;
          const isActive = status !== null;

          return (
            <path
              key={region.id}
              d={region.pathData}
              fill={isHovered && !readOnly
                ? "rgba(255,255,255,0.14)"
                : colors.fill}
              stroke={isActive ? colors.stroke : isHovered ? "rgba(255,255,255,0.3)" : "transparent"}
              strokeWidth={isActive ? "1.2" : "0.8"}
              style={{
                cursor: readOnly ? "default" : "pointer",
                transition: "fill 150ms, stroke 150ms",
              }}
              onMouseEnter={() => !readOnly && setHovered(region.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => !readOnly && onRegionClick?.(region)}
              role={readOnly ? undefined : "button"}
              aria-label={region.label}
            >
              <title>{region.label}</title>
            </path>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main BodyDiagram component ─────────────────────────────────────────────

interface BodyDiagramProps {
  /** Map of muscle name (lowercase) → status */
  statusMap?: Map<string, string>;
  /** Called when a region is clicked. Receives all muscle names for that region. */
  onToggleRegion?: (muscles: string[]) => void;
  readOnly?: boolean;
  /** Width of each side panel in px (default 110) */
  sideWidth?: number;
  /** Show legend below diagram */
  showLegend?: boolean;
}

export default function BodyDiagram({
  statusMap = new Map(),
  onToggleRegion,
  readOnly = false,
  sideWidth = 110,
  showLegend = true,
}: BodyDiagramProps) {
  const handleRegionClick = (region: Region) => {
    if (readOnly || !onToggleRegion) return;
    onToggleRegion(region.muscles);
  };

  return (
    <div>
      <div className="flex gap-4 justify-center">
        <BodySide
          side="front"
          regions={FRONT_REGIONS}
          statusMap={statusMap}
          onRegionClick={handleRegionClick}
          readOnly={readOnly}
          width={sideWidth}
        />
        <BodySide
          side="back"
          regions={BACK_REGIONS}
          statusMap={statusMap}
          onRegionClick={handleRegionClick}
          readOnly={readOnly}
          width={sideWidth}
        />
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-3 justify-center mt-3">
          <LegendItem color="rgba(239,68,68,0.7)" label="Lesionado" />
          <LegendItem color="rgba(245,158,11,0.7)" label="Recuperando" />
          {statusMap.size > 0 && (
            <LegendItem color="rgba(34,197,94,0.6)" label="Em forma" />
          )}
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}
