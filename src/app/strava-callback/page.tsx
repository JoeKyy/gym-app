"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, XCircle } from "lucide-react";
import { exchangeStravaCode, getStravaSettings } from "@/lib/strava";

export default function StravaCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Autenticando com Strava...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      setStatus("error");
      setMessage(error === "access_denied" ? "Acesso negado pelo usuário." : "Código de autorização não encontrado.");
      return;
    }

    const settings = getStravaSettings();
    if (!settings) {
      setStatus("error");
      setMessage("Configure o Client ID e Client Secret do Strava primeiro.");
      return;
    }

    let timer: ReturnType<typeof setTimeout>;
    exchangeStravaCode(code).then((token) => {
      if (!token) {
        setStatus("error");
        setMessage("Falha ao trocar o código por token. Verifique o Client Secret.");
        return;
      }
      setStatus("success");
      setMessage("Conectado com sucesso! Redirecionando...");
      timer = setTimeout(() => router.push("/sync"), 1500);
    });
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      {status === "loading" && (
        <>
          <div className="w-12 h-12 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-muted)]">{message}</p>
        </>
      )}
      {status === "success" && (
        <>
          <PartyPopper size={48} style={{ color: "var(--color-success)" }} />
          <h2 className="text-xl font-bold text-green-500">Conectado!</h2>
          <p className="text-[var(--color-text-muted)]">{message}</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle size={48} style={{ color: "var(--color-danger)" }} />
          <h2 className="text-xl font-bold text-red-500">Erro</h2>
          <p className="text-[var(--color-text-muted)]">{message}</p>
          <button
            className="btn btn-primary"
            onClick={() => router.push("/sync")}
          >
            Voltar
          </button>
        </>
      )}
    </div>
  );
}
