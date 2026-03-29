import { useMemo } from "react";

const BADGE_DEFS = [
  { id: "first", name: "First Rep", desc: "Logged your first workout", icon: "🎯", check: (s) => s.totalWorkouts >= 1 },
  { id: "streak3", name: "3-Day Streak", desc: "3 consecutive workout days", icon: "🔥", check: (s) => s.maxStreak >= 3 },
  { id: "streak7", name: "7-Day Streak", desc: "7 consecutive workout days", icon: "⚡", check: (s) => s.maxStreak >= 7 },
  { id: "streak14", name: "2-Week Warrior", desc: "14 consecutive workout days", icon: "🏆", check: (s) => s.maxStreak >= 14 },
  { id: "streak30", name: "30-Day Beast", desc: "30 consecutive workout days", icon: "👑", check: (s) => s.maxStreak >= 30 },
  { id: "week5", name: "Full Send Week", desc: "5+ workouts in a single week", icon: "💪", check: (s) => s.maxWeekSessions >= 5 },
  { id: "week6", name: "No Days Off", desc: "6+ workouts in a single week", icon: "🦾", check: (s) => s.maxWeekSessions >= 6 },
  { id: "ex10", name: "Variety Pack", desc: "Tried 10 different exercises", icon: "🎨", check: (s) => s.uniqueExercises >= 10 },
  { id: "ex25", name: "Exercise Explorer", desc: "Tried 25 different exercises", icon: "🗺️", check: (s) => s.uniqueExercises >= 25 },
  { id: "sessions10", name: "10 Sessions", desc: "Logged 10 workout sessions", icon: "📊", check: (s) => s.totalWorkouts >= 10 },
  { id: "sessions25", name: "25 & Counting", desc: "Logged 25 workout sessions", icon: "📈", check: (s) => s.totalWorkouts >= 25 },
  { id: "sessions50", name: "Half Century", desc: "Logged 50 workout sessions", icon: "🎖️", check: (s) => s.totalWorkouts >= 50 },
  { id: "sessions100", name: "The Centurion", desc: "Logged 100 workout sessions", icon: "💯", check: (s) => s.totalWorkouts >= 100 },
  { id: "allMuscles", name: "Full Body", desc: "Trained all 6 muscle groups", icon: "🧬", check: (s) => s.musclesCovered >= 6 },
  { id: "pr5", name: "Record Breaker", desc: "Set 5 personal records", icon: "🏅", check: (s) => s.totalPRs >= 5 },
  { id: "pr15", name: "PR Machine", desc: "Set 15 personal records", icon: "🥇", check: (s) => s.totalPRs >= 15 },
  { id: "photo5", name: "Snap Happy", desc: "ID'd 5 machines by photo", icon: "📸", check: (s) => s.photoScans >= 5 },
];

export function computeBadgeStats(workouts) {
  const byDate = {};
  workouts.forEach((w) => {
    if (!byDate[w.date]) byDate[w.date] = [];
    byDate[w.date].push(w);
  });

  const sortedDates = Object.keys(byDate).sort();

  // Max streak
  let maxStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.round((curr - prev) / 86400000);
      if (diffDays === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);
  }

  // Max sessions in a week (Mon-Sun)
  let maxWeekSessions = 0;
  const weekBuckets = {};
  sortedDates.forEach((dateStr) => {
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(d);
    monday.setDate(d.getDate() - mondayOffset);
    const weekKey = monday.toISOString().split("T")[0];
    weekBuckets[weekKey] = (weekBuckets[weekKey] || 0) + 1;
  });
  Object.values(weekBuckets).forEach((c) => {
    maxWeekSessions = Math.max(maxWeekSessions, c);
  });

  // Unique exercises
  const uniqueExercises = [...new Set(workouts.map((w) => w.exercise))].length;

  // Muscles covered
  const muscles = new Set(workouts.map((w) => w.muscle));
  const coreMuscles = ["Chest", "Back", "Legs", "Shoulders", "Arms", "Core"];
  const musclesCovered = coreMuscles.filter((m) => muscles.has(m)).length;

  // Total PRs
  const prMap = {};
  let totalPRs = 0;
  // Sort by timestamp to track PRs chronologically
  const sorted = [...workouts].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  sorted.forEach((w) => {
    if (w.weight > 0) {
      if (!prMap[w.exercise] || w.weight > prMap[w.exercise]) {
        if (prMap[w.exercise]) totalPRs++; // Don't count the first entry as a PR
        prMap[w.exercise] = w.weight;
      }
    }
  });

  // Photo scans
  const photoScans = workouts.filter((w) => w.source === "photo").length;

  return {
    maxStreak,
    maxWeekSessions,
    uniqueExercises,
    musclesCovered,
    totalPRs,
    photoScans,
    totalWorkouts: sortedDates.length,
  };
}

export default function Badges({ workouts }) {
  const badgeStats = useMemo(() => computeBadgeStats(workouts), [workouts]);

  const earned = BADGE_DEFS.filter((b) => b.check(badgeStats));
  const locked = BADGE_DEFS.filter((b) => !b.check(badgeStats));

  return (
    <div>
      {/* Earned */}
      {earned.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, color: "#C6FF00", fontFamily: "'Space Mono', monospace",
            letterSpacing: "2px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            EARNED — {earned.length}/{BADGE_DEFS.length}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {earned.map((b) => (
              <div key={b.id} style={{
                background: "#141419", borderRadius: 14, padding: "16px 14px",
                border: "1px solid rgba(198,255,0,0.2)",
              }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{b.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E6E1", marginBottom: 2 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.4 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <div style={{
            fontSize: 10, color: "#444", fontFamily: "'Space Mono', monospace",
            letterSpacing: "2px", marginBottom: 14,
          }}>
            LOCKED
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {locked.map((b) => (
              <div key={b.id} style={{
                background: "#141419", borderRadius: 14, padding: "16px 14px",
                border: "1px solid #1E1E26", opacity: 0.5,
              }}>
                <div style={{ fontSize: 28, marginBottom: 6, filter: "grayscale(1)" }}>{b.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#666", marginBottom: 2 }}>{b.name}</div>
                <div style={{ fontSize: 11, color: "#555", lineHeight: 1.4 }}>{b.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
