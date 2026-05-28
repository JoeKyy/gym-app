"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { getExercises, filterExercises } from "@/lib/data";
import { useInjuries } from "@/hooks/useInjuries";
import { getEquipmentProfile } from "@/lib/storage";
import { HeartPulse, Activity, Map as MapIcon, X } from "lucide-react";
import ExerciseCard from "@/components/ExerciseCard";
import ExerciseFilters from "@/components/ExerciseFilters";
import InjuryPanel from "@/components/InjuryPanel";
import BodyDiagram from "@/components/BodyDiagram";
import { MUSCLE_PT } from "@/lib/translations";
import type { Exercise, AppFilters } from "@/lib/types";

const PAGE_SIZE = 30;

const DEFAULT_FILTERS: AppFilters = {
  search: "",
  bodyPart: "",
  equipment: "",
  environment: "all",
  hideRisky: false,
  myEquipmentOnly: false,
};

// Maps BodyDiagram muscle keys → exercise bodyParts/targetMuscles values
const BODY_REGION_TO_BODYPARTS: Record<string, string[]> = {
  "chest":            ["Chest", "Mid and Lower Chest", "Upper Pectoralis"],
  "pecs":             ["Chest", "Mid and Lower Chest", "Upper Pectoralis"],
  "biceps":           ["Biceps", "Long Head Bicep", "Short Head Bicep"],
  "abs":              ["Abdominals", "Upper Abdominals", "Lower Abdominals"],
  "abdominals":       ["Abdominals", "Upper Abdominals", "Lower Abdominals"],
  "obliques":         ["Obliques"],
  "quadriceps":       ["Quads", "Rectus Femoris", "Inner Quadriceps", "Outer Quadricep"],
  "quads":            ["Quads", "Rectus Femoris", "Inner Quadriceps", "Outer Quadricep"],
  "forearms":         ["Forearms", "Wrist Extensors", "Wrist Flexors"],
  "forearm":          ["Forearms", "Wrist Extensors", "Wrist Flexors"],
  "neck":             ["Neck"],
  "hamstrings":       ["Hamstrings", "Lateral Hamstrings", "Medial Hamstrings"],
  "hamstring":        ["Hamstrings", "Lateral Hamstrings", "Medial Hamstrings"],
  "glutes":           ["Glutes", "Gluteus Maximus", "Gluteus Medius"],
  "gluteal":          ["Glutes", "Gluteus Maximus", "Gluteus Medius"],
  "calves":           ["Calves", "Gastrocnemius", "Soleus"],
  "lower back":       ["Lower back"],
  "erector spinae":   ["Lower back"],
  "lats":             ["Lats"],
  "upper back":       ["Lats", "Traps", "Traps (mid-back)", "Lower Traps", "Upper Traps"],
  "traps":            ["Traps", "Traps (mid-back)", "Upper Traps", "Lower Traps"],
  "traps (mid-back)": ["Traps (mid-back)"],
  "trapezius":        ["Traps", "Upper Traps", "Lower Traps"],
  "triceps":          ["Triceps", "Long Head Tricep"],
  "shoulders":        ["Shoulders", "Front Shoulders", "Rear Shoulders", "Anterior Deltoid", "Lateral Deltoid", "Posterior Deltoid"],
  "rear delts":       ["Rear Shoulders", "Posterior Deltoid"],
  "rotator cuff":     ["Rear Shoulders"],
  "serratus anterior":["Chest"],
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AppFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<"name" | "difficulty" | "muscle">("name");
  const [showInjuryPanel, setShowInjuryPanel] = useState(false);
  const [userEquipment, setUserEquipment] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showBodyMap, setShowBodyMap] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { injuredMuscleNames, isRisky } = useInjuries();

  useEffect(() => {
    getExercises().then((exs) => {
      setExercises(exs);
      setLoading(false);
    });
    setUserEquipment(getEquipmentProfile());
  }, []);

  // Reset pagination whenever filters/sort/muscles change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, sortBy, selectedMuscles]);

  const bodyParts = useMemo(() => [...new Set(exercises.flatMap((e) => e.bodyParts))].sort(), [exercises]);
  const equipments = useMemo(() => [...new Set(exercises.flatMap((e) => e.equipments))].sort(), [exercises]);

  // Body map statusMap: selected muscles → "fresh" (green highlight)
  const bodyMapStatusMap = useMemo(() => {
    const m = new Map<string, string>();
    selectedMuscles.forEach((muscle) => m.set(muscle, "fresh"));
    return m;
  }, [selectedMuscles]);

  const handleBodyMapToggle = (muscles: string[]) => {
    setSelectedMuscles((prev) => {
      const anySelected = muscles.some((m) => prev.includes(m));
      if (anySelected) {
        return prev.filter((m) => !muscles.includes(m));
      }
      return [...prev, ...muscles.filter((m) => !prev.includes(m))];
    });
  };

  // Flatten selected muscles → bodyPart values for exercise filtering
  const selectedBodyPartsSet = useMemo(() => {
    if (selectedMuscles.length === 0) return new Set<string>();
    const parts = new Set<string>();
    selectedMuscles.forEach((m) => {
      (BODY_REGION_TO_BODYPARTS[m.toLowerCase()] ?? []).forEach((bp) => parts.add(bp.toLowerCase()));
    });
    return parts;
  }, [selectedMuscles]);


  const DIFF_ORDER: Record<string, number> = { beginner: 0, intermediate: 1, expert: 2, advanced: 2 };

  const filtered = useMemo(() => {
    let base = filterExercises(exercises, { ...filters, injuredMuscles: injuredMuscleNames });
    if (filters.myEquipmentOnly && userEquipment.length > 0) {
      base = base.filter((ex) => ex.equipments.some((eq) => userEquipment.includes(eq)));
    }
    // Body-map muscle filter
    if (selectedBodyPartsSet.size > 0) {
      base = base.filter((ex) =>
        ex.bodyParts.some((bp) => selectedBodyPartsSet.has(bp.toLowerCase())) ||
        ex.targetMuscles.some((tm) => selectedBodyPartsSet.has(tm.toLowerCase()))
      );
    }
    return [...base].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "difficulty") return (DIFF_ORDER[a.difficulty ?? ""] ?? 1) - (DIFF_ORDER[b.difficulty ?? ""] ?? 1);
      if (sortBy === "muscle") return (a.targetMuscles[0] ?? "").localeCompare(b.targetMuscles[0] ?? "");
      return 0;
    });
  }, [exercises, filters, injuredMuscleNames, sortBy, userEquipment, selectedBodyPartsSet]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  // Load more when sentinel enters viewport
  const loadMore = useCallback(() => {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

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
          {/* View mode toggle */}
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-border)" }}>
            <button
              onClick={() => setViewMode("grid")}
              title="Grade"
              className={`px-2.5 py-1.5 text-sm transition-colors ${
                viewMode === "grid"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
              style={viewMode === "grid" ? { background: "var(--color-primary-soft)" } : { background: "var(--color-surface-2)" }}
            >⊞</button>
            <button
              onClick={() => setViewMode("list")}
              title="Lista"
              className={`px-2.5 py-1.5 text-sm transition-colors ${
                viewMode === "list"
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
              style={viewMode === "list" ? { background: "var(--color-primary-soft)" } : { background: "var(--color-surface-2)" }}
            >≡</button>
          </div>
          <button
            onClick={() => { setShowBodyMap((v) => !v); if (showBodyMap) setSelectedMuscles([]); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              showBodyMap || selectedMuscles.length > 0
                ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
            }`}
          >
            <MapIcon size={13} />
            Por Músculo {selectedMuscles.length > 0 && `(${selectedMuscles.length})`}
          </button>
          <button
            onClick={() => setShowInjuryPanel((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
              injuredMuscleNames.length > 0
                ? "border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <HeartPulse size={13} />
              Lesões {injuredMuscleNames.length > 0 && `(${injuredMuscleNames.length})`}
            </span>
          </button>
        </div>
      </div>

      {showInjuryPanel && <InjuryPanel />}

      {showBodyMap && (
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">
              Toque no músculo para filtrar exercícios
            </p>
            {selectedMuscles.length > 0 && (
              <button
                onClick={() => setSelectedMuscles([])}
                className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
              >
                <X size={12} /> Limpar
              </button>
            )}
          </div>
          <BodyDiagram
            statusMap={bodyMapStatusMap}
            onToggleRegion={handleBodyMapToggle}
            readOnly={false}
            sideWidth={130}
            showLegend={false}
          />
          {selectedMuscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedMuscles.map((m) => (
                <span
                  key={m}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-[var(--color-primary-soft)] border border-[var(--color-primary-border)] text-[var(--color-primary)] cursor-pointer hover:opacity-80"
                  onClick={() => setSelectedMuscles((prev) => prev.filter((x) => x !== m))}
                >
                  {MUSCLE_PT[m] ?? m} <X size={10} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {injuredMuscleNames.length > 0 && (
        <div className="card p-4 flex items-center justify-between gap-4 flex-wrap border-[var(--color-border)]">
          <div>
            <p className="text-sm font-semibold text-[var(--color-text-secondary)] flex items-center gap-1.5">
              <HeartPulse size={14} /> Você tem lesões ativas
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Veja exercícios seguros e pilates recomendados</p>
          </div>
          <button
            onClick={() => setFilters((f) => ({ ...f, environment: "pilates", hideRisky: true }))}
            className="btn btn-sm btn-secondary flex items-center gap-1"
          >
            <Activity size={13} />Ver Pilates / Recuperação
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

      {loading ? (
        /* Skeleton grid while exercises.json loads */
        <div className={viewMode === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          : "flex flex-col gap-2"
        }>
          {Array.from({ length: viewMode === "grid" ? 9 : 8 }).map((_, i) =>
            viewMode === "grid" ? (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton w-full" style={{ aspectRatio: "4/3" }} />
                <div className="p-3 space-y-2">
                  <div className="skeleton h-4 rounded" style={{ width: `${55 + (i % 4) * 10}%` }} />
                  <div className="skeleton h-3 rounded" style={{ width: `${35 + (i % 3) * 10}%` }} />
                  <div className="skeleton h-3 rounded w-20" />
                </div>
              </div>
            ) : (
              <div key={i} className="card flex gap-3 p-2 items-center overflow-hidden">
                <div className="skeleton shrink-0 rounded-lg" style={{ width: 64, height: 64 }} />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 rounded" style={{ width: `${50 + (i % 4) * 10}%` }} />
                  <div className="skeleton h-3 rounded w-28" />
                </div>
              </div>
            )
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-semibold">Nenhum exercício encontrado</p>
          <p className="text-sm mt-1">Tente ajustar os filtros</p>
        </div>
      ) : (
        <>
          <div className={viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            : "flex flex-col gap-2"
          }>
            {visible.map((ex) => (
              <ExerciseCard key={ex.id} exercise={ex} isRisky={isRisky(ex)} variant={viewMode} />
            ))}
          </div>

          {/* Sentinel for infinite scroll */}
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="flex justify-center py-6 text-[var(--color-text-muted)] text-sm">
              <span>Carregando mais… ({visibleCount}/{filtered.length})</span>
            </div>
          )}

          {visibleCount >= filtered.length && filtered.length > PAGE_SIZE && (
            <p className="text-center text-xs text-[var(--color-text-muted)] py-4">
              ✓ Todos os {filtered.length} exercícios carregados
            </p>
          )}
        </>
      )}
    </div>
  );
}
