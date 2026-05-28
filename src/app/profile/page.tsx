"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Dumbbell, Flame, Zap, HeartPulse, RefreshCw, Layers, ArrowUpDown, Grid3X3, Check, Weight } from "lucide-react";
import { getProfile, saveProfile } from "@/lib/storage";
import type { UserProfile, FitnessGoal, TrainingSplit } from "@/lib/types";
import type { LucideIcon } from "lucide-react";

const GOALS: { value: FitnessGoal; label: string; Icon: LucideIcon; desc: string }[] = [
  { value: "build_muscle",    Icon: Dumbbell,   label: "Hipertrofia",     desc: "Ganho de massa muscular" },
  { value: "get_stronger",    Icon: Weight,     label: "Força",           desc: "Compostos pesados, poucas reps" },
  { value: "get_lean",        Icon: Flame,      label: "Definição",       desc: "Queima de gordura + tônus" },
  { value: "general_fitness", Icon: Zap,        label: "Condicionamento", desc: "Saúde e equilíbrio geral" },
  { value: "rehab",           Icon: HeartPulse, label: "Reabilitação",    desc: "Foco em recuperação e mobilidade" },
];

const SPLITS: { value: TrainingSplit; label: string; Icon: LucideIcon; desc: string }[] = [
  { value: "fresh_muscle", Icon: RefreshCw,    label: "Músculo Fresco",     desc: "Prioriza músculos mais recuperados" },
  { value: "full_body",    Icon: Layers,       label: "Corpo Todo",         desc: "Todos os grupos em cada sessão" },
  { value: "upper_lower",  Icon: ArrowUpDown,  label: "Superior/Inferior",  desc: "Alterna parte de cima e baixo" },
  { value: "ppl",          Icon: Grid3X3,      label: "Push/Pull/Legs",     desc: "Divisão clássica de 3 dias" },
];

const LEVELS = [
  { value: "beginner",     label: "Iniciante",    desc: "< 1 ano treinando" },
  { value: "intermediate", label: "Intermediário", desc: "1–3 anos" },
  { value: "advanced",     label: "Avançado",     desc: "3+ anos" },
] as const;

