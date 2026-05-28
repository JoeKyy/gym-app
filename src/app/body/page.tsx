"use client";

import { useState, useEffect, useMemo } from "react";
import { getInjuriesV2, getSessions } from "@/lib/storage";
import { calculateFreshness, recommendFocusFromFreshness, GROUP_LABELS } from "@/lib/recovery";
import { getExercises } from "@/lib/data";
import BodyDiagram from "@/components/BodyDiagram";
import { Activity } from "lucide-react";
import type { MuscleRecoveryStatus, Injury } from "@/lib/types";

// Maps recovery group names → muscle names used in BodyDiagram
const FRESHNESS_GROUP_MUSCLES: Record<string, string[]> = {
  biceps:     ["biceps"],
  triceps:    ["triceps"],
  calves:     ["calves"],
  forearms:   ["forearms"],
  chest:      ["chest", "pecs"],
  shoulders:  ["shoulders"],
  core:       ["abdominals", "obliques"],
  quadriceps: ["quadriceps"],
  hamstrings: ["hamstrings"],
  glutes:     ["glutes"],
  lats:       ["lats"],
  upper_back: ["upper back", "traps"],
  lower_back: ["lower back", "erector spinae"],
};

function formatHours(h: number) {
  if (h <= 0) return "Pronto";
  if (h < 1) return "< 1h";
  return `${Math.round(h)}h`;
}

export default function BodyPage() {
  const [freshness, setFreshness] = useState<MuscleRecoveryStatus[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [selected, setSelected] = useState<MuscleRecoveryStatus | null>(null);

  useEffect(() => {
    getExercises().then((exs) => {
      const inj = getInjuriesV2();
      setInjuries(inj);
      const sessions = getSessions();
      const exMap = new Map(exs.map((e) => [e.id, e]));
      setFreshness(calculateFreshness(sessions, exMap, inj));
    });
  }, []);

  const focusRec = useMemo(() => recommendFocusFromFreshness(freshness), [freshness]);

  const freshnessBodyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of freshness) {
      const muscles = FRESHNESS_GROUP_MUSCLES[s.group] ?? [];
      const status = s.status === "resting" ? "fatigued" : s.status === "partial" ? "recovering" : "fresh";
      muscles.forEach((m) => map.set(m, status));
    }
    return map;
  }, [freshness]);

  const readyCount = freshness.filter((s) => s.status === "ready").length;
  const fatigued = freshness.filter((s) => s.status === "resting");
  const partial = freshness.filter((s) => s.status === "partial");
  const ready = freshness.filter((s) => s.status === "ready");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>Recovery</h1>
          {freshness.length > 0 && (
            <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              {readyCount} grupo{readyCount !== 1 ? "s" : ""} pronto{readyCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {focusRec && (
          <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background: "var(--color-primary)", color: "var(--color-primary-text)" }}>
            {focusRec.focus === "upper" ? "Superior" :
             focusRec.focus === "lower" ? "Inferior" :
             focusRec.focus === "core"  ? "Core" : "Corpo Todo"}
          </span>
        )}
      </div>

      {focusRec && (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{focusRec.reason}</p>
      )}

      {/* Body Diagram */}
      {freshness.length > 0 ? (
        <>
          <div className="card p-4">
            <BodyDiagram
              statusMap={freshnessBodyMap}
              readOnly
              sideWidth={130}
              showLegend
            />
          </div>

          {/* Muscle detail (tap feedback) */}
          {selected && (
            <div className="card p-4 flex items-center justify-between gap-4"
              style={{ borderColor: "var(--color-primary-border)" }}>
              <div>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                  {GROUP_LABELS[selected.group] ?? selected.group}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                  {selected.status === "ready"   ? "Pronto para treinar" :
                   selected.status === "partial" ? "Recuperando" :
                                                   "Descansando — espere mais"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold" style={{ color: "var(--color-primary)" }}>
                  {selected.freshnessPct}%
                </p>
                {selected.hoursRemaining > 0 && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                    {formatHours(selected.hoursRemaining)} restantes
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Muscle status bars */}
          <div className="space-y-3">
            {fatigued.length > 0 && (
              <MuscleGroup label="Descansando" items={fatigued} barColor="#ef4444" dotColor="bg-red-500"
                onSelect={setSelected} selected={selected} />
            )}
            {partial.length > 0 && (
              <MuscleGroup label="Recuperando" items={partial} barColor="#f59e0b" dotColor="bg-amber-500"
                onSelect={setSelected} selected={selected} />
            )}
            {ready.length > 0 && (
              <MuscleGroup label="Prontos" items={ready} barColor="var(--color-primary)" dotColor="bg-green-500"
                onSelect={setSelected} selected={selected} />
            )}
          </div>
        </>
      ) : (
        <div className="card p-8 text-center">
          <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ background: "var(--color-surface-2)" }}>
            <Activity className="text-[var(--color-text-muted)]" size={28} />
          </div>
          <p className="font-semibold" style={{ color: "var(--color-text)" }}>Sem dados de recuperação</p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Registre sessões de treino para ver o estado de cada músculo
          </p>
        </div>
      )}
    </div>
  );
}

function MuscleGroup({
  label, items, barColor, dotColor, onSelect, selected,
}: {
  label: string;
  items: MuscleRecoveryStatus[];
  barColor: string;
  dotColor: string;
  onSelect: (s: MuscleRecoveryStatus) => void;
  selected: MuscleRecoveryStatus | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2 flex items-center gap-1.5"
        style={{ color: barColor }}>
        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
        {label}
      </p>
      <div className="space-y-1.5">
        {items.map((s) => {
          const isSelected = selected?.group === s.group;
          return (
            <button key={s.group} onClick={() => onSelect(isSelected ? null as unknown as MuscleRecoveryStatus : s)}
              className="w-full text-left rounded-xl px-3 py-2.5 transition-colors"
              style={{
                background: isSelected ? "var(--color-primary-soft)" : "var(--color-surface-2)",
                border: `1px solid ${isSelected ? "var(--color-primary-border)" : "var(--color-border)"}`,
              }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {GROUP_LABELS[s.group] ?? s.group}
                </span>
                <span className="text-xs font-bold" style={{ color: barColor }}>{s.freshnessPct}%</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${s.freshnessPct}%`, background: barColor }} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
