"use client";

/**
 * Inline SVG icons for equipment types.
 * Minimal line-art style, renders at any size.
 */

interface Props {
  id: string; // equipment id from exercises.json
  size?: number;
  className?: string;
  color?: string;
}

const ICONS: Record<string, (c: string) => React.ReactNode> = {
  Bodyweight: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="10" r="4" />
      <line x1="24" y1="14" x2="24" y2="28" />
      <line x1="14" y1="20" x2="34" y2="20" />
      <line x1="24" y1="28" x2="16" y2="40" />
      <line x1="24" y1="28" x2="32" y2="40" />
    </svg>
  ),
  Dumbbells: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="20" width="6" height="8" rx="1.5" />
      <rect x="2" y="18" width="4" height="12" rx="1.5" />
      <rect x="38" y="20" width="6" height="8" rx="1.5" />
      <rect x="42" y="18" width="4" height="12" rx="1.5" />
      <line x1="10" y1="24" x2="38" y2="24" />
    </svg>
  ),
  Barbell: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="18" width="6" height="12" rx="1.5" />
      <rect x="4" y="20" width="4" height="8" rx="1" />
      <rect x="40" y="18" width="6" height="12" rx="1.5" />
      <rect x="40" y="20" width="4" height="8" rx="1" />
      <line x1="8" y1="24" x2="40" y2="24" />
    </svg>
  ),
  Kettlebells: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="28" r="12" />
      <path d="M17 18 Q16 10 24 8 Q32 10 31 18" />
      <path d="M20 8 Q24 4 28 8" />
    </svg>
  ),
  Cables: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="8" height="40" rx="2" />
      <circle cx="6" cy="24" r="3" fill={c} />
      <path d="M10 24 Q24 16 34 28" strokeDasharray="2 2" />
      <circle cx="34" cy="28" r="4" />
      <line x1="34" y1="32" x2="46" y2="38" />
    </svg>
  ),
  Machine: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="6" width="40" height="36" rx="3" />
      <rect x="10" y="12" width="12" height="20" rx="2" />
      <rect x="26" y="22" width="12" height="8" rx="2" />
      <circle cx="32" cy="18" r="4" />
    </svg>
  ),
  Band: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 38 Q8 24 12 10" />
      <path d="M36 38 Q40 24 36 10" />
      <path d="M12 10 Q24 6 36 10" />
      <path d="M12 38 Q24 42 36 38" />
      <path d="M14 24 Q24 18 34 24 Q24 30 14 24Z" fill={c} fillOpacity="0.15" />
    </svg>
  ),
  "Medicine-Ball": (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="24" r="18" />
      <ellipse cx="24" cy="24" rx="10" ry="18" />
      <line x1="6" y1="24" x2="42" y2="24" />
    </svg>
  ),
  "Bosu-Ball": (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 32 Q6 12 24 10 Q42 12 42 32Z" />
      <line x1="4" y1="32" x2="44" y2="32" />
      <line x1="8" y1="36" x2="40" y2="36" />
    </svg>
  ),
  Plate: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="24" cy="24" rx="18" ry="18" />
      <ellipse cx="24" cy="24" rx="12" ry="12" />
      <ellipse cx="24" cy="24" rx="4" ry="4" />
    </svg>
  ),
  "Smith-Machine": (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="4" x2="8" y2="44" />
      <line x1="40" y1="4" x2="40" y2="44" />
      <line x1="8" y1="22" x2="40" y2="22" />
      <rect x="4" y="18" width="6" height="8" rx="1" />
      <rect x="38" y="18" width="6" height="8" rx="1" />
      <line x1="14" y1="4" x2="34" y2="4" />
    </svg>
  ),
  TRX: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="24" y1="4" x2="24" y2="12" />
      <line x1="16" y1="12" x2="32" y2="12" />
      <line x1="16" y1="12" x2="12" y2="28" />
      <line x1="32" y1="12" x2="36" y2="28" />
      <rect x="8" y="28" width="8" height="6" rx="2" />
      <rect x="32" y="28" width="8" height="6" rx="2" />
    </svg>
  ),
  Cardio: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 24 L14 16 L20 26 L28 10 L34 22 L38 18 L42 24" />
    </svg>
  ),
  Stretches: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="8" r="4" />
      <line x1="24" y1="12" x2="24" y2="24" />
      <path d="M12 18 Q18 14 24 24 Q30 14 36 18" />
      <path d="M18 24 Q16 34 12 38" />
      <path d="M30 24 Q32 34 36 38" />
    </svg>
  ),
  Recovery: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 6 L24 42" />
      <path d="M14 10 Q8 22 14 34" />
      <path d="M34 10 Q40 22 34 34" />
      <circle cx="24" cy="24" r="6" />
    </svg>
  ),
  Yoga: (c) => (
    <svg viewBox="0 0 48 48" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="24" cy="8" r="4" />
      <line x1="24" y1="12" x2="24" y2="24" />
      <line x1="8" y1="20" x2="40" y2="20" />
      <path d="M24 24 L16 36 L12 44" />
      <path d="M24 24 L32 36 L36 44" />
    </svg>
  ),
};

// Fallback emoji map for any missing equipment
const EMOJI_FALLBACK: Record<string, string> = {
  Bodyweight: "🧍",
  Dumbbells: "🏋️",
  Barbell: "⚖️",
  Kettlebells: "🫙",
  Cables: "🔗",
  Machine: "🤖",
  Band: "🎗️",
  "Medicine-Ball": "⚽",
  "Bosu-Ball": "🟡",
  Plate: "🔘",
  "Smith-Machine": "🏗️",
  TRX: "🪢",
  Cardio: "🏃",
  Stretches: "🤸",
  Recovery: "🩹",
  Yoga: "🧘",
};

export default function EquipmentIcon({ id, size = 40, className = "", color }: Props) {
  const resolvedColor = color ?? "currentColor";
  const iconFn = ICONS[id];

  if (!iconFn) {
    return (
      <span className={className} style={{ fontSize: size * 0.7, lineHeight: 1 }}>
        {EMOJI_FALLBACK[id] ?? "🏋️"}
      </span>
    );
  }

  return (
    <span
      className={className}
      style={{ display: "inline-flex", width: size, height: size, flexShrink: 0 }}
    >
      {iconFn(resolvedColor)}
    </span>
  );
}
