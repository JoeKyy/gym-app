"use client";

import { useState, useEffect } from "react";
import Model, { type IExerciseData, type Muscle } from "react-body-highlighter";

export type MuscleDisplayStatus = "injured" | "recovering" | "sore" | "fresh" | "fatigued" | "normal";

// Maps our internal muscle names → react-body-highlighter muscle names
const MUSCLE_NAME_MAP: Record<string, string[]> = {
  // anterior
  "chest":           ["chest"],
  "pecs":            ["chest"],
  "biceps":          ["biceps"],
  "abs":             ["abs"],
  "abdominals":      ["abs"],
  "obliques":        ["obliques"],
  "quadriceps":      ["quadriceps"],
  "quads":           ["quadriceps"],
  "forearms":        ["forearm"],
  "forearm":         ["forearm"],
  "knees":           ["knees"],
  "neck":            ["neck"],
  // posterior
  "hamstrings":      ["hamstring"],
  "hamstring":       ["hamstring"],
  "glutes":          ["gluteal"],
  "gluteal":         ["gluteal"],
  "calves":          ["calves"],
  "lower back":      ["lower-back"],
  "erector spinae":  ["lower-back"],
  "lats":            ["upper-back"],
  "upper back":      ["upper-back"],
  "traps":           ["trapezius"],
  "traps (mid-back)": ["trapezius"],
  "trapezius":       ["trapezius"],
  "triceps":         ["triceps"],
  // bilateral
  "shoulders":       ["front-deltoids", "back-deltoids"],
  "rear delts":      ["back-deltoids"],
  "rotator cuff":    ["back-deltoids"],
  "serratus anterior": ["chest"],
};

// Map status to category (frequency trick: green=1, orange=2, red=3)
// highlightedColors array: [green, orange, red]
const STATUS_FREQ: Record<string, number> = {
  fresh: 1,
  recovering: 2,
  sore: 2,
  injured: 3,
  fatigued: 3,
  normal: 0,
};

function toLibMuscles(ourMuscle: string): string[] {
  const key = ourMuscle.toLowerCase().trim();
  return MUSCLE_NAME_MAP[key] ?? [];
}

interface BodyDiagramProps {
  /** Map of muscle name (lowercase) → status string */
  statusMap?: Map<string, string>;
  /** Called when a muscle region is clicked. Receives the clicked muscle name. */
  onToggleRegion?: (muscles: string[]) => void;
  readOnly?: boolean;
  /** Width of each side panel in px (default 120) */
  sideWidth?: number;
  /** Show legend below diagram */
  showLegend?: boolean;
}

export default function BodyDiagram({
  statusMap = new Map(),
  onToggleRegion,
  readOnly = false,
  sideWidth = 120,
  showLegend = true,
}: BodyDiagramProps) {
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);

  // Build data arrays for each frequency level (green=1, orange=2, red=3)
  const freshLibMuscles: string[] = [];
  const recoveringLibMuscles: string[] = [];
  const fatiguedLibMuscles: string[] = [];

  statusMap.forEach((status, muscleName) => {
    const freq = STATUS_FREQ[status] ?? 0;
    const libMuscles = toLibMuscles(muscleName);
    if (freq === 1) freshLibMuscles.push(...libMuscles);
    else if (freq === 2) recoveringLibMuscles.push(...libMuscles);
    else if (freq === 3) fatiguedLibMuscles.push(...libMuscles);
  });

  // Deduplicate (higher severity wins)
  const allFatigued = new Set(fatiguedLibMuscles);
  const allRecovering = new Set(recoveringLibMuscles.filter((m) => !allFatigued.has(m)));
  const allFresh = new Set(freshLibMuscles.filter((m) => !allFatigued.has(m) && !allRecovering.has(m)));

  // Build data prop: each muscle appears N times to get color index N-1
  const buildData = (): IExerciseData[] => {
    const entries: IExerciseData[] = [];
    const fm = Array.from(allFresh) as Muscle[];
    const rm = Array.from(allRecovering) as Muscle[];
    const fat = Array.from(allFatigued) as Muscle[];

    if (fm.length) entries.push({ name: "fresh", muscles: fm }); // 1x → colors[0] green
    if (rm.length) {
      entries.push({ name: "rec1", muscles: rm }); // 1x
      entries.push({ name: "rec2", muscles: rm }); // 2x total → colors[1] orange
    }
    if (fat.length) {
      entries.push({ name: "fat1", muscles: fat }); // 1x
      entries.push({ name: "fat2", muscles: fat }); // 2x
      entries.push({ name: "fat3", muscles: fat }); // 3x total → colors[2] red
    }
    return entries;
  };

  const data = buildData();

  // Watch data-theme attribute on <html> so bodyColor updates whenever user toggles theme
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const read = () => {
      const t = document.documentElement.getAttribute("data-theme");
      setTheme(t === "light" ? "light" : "dark");
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const bodyColor = theme === "light" ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.08)";
  const highlightedColors = ["#22c55e", "#f59e0b", "#ef4444"];

  const handleMuscleClick = (ev: { muscle: string }) => {
    if (readOnly || !onToggleRegion) return;
    // Map library muscle name back to our names
    const ourMuscles = Object.entries(MUSCLE_NAME_MAP)
      .filter(([, libNames]) => libNames.includes(ev.muscle))
      .map(([ourName]) => ourName);
    onToggleRegion(ourMuscles.length ? ourMuscles : [ev.muscle]);
  };

  const modelStyle = { width: sideWidth, cursor: readOnly ? "default" : "pointer" };

  return (
    <div>
      <div className="flex gap-6 justify-center items-start">
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}>Frente</p>
          <Model
            type="anterior"
            data={data}
            highlightedColors={highlightedColors}
            bodyColor={bodyColor}
            style={modelStyle}
            onClick={readOnly ? undefined : handleMuscleClick}
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-muted)" }}>Costas</p>
          <Model
            type="posterior"
            data={data}
            highlightedColors={highlightedColors}
            bodyColor={bodyColor}
            style={modelStyle}
            onClick={readOnly ? undefined : handleMuscleClick}
          />
        </div>
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-3 justify-center mt-3">
          <LegendItem color="#22c55e" label="Em forma" />
          <LegendItem color="#f59e0b" label="Recuperando" />
          <LegendItem color="#ef4444" label="Lesionado" />
        </div>
      )}
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--color-text-muted)" }}>
      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  );
}
