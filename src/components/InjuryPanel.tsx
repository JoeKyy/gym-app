"use client";
import { useInjuries } from "@/hooks/useInjuries";
import BodyDiagram from "@/components/BodyDiagram";
import type { InjurySeverity } from "@/lib/types";

const MUSCLE_GROUPS: Record<string, string[]> = {
  "🔴 Coluna / Lombar": [
    "lower back",
    "erector spinae",
    "spine",
    "iliopsoas",
    "piriformis",
    "abdominals",
    "obliques",
  ],
  "🦵 Membros Inferiores": [
    "quadriceps",
    "hamstrings",
    "glutes",
    "calves",
    "hip flexors",
    "inner thighs",
    "adductors",
  ],
  "💪 Membros Superiores": [
    "biceps",
    "triceps",
    "forearms",
    "shoulders",
    "rotator cuff",
    "wrist flexors",
  ],
  "🏋 Peitoral / Costas": [
    "chest",
    "pecs",
    "lats",
    "traps",
    "traps (mid-back)",
    "upper back",
    "serratus anterior",
    "rear delts",
  ],
  "🧠 Pescoço / Outros": ["neck", "shins", "hands", "grip muscles"],
};

const PRESETS: Record<string, { label: string; muscles: string[] }> = {
  "hernia-disco": {
    label: "🦴 Hérnia de Disco (Lombar)",
    muscles: ["lower back", "erector spinae", "iliopsoas", "piriformis"],
  },
  "lesao-ombro": {
    label: "💪 Lesão no Ombro",
    muscles: ["shoulders", "rotator cuff", "rear delts"],
  },
  "lesao-joelho": {
    label: "🦵 Lesão no Joelho",
    muscles: ["quadriceps", "hamstrings"],
  },
};

export default function InjuryPanel() {
  const { injuries, addInjury, removeInjury, updateSeverity } = useInjuries();

  const injuredMap = new Map(injuries.map((i) => [i.muscle, i.severity]));

  const applyPreset = (muscles: string[]) => {
    muscles.forEach((m) => {
      if (!injuredMap.has(m)) addInjury(m, "recovering");
    });
  };

  const handleBodyToggle = (muscles: string[]) => {
    const isAnyActive = muscles.some((m) => injuredMap.has(m));
    if (isAnyActive) {
      muscles.forEach((m) => { if (injuredMap.has(m)) removeInjury(m); });
    } else {
      muscles.forEach((m) => addInjury(m, "recovering"));
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <h2 className="font-semibold text-base flex items-center gap-2">
        🩹 Músculos em recuperação
      </h2>

      {/* Visual body diagram — click regions to mark injured */}
      <div>
        <p className="text-xs text-[var(--color-text-muted)] mb-3">
          Clique nos músculos para marcar como em recuperação
        </p>
        <BodyDiagram
          statusMap={injuredMap as Map<string, string>}
          onToggleRegion={handleBodyToggle}
          sideWidth={118}
          showLegend
        />
      </div>

      <hr style={{ borderColor: "var(--color-border-subtle)" }} />

      <div>
        <p className="text-xs text-[var(--color-text-muted)] mb-2">Condições pré-definidas</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([key, { label, muscles }]) => (
            <button
              key={key}
              onClick={() => applyPreset(muscles)}
              className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {injuries.length > 0 && (
        <div>
          <p className="text-xs text-[var(--color-text-muted)] mb-2">Ativos</p>
          <div className="flex flex-wrap gap-2">
            {injuries.map((inj) => (
              <div
                key={inj.muscle}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                  inj.severity === "injured"
                    ? "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-text)]"
                    : "bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-[var(--color-warning-text)]"
                }`}
              >
                <span className="capitalize">{inj.muscle}</span>
                <select
                  value={inj.severity}
                  onChange={(e) => updateSeverity(inj.muscle, e.target.value as InjurySeverity)}
                  className="bg-transparent text-xs focus:outline-none cursor-pointer"
                >
                  <option value="recovering">🟡 recuperando</option>
                  <option value="injured">🔴 lesionado</option>
                </select>
                <button
                  onClick={() => removeInjury(inj.muscle)}
                  className="ml-0.5 hover:text-[var(--color-text)]"
                  title="Remover"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-[var(--color-text-muted)]">Ou selecione manualmente</p>
        {Object.entries(MUSCLE_GROUPS).map(([group, muscles]) => (
          <details key={group} className="group">
            <summary className="text-xs text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)] select-none mb-1">
              {group}
            </summary>
            <div className="flex flex-wrap gap-1.5 pl-2 pt-1">
              {muscles.map((muscle) => {
                const isActive = injuredMap.has(muscle);
                return (
                  <button
                    key={muscle}
                    onClick={() => isActive ? removeInjury(muscle) : addInjury(muscle)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      isActive
                        ? "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-text)]"
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {isActive ? "✓ " : ""}{muscle}
                  </button>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
