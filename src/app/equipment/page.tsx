"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ALL_EQUIPMENT, EQUIPMENT_CATEGORIES, EQUIPMENT_CATEGORY_LABELS } from "@/lib/equipment";
import { getEquipmentProfile, saveEquipmentProfile } from "@/lib/storage";

export default function EquipmentPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelected(new Set(getEquipmentProfile()));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSaved(false);
  };

  const handleSave = () => {
    saveEquipmentProfile(Array.from(selected));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href="/more" className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] mb-2 inline-flex items-center gap-1">
            ← Mais
          </Link>
          <h1 className="text-2xl font-bold">Meus Equipamentos</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            Selecione o que você tem disponível — em casa ou na academia
          </p>
        </div>
        <button
          onClick={handleSave}
          className={`btn shrink-0 ${saved ? "btn-secondary" : "btn-primary"}`}
        >
          {saved ? "✓ Salvo!" : "Salvar"}
        </button>
      </div>

      <div className="card p-3 flex items-center gap-3">
        <span className="text-2xl">🏋</span>
        <div>
          <p className="font-semibold text-sm">{selectedCount} equipamento{selectedCount !== 1 ? "s" : ""} selecionado{selectedCount !== 1 ? "s" : ""}</p>
          <p className="text-xs text-[var(--color-text-muted)]">Os treinos serão filtrados com base nisso</p>
        </div>
      </div>

      {EQUIPMENT_CATEGORIES.map((cat) => {
        const items = ALL_EQUIPMENT.filter((e) => e.category === cat);
        return (
          <div key={cat}>
            <p className="section-label mb-3">{EQUIPMENT_CATEGORY_LABELS[cat]}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((eq) => {
                const isSelected = selected.has(eq.id);
                return (
                  <button
                    key={eq.id}
                    onClick={() => toggle(eq.id)}
                    className={`card text-left p-4 transition-all cursor-pointer ${
                      isSelected
                        ? "border-[var(--color-primary-border)] bg-[var(--color-primary-soft)]"
                        : "card-interactive opacity-70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-3xl">{eq.emoji}</span>
                      {isSelected && (
                        <span className="text-[var(--color-primary)] text-lg font-bold leading-none">✓</span>
                      )}
                    </div>
                    <p className="font-semibold text-sm leading-tight">{eq.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 leading-snug line-clamp-2">{eq.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="sticky bottom-28 flex justify-center pt-4">
        <button
          onClick={handleSave}
          className={`btn btn-lg shadow-lg ${saved ? "btn-secondary" : "btn-primary"}`}
        >
          {saved ? "✓ Equipamentos salvos!" : `Salvar ${selectedCount} equipamento${selectedCount !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
