"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getInjuriesV2, saveInjuryV2, deleteInjuryV2, updateInjuryV2, generateId } from "@/lib/storage";
import { INJURY_CONDITIONS, getRehabProtocolsForConditions } from "@/lib/rehab";
import type { Injury, InjuryPhase } from "@/lib/types";

const PHASE_LABELS: Record<InjuryPhase, { label: string; color: string; description: string }> = {
  acute: {
    label: "🔴 Agudo",
    color: "text-[var(--color-danger-text)] border-[var(--color-danger-border)] bg-[var(--color-danger-bg)]",
    description: "0-2 semanas — repouso relativo, mobilização suave",
  },
  subacute: {
    label: "🟡 Subagudo",
    color: "text-[var(--color-warning-text)] border-[var(--color-warning-border)] bg-[var(--color-warning-bg)]",
    description: "2-6 semanas — fortalecimento progressivo",
  },
  chronic: {
    label: "🟢 Crônico/Reabilitação",
    color: "text-[var(--color-primary)] border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]",
    description: "6+ semanas — exercício funcional com adaptações",
  },
  recovered: {
    label: "✅ Recuperado",
    color: "text-[var(--color-text-secondary)] border-[var(--color-border)] bg-[var(--color-surface-2)]",
    description: "Retorno ao exercício normal",
  },
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "1 — Desconforto leve",
  2: "2 — Dor leve",
  3: "3 — Dor moderada",
  4: "4 — Dor intensa",
  5: "5 — Grave/cirúrgico",
};

