"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePlans } from "@/hooks/usePlans";

export default function PlansPage() {
  const { plans, activePlanId, createPlan, removePlan, activatePlan } = usePlans();
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const plan = createPlan(newName.trim());
    setNewName("");
    setShowForm(false);
    router.push(`/plan?id=${plan.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Planos Semanais</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="btn btn-primary"
        >
          + Novo plano
        </button>
      </div>

      {showForm && (
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold">Criar plano semanal</h2>
          <input
            autoFocus
            type="text"
            placeholder="Nome do plano (ex: Reabilitação, Academia)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="input"
          />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="btn btn-primary">Criar</button>
            <button onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-medium text-[var(--color-text)]">Nenhum plano ainda</p>
          <p className="text-sm mt-1">Crie um plano semanal para organizar seus treinos</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const isActive = plan.id === activePlanId;
            const dayCount = Object.values(plan.schedule).filter((ids) => ids && ids.length > 0).length;
            return (
              <div
                key={plan.id}
                className={`card p-4 transition-colors flex flex-col gap-3 ${
                  isActive ? "border-[var(--color-primary)]" : "card-interactive"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{plan.name}</p>
                      {isActive && <span className="badge badge-green">Ativo</span>}
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{dayCount} dias configurados</p>
                  </div>
                  <button
                    onClick={() => removePlan(plan.id)}
                    className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors text-lg leading-none"
                    title="Excluir"
                  >×</button>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/plan?id=${plan.id}`}
                    className="flex-1 rounded-lg text-center py-2 text-sm transition-colors bg-[var(--color-primary-soft)] hover:bg-[var(--color-primary-soft-strong)] text-[var(--color-primary)] border border-[var(--color-primary-border)]"
                  >
                    Editar →
                  </Link>
                  {!isActive && (
                    <button
                      onClick={() => activatePlan(plan.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
