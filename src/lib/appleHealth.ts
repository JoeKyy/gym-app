// Apple Health integration — export .tcx + import export.xml (client-side only)

// ─── Export to .tcx (Garmin Training Center XML — Apple Health accepts this) ──

export function generateTCX(session: import("./types").WorkoutSession): string {
  const startDate = session.startedAt;
  const durationSeconds = session.durationMinutes
    ? session.durationMinutes * 60
    : 3600;

  // Build HR samples if we have average (create 2 synthetic points)
  let hrSection = "";
  if (session.heartRateAvg) {
    hrSection = `
          <HeartRateBpm xsi:type="HeartRateInBeatsPerMinute_t">
            <Value>${session.heartRateAvg}</Value>
          </HeartRateBpm>`;
  }

  // Build extension for calories
  let caloriesExt = "";
  if (session.calories) {
    caloriesExt = `
          <Extensions>
            <ns3:LX>
              <ns3:Calories>${session.calories}</ns3:Calories>
            </ns3:LX>
          </Extensions>`;
  }

  // Exercise summary in notes
  const exerciseNotes = session.exercises
    .map((ex) => {
      const sets = ex.sets.filter((s) => s.completed);
      return `${ex.exerciseId}: ${sets.length} sets`;
    })
    .join(", ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase
  xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:ns3="http://www.garmin.com/xmlschemas/ActivityExtension/v2"
  xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">
  <Activities>
    <Activity Sport="Other">
      <Id>${startDate}</Id>
      <Lap StartTime="${startDate}">
        <TotalTimeSeconds>${durationSeconds}</TotalTimeSeconds>
        <DistanceMeters>0</DistanceMeters>${session.calories ? `\n        <Calories>${session.calories}</Calories>` : ""}
        <Intensity>Active</Intensity>
        <TriggerMethod>Manual</TriggerMethod>
        <Track>
          <Trackpoint>
            <Time>${startDate}</Time>${hrSection}${caloriesExt}
          </Trackpoint>
        </Track>
      </Lap>
      <Notes>${session.workoutName} — ${exerciseNotes}${session.notes ? ". " + session.notes : ""}</Notes>
    </Activity>
  </Activities>
</TrainingCenterDatabase>`;
}

export function downloadTCX(
  session: import("./types").WorkoutSession
): void {
  const xml = generateTCX(session);
  const blob = new Blob([xml], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gymapp-${session.date}-${session.workoutName.replace(/\s+/g, "-")}.tcx`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Import from Apple Health export.xml ─────────────────────────────────────

export interface HealthDataPoint {
  date: string;         // YYYY-MM-DD
  heartRateAvg?: number;
  heartRateMax?: number;
  calories?: number;
  workoutType?: string;
  durationMinutes?: number;
  startDate: string;    // ISO datetime
  endDate: string;      // ISO datetime
}

/**
 * Parse Apple Health export.xml file.
 * Relevant records:
 *  - HKWorkout entries (workout sessions)
 *  - HKQuantityTypeIdentifierHeartRate (bpm)
 *  - HKQuantityTypeIdentifierActiveEnergyBurned (kcal)
 */
export async function parseAppleHealthExport(
  file: File
): Promise<HealthDataPoint[]> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "application/xml");

  // Parse workouts
  const workouts = Array.from(doc.querySelectorAll("Workout"));
  const dataPoints: HealthDataPoint[] = workouts.map((w) => {
    const startDate = w.getAttribute("startDate") || "";
    const endDate = w.getAttribute("endDate") || "";
    const duration = parseFloat(w.getAttribute("duration") || "0");
    const calories = parseFloat(
      w.getAttribute("totalEnergyBurned") || "0"
    );
    const workoutType = (w.getAttribute("workoutActivityType") || "")
      .replace("HKWorkoutActivityType", "")
      .toLowerCase();

    return {
      date: startDate.slice(0, 10),
      startDate,
      endDate,
      durationMinutes: Math.round(duration),
      calories: calories > 0 ? Math.round(calories) : undefined,
      workoutType,
    };
  });

  // Parse heart rate records and match to workouts by time window
  const hrRecords = Array.from(
    doc.querySelectorAll('Record[type="HKQuantityTypeIdentifierHeartRate"]')
  );

  for (const dp of dataPoints) {
    const dpStart = new Date(dp.startDate).getTime();
    const dpEnd = new Date(dp.endDate).getTime();

    const matching = hrRecords
      .filter((r) => {
        const t = new Date(r.getAttribute("startDate") || "").getTime();
        return t >= dpStart && t <= dpEnd;
      })
      .map((r) => parseFloat(r.getAttribute("value") || "0"))
      .filter((v) => v > 0);

    if (matching.length > 0) {
      dp.heartRateAvg = Math.round(
        matching.reduce((a, b) => a + b, 0) / matching.length
      );
      dp.heartRateMax = Math.round(Math.max(...matching));
    }
  }

  return dataPoints;
}

/**
 * Match parsed Health data to GymApp sessions by date, enrich with HR/calories.
 */
export function matchAndEnrichFromHealth(
  sessions: import("./types").WorkoutSession[],
  healthData: HealthDataPoint[]
): import("./types").WorkoutSession[] {
  return sessions.map((session) => {
    const match = healthData.find((h) => h.date === session.date);
    if (!match) return session;

    return {
      ...session,
      heartRateAvg: match.heartRateAvg ?? session.heartRateAvg,
      heartRateMax: match.heartRateMax ?? session.heartRateMax,
      calories: match.calories ?? session.calories,
      externalSource: session.externalSource ?? ("apple_health" as const),
    };
  });
}