export default function InjuriesPage() {
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const [selectedCondition, setSelectedCondition] = useState("");
  const [severity, setSeverity] = useState<1 | 2 | 3 | 4 | 5>(2);
  const [phase, setPhase] = useState<InjuryPhase>("subacute");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedRecovery, setExpectedRecovery] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setInjuries(getInjuriesV2());
  }, []);

  const refresh = () => setInjuries(getInjuriesV2());

  const handleAdd = () => {
    if (!selectedCondition) return;
    const condition = INJURY_CONDITIONS.find((c) => c.id === selectedCondition);
    if (!condition) return;

    const injury: Injury = {
      id: generateId(),
      conditionId: selectedCondition,
      affectedMuscles: condition.affectedMuscles,
      severity,
      phase,
      startDate,
      expectedRecovery: expectedRecovery || undefined,
      notes: notes || undefined,
    };
    saveInjuryV2(injury);
    refresh();
    setShowAdd(false);
    setSelectedCondition("");
    setNotes("");
    setExpectedRecovery("");
  };

  const handleDelete = (id: string) => {
    if (confirm("Remover esta lesão?")) {
      deleteInjuryV2(id);
      refresh();
    }
  };

  const handleUpdatePhase = (id: string, newPhase: InjuryPhase) => {
    updateInjuryV2(id, { phase: newPhase });
    refresh();
  };

  const handleUpdateSeverity = (id: string, newSeverity: number) => {
    updateInjuryV2(id, { severity: newSeverity as 1 | 2 | 3 | 4 | 5 });
    refresh();
  };

  const activeInjuries = injuries.filter((i) => i.phase !== "recovered");
  const recoveredInjuries = injuries.filter((i) => i.phase === "recovered");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">🩹 Gestão de Lesões</h1>
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Registre suas condições clínicas para adaptar treinos e receber protocolos de reabilitação
          </p>
        </div>
        <Link href="/suggest" className="text-sm text-[var(--color-primary)] hover:text-[var(--color-text)]">
          🤖 Sugerir Treino →
        </Link>
      </div>

      {activeInjuries.length === 0 && !showAdd && (
        <div className="card p-8 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-[var(--color-text-secondary)] font-medium">Sem lesões ativas</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            Registre uma condição para receber adaptações de treino e protocolos de reabilitação
          </p>
        </div>
      )}

      {activeInjuries.map((inj) => {
        const condition = INJURY_CONDITIONS.find((c) => c.id === inj.conditionId);
        const protocols = getRehabProtocolsForConditions([inj.conditionId], inj.phase);
        const phaseInfo = PHASE_LABELS[inj.phase];

        return (
          <div key={inj.id} className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{condition?.icon ?? "🩹"}</span>
                  <h2 className="font-semibold text-[var(--color-text)]">{condition?.name ?? inj.conditionId}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${phaseInfo.color}`}>
                    {phaseInfo.label}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    Severidade: {inj.severity}/5
                  </span>
                </div>
                {condition?.description && (
                  <p className="text-[var(--color-text-secondary)] text-sm mt-2">{condition.description}</p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {inj.affectedMuscles.map((m) => (
                    <span key={m} className="badge badge-red">
                      {m}
                    </span>
                  ))}
                </div>
                {inj.notes && (
                  <p className="text-[var(--color-text-muted)] text-xs mt-2 italic">{inj.notes}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(inj.id)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] text-lg p-1 transition-colors"
                title="Remover lesão"
              >
                ×
              </button>
            </div>

            <div className={`rounded-lg p-3 text-xs border ${phaseInfo.color}`}>
              <p className="font-medium">{phaseInfo.label}</p>
              <p className="mt-0.5 opacity-80">{phaseInfo.description}</p>
              {condition?.phaseDescriptions[inj.phase] && (
                <p className="mt-1 font-medium">{condition.phaseDescriptions[inj.phase]}</p>
              )}
            </div>

            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Atualizar fase:</p>
              <div className="flex flex-wrap gap-1.5">
                {(["acute", "subacute", "chronic", "recovered"] as InjuryPhase[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handleUpdatePhase(inj.id, p)}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      inj.phase === p
                        ? PHASE_LABELS[p].color
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]"
                    }`}
                  >
                    {PHASE_LABELS[p].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">Severidade atual:</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdateSeverity(inj.id, s)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold border transition-colors ${
                      inj.severity === s
                        ? s <= 2
                          ? "bg-[var(--color-primary-soft)] border-[var(--color-primary-border)] text-[var(--color-primary)]"
                          : s <= 3
                          ? "bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-[var(--color-warning-text)]"
                          : "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-text)]"
                        : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">{SEVERITY_LABELS[inj.severity]}</p>
            </div>

            {protocols.length > 0 && (
              <div className="border-t border-[var(--color-border-subtle)] pt-3">
                <p className="text-xs text-[var(--color-text-secondary)] font-medium mb-2 flex items-center gap-1">
                  📚 Protocolos de Reabilitação para esta fase
                </p>
                {protocols.map((proto) => (
                  <div key={proto.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-3 mb-2">
                    <p className="text-sm font-medium text-[var(--color-text)]">{proto.name}</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">{proto.frequency}</p>
                    <div className="mt-2 space-y-1">
                      {proto.exercises.map((ex) => (
                        <div key={ex.name}>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            • <strong className="text-[var(--color-text)]">{ex.name}</strong> — {ex.sets}×{ex.reps}
                          </p>
                          <p className="text-xs text-[var(--color-text-muted)] pl-3 leading-relaxed">{ex.description}</p>
                          {ex.scienceNote && (
                            <p className="text-xs text-[var(--color-text-muted)] pl-3 italic mt-0.5">
                              🔬 {ex.scienceNote}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2">📚 {proto.source}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 italic">{proto.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full border border-dashed border-[var(--color-border)] rounded-xl p-4 text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors text-sm"
        >
          + Registrar Nova Lesão / Condição
        </button>
      )}

      {showAdd && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Registrar Condição</h3>
            <button
              onClick={() => setShowAdd(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--color-text-muted)] block">Condição Clínica</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {INJURY_CONDITIONS.map((cond) => (
                <button
                  key={cond.id}
                  onClick={() => setSelectedCondition(cond.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedCondition === cond.id
                      ? "bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-[var(--color-warning-text)]"
                      : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
                  }`}
                >
                  <p className="text-sm">
                    <span className="mr-1">{cond.icon}</span>
                    <span className="font-medium">{cond.name}</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5 line-clamp-2">{cond.description}</p>
                </button>
              ))}
            </div>
          </div>

          {selectedCondition && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-[var(--color-text-muted)] block">Fase atual</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["acute", "subacute", "chronic"] as InjuryPhase[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPhase(p)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        phase === p
                          ? PHASE_LABELS[p].color
                          : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-muted)]"
                      }`}
                    >
                      {PHASE_LABELS[p].label}
                      <span className="block text-xs opacity-70">{PHASE_LABELS[p].description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-[var(--color-text-muted)] block">Severidade</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeverity(s as 1 | 2 | 3 | 4 | 5)}
                      className={`w-10 h-10 rounded-lg font-bold border transition-colors ${
                        severity === s
                          ? s <= 2
                            ? "bg-[var(--color-primary-soft)] border-[var(--color-primary-border)] text-[var(--color-primary)]"
                            : s <= 3
                            ? "bg-[var(--color-warning-bg)] border-[var(--color-warning-border)] text-[var(--color-warning-text)]"
                            : "bg-[var(--color-danger-bg)] border-[var(--color-danger-border)] text-[var(--color-danger-text)]"
                          : "bg-[var(--color-surface-2)] border-[var(--color-border)] text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">{SEVERITY_LABELS[severity]}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1">Data de início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-xs text-[var(--color-text-muted)] block mb-1">Previsão de alta (opcional)</label>
                  <input
                    type="date"
                    value={expectedRecovery}
                    onChange={(e) => setExpectedRecovery(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[var(--color-text-muted)] block mb-1">Observações (opcional)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Ex: L4-L5 confirmado por MRI, fisioterapeuta Dr. Silva..."
                  className="input resize-none"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleAdd}
              disabled={!selectedCondition}
              className="flex-1 btn btn-primary"
            >
              Registrar Lesão
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {recoveredInjuries.length > 0 && (
        <details className="group">
          <summary className="text-xs text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-secondary)] select-none">
            Condições recuperadas ({recoveredInjuries.length})
          </summary>
          <div className="mt-2 space-y-2">
            {recoveredInjuries.map((inj) => {
              const condition = INJURY_CONDITIONS.find((c) => c.id === inj.conditionId);
              return (
                <div key={inj.id} className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-2">
                  <span className="text-sm text-[var(--color-text-muted)]">
                    {condition?.icon} {condition?.name} · {inj.startDate}
                  </span>
                  <button
                    onClick={() => handleDelete(inj.id)}
                    className="text-[var(--color-border)] hover:text-[var(--color-danger)] transition-colors"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </details>
      )}

      <div className="bg-[var(--color-surface)] border border-[var(--color-border-subtle)] rounded-xl p-4">
        <p className="text-xs text-[var(--color-text-muted)] text-center">
          ⚕️ Esta ferramenta fornece orientações baseadas em evidências científicas publicadas.
          Sempre consulte um fisioterapeuta, médico ou educador físico antes de iniciar qualquer
          programa de exercícios com lesão ativa.
        </p>
      </div>
    </div>
  );
}
