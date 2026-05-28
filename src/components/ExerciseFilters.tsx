"use client";
import Link from "next/link";
import { Home, Dumbbell, Activity, Settings, Search, Zap } from "lucide-react";
import type { AppFilters, WorkoutEnvironment } from "@/lib/types";
import { BODYPART_PT, EQUIPMENT_PT } from "@/lib/translations";

interface Props {
  filters: AppFilters;
  onChange: (filters: AppFilters) => void;
  bodyParts: string[];
  equipments: string[];
  userEquipment?: string[];
}

const ENV_OPTIONS: { value: WorkoutEnvironment | "all"; label: string; icon?: React.ReactNode }[] = [
  { value: "all",     label: "Todos" },
  { value: "home",    label: "Casa",     icon: <Home size={12} /> },
  { value: "gym",     label: "Academia", icon: <Dumbbell size={12} /> },
  { value: "pilates", label: "Pilates",  icon: <Activity size={12} /> },
];

const btn = (active: boolean) =>
  `text-xs px-3 py-1.5 rounded-full border transition-colors ${
    active
      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-bold"
      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
  }`;

const selectCls =
  "bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)] cursor-pointer";

export default function ExerciseFilters({ filters, onChange, bodyParts, equipments, userEquipment }: Props) {
  const set = (patch: Partial<AppFilters>) => onChange({ ...filters, ...patch });
  const hasUserEq = userEquipment && userEquipment.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        placeholder="Buscar exercício..."
        value={filters.search}
        onChange={(e) => set({ search: e.target.value })}
        className="input"
      />

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 flex-wrap">
          {ENV_OPTIONS.map(({ value, label, icon }) => (
            <button key={value} onClick={() => set({ environment: value })} className={btn(filters.environment === value)}>
              <span className="flex items-center gap-1">{icon}{label}</span>
            </button>
          ))}
        </div>

        {hasUserEq && (
          <button
            onClick={() => set({ myEquipmentOnly: !filters.myEquipmentOnly })}
            className={btn(!!filters.myEquipmentOnly)}
          >
            <span className="flex items-center gap-1"><Settings size={12} />Meu Equipamento</span>
          </button>
        )}

        <button
          onClick={() => set({ calisthenicsOnly: !filters.calisthenicsOnly })}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            filters.calisthenicsOnly
              ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)] font-bold"
              : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]"
          }`}
        >
          <span className="flex items-center gap-1"><Zap size={12} />Calistenia</span>
        </button>

        <select value={filters.bodyPart} onChange={(e) => set({ bodyPart: e.target.value })} className={selectCls}>
          <option value="">Parte do corpo</option>
          {bodyParts.map((bp) => (
            <option key={bp} value={bp}>{BODYPART_PT[bp] ?? bp}</option>
          ))}
        </select>

        <select value={filters.equipment} onChange={(e) => set({ equipment: e.target.value })} className={selectCls}>
          <option value="">Equipamento</option>
          {equipments.map((eq) => (
            <option key={eq} value={eq}>{EQUIPMENT_PT[eq] ?? eq}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => set({ hideRisky: !filters.hideRisky })}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
              filters.hideRisky ? "bg-[var(--color-primary)]" : "bg-[var(--color-toggle-track-off)]"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-md transition-transform ${
                filters.hideRisky ? "translate-x-4" : ""
              }`}
              style={{ background: "var(--color-toggle-knob)" }}
            />
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">Ocultar exerc. arriscados</span>
        </label>

        <Link href="/equipment" className="text-xs text-[var(--color-primary)] hover:underline ml-auto flex items-center gap-1">
          <Settings size={12} />Configurar equipamentos →
        </Link>
      </div>
    </div>
  );
}
