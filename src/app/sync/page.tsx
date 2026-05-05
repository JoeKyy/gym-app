"use client";

import { useState, useRef, useEffect } from "react";
import {
  getStravaSettings,
  saveStravaSettings,
  clearStravaSettings,
  isStravaConnected,
  redirectToStravaAuth,
  fetchStravaActivities,
  matchAndEnrichSessions,
  StravaActivity,
} from "@/lib/strava";
import {
  parseAppleHealthExport,
  matchAndEnrichFromHealth,
  HealthDataPoint,
} from "@/lib/appleHealth";
import { getSessions, saveSession } from "@/lib/storage";

type Tab = "strava" | "apple";

export default function SyncPage() {
  const [tab, setTab] = useState<Tab>("strava");

  // ── Strava state ──────────────────────────────────────────────────────────
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [connected, setConnected] = useState(false);
  const [stravaMsg, setStravaMsg] = useState("");
  const [stravaLoading, setStravaLoading] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // ── Apple Health state ────────────────────────────────────────────────────
  const [appleMsg, setAppleMsg] = useState("");
  const [appleLoading, setAppleLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const settings = getStravaSettings();
    if (settings) {
      setClientId(settings.clientId);
      setClientSecret(settings.clientSecret);
    }
    setConnected(isStravaConnected());
  }, []);

  // ── Strava helpers ────────────────────────────────────────────────────────

  function handleSaveSettings() {
    if (!clientId.trim() || !clientSecret.trim()) {
      setStravaMsg("Preencha Client ID e Client Secret.");
      return;
    }
    saveStravaSettings({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
    setStravaMsg("Configurações salvas!");
    setTimeout(() => setStravaMsg(""), 2000);
  }

  function handleConnect() {
    if (!clientId.trim()) {
      setStravaMsg("Salve o Client ID primeiro.");
      return;
    }
    redirectToStravaAuth(clientId.trim());
  }

  function handleDisconnect() {
    clearStravaSettings();
    setConnected(false);
    setClientId("");
    setClientSecret("");
    setStravaMsg("Desconectado do Strava.");
  }

  async function handleStravaImport() {
    setStravaLoading(true);
    setStravaMsg("Buscando atividades do Strava...");
    const activities: StravaActivity[] = await fetchStravaActivities(60);
    if (!activities.length) {
      setStravaMsg("Nenhuma atividade de força encontrada nos últimos 60 dias.");
      setStravaLoading(false);
      return;
    }
    const sessions = getSessions();
    const enriched = matchAndEnrichSessions(sessions, activities);
    let count = 0;
    enriched.forEach((s) => {
      const original = sessions.find((o) => o.id === s.id);
      const changed =
        original &&
        (original.heartRateAvg !== s.heartRateAvg ||
          original.calories !== s.calories);
      if (changed) {
        saveSession(s);
        count++;
      }
    });
    setImportedCount(count);
    setStravaMsg(
      count
        ? `✅ ${count} sessão(ões) enriquecida(s) com dados do Strava!`
        : "Nenhuma sessão correspondeu às atividades encontradas."
    );
    setStravaLoading(false);
  }

  // ── Apple Health helpers ──────────────────────────────────────────────────

  async function handleAppleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAppleLoading(true);
    setAppleMsg("Processando export.xml...");
    try {
      const healthData: HealthDataPoint[] = await parseAppleHealthExport(file);
      if (!healthData.length) {
        setAppleMsg("Nenhum dado de treino encontrado no arquivo.");
        setAppleLoading(false);
        return;
      }
      const sessions = getSessions();
      const enriched = matchAndEnrichFromHealth(sessions, healthData);
      let count = 0;
      enriched.forEach((s) => {
        const original = sessions.find((o) => o.id === s.id);
        const changed =
          original &&
          (original.heartRateAvg !== s.heartRateAvg ||
            original.calories !== s.calories);
        if (changed) {
          saveSession(s);
          count++;
        }
      });
      setAppleMsg(
        count
          ? `✅ ${count} sessão(ões) enriquecida(s) com dados do Apple Health!`
          : `Arquivo processado (${healthData.length} treinos), mas nenhuma sessão correspondeu.`
      );
    } catch {
      setAppleMsg("Erro ao processar arquivo. Certifique-se de importar o export.xml do Apple Health.");
    }
    setAppleLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sincronizar</h1>
        <p className="text-[var(--color-text-muted)] text-sm mt-0.5">
          Integrar com Strava e Apple Health
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-[var(--color-surface-2)] rounded-xl p-1">
        {(["strava", "apple"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? "bg-[var(--color-surface)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)]"
            }`}
          >
            {t === "strava" ? "🚴 Strava" : "🍎 Apple Health"}
          </button>
        ))}
      </div>

      {/* ── Strava Tab ─────────────────────────────────────────────────────── */}
      {tab === "strava" && (
        <div className="space-y-4">
          {connected ? (
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="font-semibold">Strava conectado</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Token armazenado localmente
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="btn btn-primary flex-1"
                  onClick={handleStravaImport}
                  disabled={stravaLoading}
                >
                  {stravaLoading ? "Importando..." : "📥 Importar dados (60 dias)"}
                </button>
                <button
                  className="btn btn-ghost text-sm"
                  onClick={handleDisconnect}
                >
                  Desconectar
                </button>
              </div>

              {stravaMsg && (
                <p className="text-sm text-[var(--color-text-muted)]">{stravaMsg}</p>
              )}
            </div>
          ) : (
            <div className="card p-4 space-y-4">
              <div>
                <p className="font-semibold mb-1">Configurar app Strava</p>
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  1. Acesse{" "}
                  <a
                    href="https://developers.strava.com/docs/getting-started/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent)] underline"
                  >
                    developers.strava.com
                  </a>{" "}
                  e crie um app<br />
                  2. Em "Authorization Callback Domain" coloque:{" "}
                  <code className="bg-[var(--color-surface-2)] px-1 rounded text-xs">
                    gym.joekyy.com.br
                  </code>
                  <br />
                  3. Cole o Client ID e Secret abaixo
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Client ID (número)"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="input w-full"
                />
                <input
                  type="password"
                  placeholder="Client Secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div className="flex gap-2">
                <button className="btn btn-ghost flex-1 text-sm" onClick={handleSaveSettings}>
                  Salvar
                </button>
                <button className="btn btn-primary flex-1" onClick={handleConnect}>
                  🔗 Conectar com Strava
                </button>
              </div>

              {stravaMsg && (
                <p className="text-sm text-[var(--color-text-muted)]">{stravaMsg}</p>
              )}
            </div>
          )}

          {/* What gets imported */}
          <div className="card p-4 space-y-2">
            <p className="text-sm font-semibold">O que é importado?</p>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-1">
              <li>❤️ Frequência cardíaca média e máxima</li>
              <li>🔥 Calorias ativas</li>
              <li>📅 Match por data com suas sessões existentes</li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Apple Health Tab ──────────────────────────────────────────────── */}
      {tab === "apple" && (
        <div className="space-y-4">
          {/* Export */}
          <div className="card p-4 space-y-3">
            <p className="font-semibold">📤 Exportar para Apple Health</p>
            <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
              Exporte sessões individuais como arquivo .tcx e importe no iPhone via app
              Arquivos → compartilhar com Health.
            </p>
            <SessionTCXList />
          </div>

          {/* Import */}
          <div className="card p-4 space-y-3">
            <p className="font-semibold">📥 Importar do Apple Health</p>
            <ol className="text-xs text-[var(--color-text-muted)] leading-relaxed space-y-1">
              <li>1. No iPhone: app Saúde → foto de perfil → Exportar dados de saúde</li>
              <li>2. Extraia o ZIP e encontre o arquivo <code className="bg-[var(--color-surface-2)] px-1 rounded">export.xml</code></li>
              <li>3. Selecione o arquivo abaixo</li>
            </ol>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={handleAppleImport}
            />
            <button
              className="btn btn-primary w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={appleLoading}
            >
              {appleLoading ? "Processando..." : "📂 Selecionar export.xml"}
            </button>
            {appleMsg && (
              <p className="text-sm text-[var(--color-text-muted)]">{appleMsg}</p>
            )}
          </div>

          {/* What gets imported */}
          <div className="card p-4 space-y-2">
            <p className="text-sm font-semibold">O que é importado?</p>
            <ul className="text-xs text-[var(--color-text-muted)] space-y-1">
              <li>❤️ Frequência cardíaca (de leituras Apple Watch)</li>
              <li>🔥 Calorias ativas (Active Energy Burned)</li>
              <li>🏋️ Match por data com HKWorkout de força</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Session TCX export list ─────────────────────────────────────────────────

import { downloadTCX } from "@/lib/appleHealth";

function SessionTCXList() {
  const sessions = getSessions()
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  if (!sessions.length) {
    return (
      <p className="text-sm text-[var(--color-text-muted)]">
        Nenhuma sessão registrada ainda.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="flex items-center justify-between gap-2 py-1"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{s.workoutName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{s.date}</p>
          </div>
          <button
            className="btn btn-ghost text-xs shrink-0"
            onClick={() => downloadTCX(s)}
          >
            ⬇ .tcx
          </button>
        </div>
      ))}
    </div>
  );
}
