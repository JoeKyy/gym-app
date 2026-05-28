"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

interface BodyMapImageProps {
  slug: string;
  defaultView?: "front" | "back" | "auto";
  targetMuscles?: string[];
  size?: "sm" | "md" | "lg";
  className?: string;
  showToggle?: boolean;
}

const BACK_MUSCLES = new Set([
  "lats", "lower back", "traps", "upper traps", "lower traps", "traps (mid-back)",
  "glutes", "gluteus maximus", "gluteus medius",
  "hamstrings", "lateral hamstrings", "medial hamstrings",
  "posterior deltoid", "rear shoulders",
  "triceps", "lateral head triceps", "long head tricep", "medial head triceps",
  "calves", "gastrocnemius", "soleus",
]);

function detectView(muscles: string[]): "front" | "back" {
  const backCount = muscles.filter((m) => BACK_MUSCLES.has(m.toLowerCase())).length;
  return backCount > muscles.length / 2 ? "back" : "front";
}

const SIZES = {
  sm: { width: 120, height: 180 },
  md: { width: 180, height: 270 },
  lg: { width: 240, height: 360 },
};

export default function BodyMapImage({
  slug,
  defaultView = "auto",
  targetMuscles = [],
  size = "md",
  className = "",
  showToggle = true,
}: BodyMapImageProps) {
  const initial = defaultView === "auto" ? detectView(targetMuscles) : defaultView;
  const [view, setView] = useState<"front" | "back">(initial);
  const [error, setError] = useState(false);
  // Watch theme so images re-render with correct filter on theme toggle
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const read = () => setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const { width, height } = SIZES[size];
  const src = `/data/media/bodymaps/${slug}-${view}.png`;

  if (error) return null;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Contrasting background panel — same approach as BodyDiagram */}
      <div
        className="rounded-2xl p-3 flex items-center justify-center"
        style={{ background: "var(--color-surface-2)" }}
      >
        <div style={{ width, height, position: "relative" }}>
          <Image
            key={src}
            src={src}
            alt={`Bodymap ${view} view`}
            fill
            className="object-contain"
            // In dark mode: invert white→black background, keep colored highlights via hue-rotate
            style={theme === "dark" ? { filter: "invert(1) hue-rotate(180deg)" } : undefined}
            onError={() => setError(true)}
            unoptimized
          />
        </div>
      </div>

      {showToggle && (
        <div className="flex gap-2">
          <button
            onClick={() => setView("front")}
            className={`text-sm px-5 py-2 rounded-full transition-colors ${
              view === "front"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Frontal
          </button>
          <button
            onClick={() => setView("back")}
            className={`text-sm px-5 py-2 rounded-full transition-colors ${
              view === "back"
                ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] font-semibold"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            Costas
          </button>
        </div>
      )}
    </div>
  );
}
