const muscleColors = {
  Chest: "#FF6B6B", Back: "#4ECDC4", Legs: "#FFE66D",
  Shoulders: "#A8E6CF", Arms: "#DDA0DD", Core: "#FF9A76", Other: "#888",
};

export default function TodaySession({ workouts, onDelete }) {
  const today = new Date().toISOString().split("T")[0];
  const todayWorkouts = workouts.filter((w) => w.date === today);

  if (todayWorkouts.length === 0) return null;

  const totalSets = todayWorkouts.reduce((s, w) => s + (w.sets || 0), 0);
  const muscles = [...new Set(todayWorkouts.map((w) => w.muscle))];

  return (
    <div style={{
      background: "#141419", borderRadius: 20, padding: 20,
      border: "1px solid rgba(198,255,0,0.15)", marginBottom: 24,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#C6FF00", fontFamily: "'Space Mono', monospace", letterSpacing: "2px" }}>
            TODAY'S SESSION
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            {todayWorkouts.length} exercise{todayWorkouts.length !== 1 ? "s" : ""} · {totalSets} sets
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {muscles.map((m) => (
            <span key={m} style={{
              fontSize: 9, padding: "3px 8px", borderRadius: 100,
              background: (muscleColors[m] || "#888") + "22",
              color: muscleColors[m] || "#888",
              fontFamily: "'Space Mono', monospace", fontWeight: 700,
            }}>{m}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {todayWorkouts.map((w) => (
          <div key={w.id} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 14px", background: "#0A0A0F", borderRadius: 12,
            border: "1px solid #1E1E26",
          }}>
            <div style={{
              width: 6, height: 36, borderRadius: 3, flexShrink: 0,
              background: muscleColors[w.muscle] || "#888",
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: "#E8E6E1",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{w.exercise}</div>
              <div style={{ fontSize: 11, color: "#666" }}>
                {w.source === "video" ? "Form reference" : w.source === "qr" ? "Photo ID" : "Manual"}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {w.weight > 0 ? (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: "#E8E6E1" }}>
                    {w.weight} lbs
                  </div>
                  <div style={{ fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace" }}>
                    {w.sets}×{w.reps}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#555" }}>—</div>
              )}
            </div>
            {onDelete && (
              <button onClick={() => onDelete(w.id)} style={{
                background: "none", border: "none", color: "#333", cursor: "pointer",
                fontSize: 16, padding: "2px 4px", marginLeft: 2,
              }}>×</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