const DURATIONS = [30, 45, 60, 75, 90] as const;

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(() => ({
    goal: "general_fitness",
    experienceLevel: "intermediate",
    split: "full_body",
    durationMinutes: 60,
    units: "kg",
    bodyStats: {},
  }));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  function update<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  function updateBodyStat(key: keyof UserProfile["bodyStats"], value: string) {
    const num = parseFloat(value);
    setProfile((p) => ({
      ...p,
      bodyStats: {
        ...p.bodyStats,
        [key]: isNaN(num) ? undefined : num,
      },
    }));
    setSaved(false);
  }

  function handleSave() {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <Link href="/settings" className="text-sm inline-flex items-center gap-1 mb-2"
          style={{ color: "var(--color-text-muted)" }}>
          ← Settings
        </Link>
        <h1 className="text-2xl font-bold">Meu Perfil</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
          Configure seu objetivo e preferências de treino
        </p>
      </div>

      {/* Objetivo */}
      <div>
        <p className="section-label mb-2">Objetivo</p>
        <div className="space-y-2">
          {GOALS.map(({ value, Icon, label, desc }) => (
            <button key={value}
              onClick={() => update("goal", value)}
              className="w-full flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all"
              style={{
                background: profile.goal === value ? "var(--color-primary-soft-strong)" : "var(--color-surface)",
                border: `1px solid ${profile.goal === value ? "var(--color-primary-border)" : "var(--color-border-subtle)"}`,
              }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: profile.goal === value ? "var(--color-primary-soft)" : "var(--color-surface-2)" }}>
                <Icon size={17} style={{ color: profile.goal === value ? "var(--color-primary)" : "var(--color-text-muted)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: profile.goal === value ? "var(--color-primary)" : "var(--color-text)" }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
              </div>
              {profile.goal === value && <Check size={16} style={{ color: "var(--color-primary)" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Nível de Experiência */}
      <div>
        <p className="section-label mb-2">Nível de Experiência</p>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((l) => (
            <button key={l.value}
              onClick={() => update("experienceLevel", l.value)}
              className="rounded-2xl px-3 py-3 text-center transition-all"
              style={{
                background: profile.experienceLevel === l.value ? "var(--color-primary-soft-strong)" : "var(--color-surface)",
                border: `1px solid ${profile.experienceLevel === l.value ? "var(--color-primary-border)" : "var(--color-border-subtle)"}`,
              }}>
              <p className="text-sm font-semibold"
                style={{ color: profile.experienceLevel === l.value ? "var(--color-primary)" : "var(--color-text)" }}>
                {l.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{l.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Training Split */}
      <div>
        <p className="section-label mb-2">Divisão de Treino</p>
        <div className="space-y-2">
          {SPLITS.map(({ value, Icon, label, desc }) => (
            <button key={value}
              onClick={() => update("split", value)}
              className="w-full flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all"
              style={{
                background: profile.split === value ? "var(--color-primary-soft-strong)" : "var(--color-surface)",
                border: `1px solid ${profile.split === value ? "var(--color-primary-border)" : "var(--color-border-subtle)"}`,
              }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: profile.split === value ? "var(--color-primary-soft)" : "var(--color-surface-2)" }}>
                <Icon size={17} style={{ color: profile.split === value ? "var(--color-primary)" : "var(--color-text-muted)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm"
                  style={{ color: profile.split === value ? "var(--color-primary)" : "var(--color-text)" }}>
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{desc}</p>
              </div>
              {profile.split === value && <Check size={16} style={{ color: "var(--color-primary)" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Duração Preferida */}
      <div>
        <p className="section-label mb-2">Duração Preferida do Treino</p>
        <div className="flex gap-2 flex-wrap">
          {DURATIONS.map((d) => (
            <button key={d}
              onClick={() => update("durationMinutes", d)}
              className="rounded-full px-4 py-2 text-sm font-medium transition-all"
              style={{
                background: profile.durationMinutes === d ? "var(--color-primary)" : "var(--color-surface-2)",
                color: profile.durationMinutes === d ? "var(--color-primary-text)" : "var(--color-text-secondary)",
                border: `1px solid ${profile.durationMinutes === d ? "var(--color-primary)" : "var(--color-border-subtle)"}`,
              }}>
              {d}min
            </button>
          ))}
        </div>
      </div>

      {/* Unidades */}
      <div>
        <p className="section-label mb-2">Unidade de Peso</p>
        <div className="flex gap-2">
          {(["kg", "lb"] as const).map((u) => (
            <button key={u}
              onClick={() => update("units", u)}
              className="rounded-full px-5 py-2 text-sm font-medium transition-all"
              style={{
                background: profile.units === u ? "var(--color-primary)" : "var(--color-surface-2)",
                color: profile.units === u ? "var(--color-primary-text)" : "var(--color-text-secondary)",
                border: `1px solid ${profile.units === u ? "var(--color-primary)" : "var(--color-border-subtle)"}`,
              }}>
              {u}
            </button>
          ))}
        </div>
      </div>

      {/* Dados Corporais */}
      <div>
        <p className="section-label mb-2">Dados Corporais <span className="font-normal normal-case"
          style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>(opcional)</span></p>
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-3">
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>Peso (kg)</label>
            <input type="number" min="30" max="300" step="0.5"
              value={profile.bodyStats.weight ?? ""}
              onChange={(e) => updateBodyStat("weight", e.target.value)}
              placeholder="70"
              className="w-full text-sm bg-transparent outline-none"
              style={{ color: "var(--color-text)" }} />
          </div>
          <div className="card p-3">
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>Altura (cm)</label>
            <input type="number" min="100" max="250" step="1"
              value={profile.bodyStats.height ?? ""}
              onChange={(e) => updateBodyStat("height", e.target.value)}
              placeholder="175"
              className="w-full text-sm bg-transparent outline-none"
              style={{ color: "var(--color-text)" }} />
          </div>
          <div className="card p-3">
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>Idade</label>
            <input type="number" min="10" max="100" step="1"
              value={profile.bodyStats.age ?? ""}
              onChange={(e) => updateBodyStat("age", e.target.value)}
              placeholder="30"
              className="w-full text-sm bg-transparent outline-none"
              style={{ color: "var(--color-text)" }} />
          </div>
          <div className="card p-3">
            <label className="text-xs mb-1.5 block" style={{ color: "var(--color-text-muted)" }}>Gênero</label>
            <select
              value={profile.bodyStats.gender ?? ""}
              onChange={(e) => {
                const v = e.target.value as "male" | "female" | "other" | "";
                setProfile((p) => ({
                  ...p,
                  bodyStats: { ...p.bodyStats, gender: v || undefined },
                }));
                setSaved(false);
              }}
              className="w-full text-sm bg-transparent outline-none"
              style={{ color: "var(--color-text)" }}>
              <option value="">—</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
              <option value="other">Outro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button onClick={handleSave}
        className="btn btn-primary w-full py-3 text-base font-semibold">
        {saved ? "✓ Salvo!" : "Salvar Perfil"}
      </button>
    </div>
  );
}
