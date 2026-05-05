"use client";
import { useState, useEffect, useMemo } from "react";
import { getExercises, filterExercises } from "@/lib/data";
import { useInjuries } from "@/hooks/useInjuries";
import { getEquipmentProfile } from "@/lib/storage";
import ExerciseCard from "@/components/ExerciseCard";
import ExerciseFilters from "@/components/ExerciseFilters";
import InjuryPanel from "@/components/InjuryPanel";
import type { Exercise, AppFilters } from "@/lib/types";

const DEFAULT_FILTERS: AppFilters = {
  search: "",
  bodyPart: "",
  equipment: "",
  environment: "all",
  hideRisky: false,
  myEquipmentOnly: false,
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [filters, setFilters] = useState<AppFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<"name" | "difficulty" | "muscle">("name");
  const [showInjuryPanel, setShowInjuryPanel] = useState(false);
  const [userEquipment, setUserEquipment] = useState<string[]>([]);
  const { injuredMuscleNames, isRisky } = useInjuries();

  useEffect(() => {
    getExercises().then(setExercises);
    setUserEquipment(getEquipmentProfile());
  }, []);

  const bodyParts = useMemo(() => [...new Set(exercises.flatMap((e) => e.bodyParts))].sort(), [exercises]);
  const equipments = useMemo(() => [...new Set(exercises.flatMap((e) => e.equipments))].sort(), [exercises]);

  const DIFF_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2, advanced: 2 };

  const filtered = useMemo(() => {
    let base = filterExercises(exercises, { ...filters, injuredMuscles: injuredMuscleNames });
    if (filters.myEquipmentOnly && userEquipment.length > 0) {
      base = base.filter((ex) => ex.equipments.some((eq) => userEquipment.includes(eq)));
    }
    return [...base].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "difficulty") return (DIFF_ORDER[a.difficulty ?? ""] ?? 1) - (DIFF_ORDER[b.difficulty ?? ""] ?? 1);
      if (sortBy === "muscle") return (a.targetMuscles[0] ?? "").localeCompare(b.targetMuscles[0] ?? "");
      return 0;
    });
  }, [exercises, filters, injuredMuscleNames, sortBy, userEquipment]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Exercícios</h1>
          <p className="text-[var(--color-text-secondary)] text-sm">{filtered.length} encontrados</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer"
          >
            <option value="name">A-Z</option>
            <option value="muscle">Músculo</option>
            <option value="difficulty">Dificuldade</option>
          </select>
          <button
            onClick={() => setShowInjuryPanel((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              injuredMuscleNames.length > 0
                ? "border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
            }`}
          >
            🩹 Lesões {injuredMuscleNames.length > 0 && `(${injuredMuscleNames.length})`}
          </button>
        </div>
      </div>

      {showInjuryPanel && <InjuryPanel />}

      {injuredMuscleNames.length > 0 && (
        <div className="card p-4 flex items-center justify-between gap-4 flex-wrap border-[var(--color-border)]">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">🩹 Você tem lesões ativas</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Veja exercícios seguros e pilates recomendados</p>
          </div>
          <button
            onClick={() => setFilters((f) => ({ ...f, environment: "pilates", hideRisky: true }))}
            className="btn btn-sm btn-secondary"
          >
            🧘 Ver Pilates / Recuperação
          </button>
        </div>
      )}

      <ExerciseFilters
        filters={filters}
        onChange={setFilters}
        bodyParts={bodyParts}
        equipments={equipments}
        userEquipment={userEquipment}
      />

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">Nenhum exercício encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} isRisky={isRisky(ex)} />
          ))}
        </div>
      )}
    </div>
  );
}
