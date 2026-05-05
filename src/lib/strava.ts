// Strava API integration — client-side OAuth2 + activity sync
// The user must register a Strava Developer app at https://developers.strava.com
// and provide client_id + client_secret (stored in localStorage — OK for personal app)

export interface StravaToken {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  athlete_id: number;
}

export interface StravaSettings {
  clientId: string;
  clientSecret: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;        // ISO 8601 UTC
  elapsed_time: number;      // seconds
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  moving_time: number;
}

const STRAVA_KEY = "gymapp:strava_token";
const STRAVA_SETTINGS_KEY = "gymapp:strava_settings";
const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_API = "https://www.strava.com/api/v3";

// ─── Settings ────────────────────────────────────────────────────────────────

export function getStravaSettings(): StravaSettings | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STRAVA_SETTINGS_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveStravaSettings(settings: StravaSettings): void {
  localStorage.setItem(STRAVA_SETTINGS_KEY, JSON.stringify(settings));
}

export function clearStravaSettings(): void {
  localStorage.removeItem(STRAVA_SETTINGS_KEY);
  localStorage.removeItem(STRAVA_KEY);
}

// ─── Token management ────────────────────────────────────────────────────────

export function getStravaToken(): StravaToken | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STRAVA_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveStravaToken(token: StravaToken): void {
  localStorage.setItem(STRAVA_KEY, JSON.stringify(token));
}

export function isStravaConnected(): boolean {
  const token = getStravaToken();
  return !!token;
}

async function refreshTokenIfNeeded(): Promise<StravaToken | null> {
  const token = getStravaToken();
  const settings = getStravaSettings();
  if (!token || !settings) return null;

  const now = Math.floor(Date.now() / 1000);
  if (token.expires_at > now + 300) return token; // still valid (5 min buffer)

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: "refresh_token",
      refresh_token: token.refresh_token,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const newToken: StravaToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: token.athlete_id,
  };
  saveStravaToken(newToken);
  return newToken;
}

// ─── OAuth2 flow ─────────────────────────────────────────────────────────────

export function redirectToStravaAuth(clientId: string): void {
  const redirectUri = `${window.location.origin}/strava-callback/`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "activity:write,activity:read_all",
  });
  window.location.href = `${STRAVA_AUTH_URL}?${params}`;
}

export async function exchangeStravaCode(code: string): Promise<StravaToken | null> {
  const settings = getStravaSettings();
  if (!settings) return null;

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  const token: StravaToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
    athlete_id: data.athlete.id,
  };
  saveStravaToken(token);
  return token;
}

// ─── Export session → Strava activity ────────────────────────────────────────

export async function exportSessionToStrava(
  session: import("./types").WorkoutSession
): Promise<{ success: boolean; activityId?: number; error?: string }> {
  const token = await refreshTokenIfNeeded();
  if (!token) return { success: false, error: "Não conectado ao Strava" };

  const durationSeconds = session.durationMinutes
    ? session.durationMinutes * 60
    : 3600;

  // Build exercise description
  const exerciseLines = session.exercises.map((ex) => {
    const sets = ex.sets.filter((s) => s.completed);
    const setStr = sets
      .map((s) => {
        const parts = [`${s.reps || 0} reps`];
        if (s.weight) parts.push(`${s.weight}kg`);
        return parts.join(" x ");
      })
      .join(", ");
    return `• ${ex.exerciseId}: ${setStr}`;
  });

  const description = [
    `Treino registrado no GymApp`,
    "",
    ...exerciseLines,
    session.notes ? `\nNotas: ${session.notes}` : "",
  ]
    .join("\n")
    .trim();

  const res = await fetch(`${STRAVA_API}/activities`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: session.workoutName,
      sport_type: "WeightTraining",
      start_date_local: session.startedAt,
      elapsed_time: durationSeconds,
      description,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.message || `HTTP ${res.status}` };
  }

  const activity: StravaActivity = await res.json();
  return { success: true, activityId: activity.id };
}

// ─── Import recent Strava activities ─────────────────────────────────────────

export async function fetchStravaActivities(days = 30): Promise<StravaActivity[]> {
  const token = await refreshTokenIfNeeded();
  if (!token) return [];

  const after = Math.floor(
    (Date.now() - days * 24 * 60 * 60 * 1000) / 1000
  );

  const res = await fetch(
    `${STRAVA_API}/athlete/activities?after=${after}&per_page=100`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  );

  if (!res.ok) return [];
  const activities: StravaActivity[] = await res.json();

  // Fetch detailed activity (for calories) only for WeightTraining
  const detailed = await Promise.all(
    activities
      .filter((a) => a.sport_type === "WeightTraining")
      .map(async (a) => {
        const r = await fetch(`${STRAVA_API}/activities/${a.id}`, {
          headers: { Authorization: `Bearer ${token.access_token}` },
        });
        return r.ok ? (r.json() as Promise<StravaActivity>) : a;
      })
  );

  const detailedMap = new Map(detailed.map((a) => [a.id, a]));
  return activities.map((a) =>
    detailedMap.has(a.id) ? detailedMap.get(a.id)! : a
  );
}

/**
 * Match Strava activities to GymApp sessions by date and enrich with HR/calories.
 * Returns array of session IDs that were updated.
 */
export function matchAndEnrichSessions(
  sessions: import("./types").WorkoutSession[],
  activities: StravaActivity[]
): import("./types").WorkoutSession[] {
  return sessions.map((session) => {
    const sessionDate = session.date; // YYYY-MM-DD
    const match = activities.find((a) => {
      const actDate = a.start_date.slice(0, 10);
      return actDate === sessionDate;
    });

    if (!match) return session;

    return {
      ...session,
      heartRateAvg: match.average_heartrate ?? session.heartRateAvg,
      heartRateMax: match.max_heartrate ?? session.heartRateMax,
      calories: match.calories ?? session.calories,
      stravaActivityId: String(match.id),
      externalSource: "strava" as const,
    };
  });
}
