import { useState, useRef, useEffect } from "react";

const COACHES = {
  gena: {
    name: "Gena",
    color: "#4ECDC4",
    gradient: "linear-gradient(135deg, #4ECDC4, #2EAD9F)",
    emoji: "💎",
    endpoint: "/api/chat-gemini",
  },
};

function formatWorkoutContext(workouts, dateFilter) {
  let filtered = workouts;
  if (dateFilter) {
    filtered = workouts.filter((w) => w.date === dateFilter);
  } else {
    filtered = workouts.slice(0, 50); // last 50 entries
  }

  if (filtered.length === 0) return "No workouts logged" + (dateFilter ? ` on ${dateFilter}` : "") + ".";

  const lines = filtered.map((w) =>
    `${w.date}: ${w.exercise} (${w.muscle}) — ${w.weight > 0 ? `${w.weight}lbs ${w.sets}×${w.reps}` : "form reference"}`
  );

  return lines.join("\n");
}

function formatPlanContext(workouts, level) {
  const exerciseMap = {};
  workouts.forEach((w) => {
    if (!exerciseMap[w.exercise]) {
      exerciseMap[w.exercise] = { muscle: w.muscle, maxWeight: 0, typicalReps: 0, typicalSets: 0, count: 0 };
    }
    const e = exerciseMap[w.exercise];
    e.maxWeight = Math.max(e.maxWeight, w.weight || 0);
    e.typicalReps = Math.max(e.typicalReps, w.reps || 0);
    e.typicalSets = Math.max(e.typicalSets, w.sets || 0);
    e.count++;
  });

  const summary = Object.entries(exerciseMap).map(([name, data]) =>
    `${name} (${data.muscle}): best ${data.maxWeight}lbs, usually ${data.typicalSets}×${data.typicalReps}, done ${data.count} times`
  ).join("\n");

  const levelDesc = level === "harder" ? "Push harder — increase weights by 5-10%, add sets, or introduce more challenging variations."
    : level === "long" ? "Create a comprehensive 4-6 week periodized program with progressive overload."
    : level === "medium" ? "Create a 2-week plan with moderate progression."
    : "Maintain current level — same weights and volume, optimize for consistency.";

  return `Exercise history:\n${summary}\n\nPlan request: ${levelDesc}`;
}

export default function AIChat({ workouts }) {
  const [coach] = useState("gena");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text, mode, context) => {
    if (!text.trim() && !mode) return;

    const userMsg = { role: "user", text: text || mode, time: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setShowActions(false);

    const c = COACHES[coach];
    try {
      const res = await fetch(c.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text || `Please ${mode}`,
          workoutContext: context || formatWorkoutContext(workouts),
          mode: mode || "chat",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages((prev) => [...prev, {
        role: "assistant", text: data.reply, coach: coach, time: Date.now(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "error", text: err.message || "Could not reach the coach. Try again.", time: Date.now(),
      }]);
    }
    setLoading(false);
  };

  const handleAnalyzeDay = (date) => {
    const context = formatWorkoutContext(workouts, date);
    sendMessage(
      `Analyze my workout on ${date}`,
      "analyze",
      context
    );
  };

  const handleGeneratePlan = (level) => {
    const context = formatPlanContext(workouts, level);
    const levelLabel = level === "harder" ? "Push Me Harder" : level === "same" ? "Same Level" : level === "medium" ? "2-Week Plan" : "Full Program";
    sendMessage(
      `Generate a "${levelLabel}" workout plan based on my history`,
      "plan",
      context
    );
  };

  // Get unique workout dates for analysis
  const workoutDates = [...new Set(workouts.map((w) => w.date))].sort().reverse().slice(0, 7);

  const c = COACHES[coach];

  return (
    <div style={{ animation: "fadeIn 0.4s ease" }}>
      {/* Coach Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
        padding: "14px 16px", background: "#141419", borderRadius: 14,
        border: "1px solid rgba(78,205,196,0.2)",
      }}>
        <span style={{ fontSize: 24 }}>💎</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#4ECDC4" }}>Gena</div>
          <div style={{ fontSize: 11, color: "#666" }}>Your AI fitness coach · Powered by Gemini</div>
        </div>
      </div>

      {/* Quick Actions */}
      {showActions && (
        <div style={{ marginBottom: 20 }}>
          {/* Analyze */}
          {workoutDates.length > 0 && (
            <div style={{
              background: "#141419", borderRadius: 16, padding: 16,
              border: "1px solid #1E1E26", marginBottom: 10,
            }}>
              <div style={{ fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: "2px", marginBottom: 10 }}>
                ANALYZE A WORKOUT
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {workoutDates.map((date) => (
                  <button key={date} type="button" onClick={() => handleAnalyzeDay(date)} style={{
                    background: c.color + "10", border: `1px solid ${c.color}33`,
                    color: c.color, padding: "6px 12px", borderRadius: 100,
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                    fontFamily: "'Space Mono', monospace",
                  }}>{date}</button>
                ))}
              </div>
            </div>
          )}

          {/* Plan Generation */}
          <div style={{
            background: "#141419", borderRadius: 16, padding: 16,
            border: "1px solid #1E1E26", marginBottom: 10,
          }}>
            <div style={{ fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace", letterSpacing: "2px", marginBottom: 10 }}>
              GENERATE A PLAN
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { level: "harder", label: "Push Me Harder", icon: "🔥", desc: "More weight & volume" },
                { level: "same", label: "Same Level", icon: "✊", desc: "Maintain current" },
                { level: "medium", label: "2-Week Plan", icon: "📋", desc: "Moderate progression" },
                { level: "long", label: "Full Program", icon: "📅", desc: "4-6 week periodized" },
              ].map((p) => (
                <button key={p.level} type="button" onClick={() => handleGeneratePlan(p.level)} style={{
                  background: "#0A0A0F", border: "1px solid #2A2A35",
                  borderRadius: 12, padding: "12px", cursor: "pointer",
                  textAlign: "left", transition: "border-color 0.2s",
                }}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = c.color}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = "#2A2A35"}
                >
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{p.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E8E6E1" }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: "#666" }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      {messages.length > 0 && (
        <div style={{
          background: "#141419", borderRadius: 20, padding: 16,
          border: "1px solid #1E1E26", marginBottom: 16,
          maxHeight: 400, overflowY: "auto",
        }}>
          {!showActions && (
            <button type="button" onClick={() => setShowActions(true)} style={{
              background: "none", border: "none", color: "#666", fontSize: 12,
              cursor: "pointer", marginBottom: 10, textDecoration: "underline",
            }}>Show quick actions</button>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              marginBottom: 12,
              display: "flex", flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
            }}>
              {msg.role === "user" && (
                <div style={{
                  background: "#2A2A35", padding: "10px 14px", borderRadius: "14px 14px 4px 14px",
                  maxWidth: "85%", fontSize: 14, color: "#E8E6E1", lineHeight: 1.5,
                }}>{msg.text}</div>
              )}
              {msg.role === "assistant" && (
                <div>
                  <div style={{
                    fontSize: 10, color: COACHES[msg.coach]?.color || "#888",
                    fontFamily: "'Space Mono', monospace", marginBottom: 4, letterSpacing: "1px",
                  }}>
                    {COACHES[msg.coach]?.emoji} {COACHES[msg.coach]?.name?.toUpperCase()}
                  </div>
                  <div style={{
                    background: (COACHES[msg.coach]?.color || "#888") + "08",
                    border: `1px solid ${(COACHES[msg.coach]?.color || "#888")}22`,
                    padding: "12px 14px", borderRadius: "4px 14px 14px 14px",
                    maxWidth: "95%", fontSize: 14, color: "#D0CEC5", lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}>{msg.text}</div>
                </div>
              )}
              {msg.role === "error" && (
                <div style={{
                  background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)",
                  padding: "10px 14px", borderRadius: 12, fontSize: 13, color: "#FF6B6B",
                }}>{msg.text}</div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 0",
            }}>
              <div style={{ fontSize: 10, color: c.color, fontFamily: "'Space Mono', monospace" }}>
                {c.emoji} {c.name} is thinking
              </div>
              <div style={{
                width: 16, height: 16, borderRadius: "50%",
                border: `2px solid ${c.color}`, borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }} />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Input */}
      <div style={{
        display: "flex", gap: 8, background: "#141419", borderRadius: 16,
        padding: 8, border: "1px solid #1E1E26",
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !loading) sendMessage(input); }}
          placeholder={`Ask ${c.name}...`}
          style={{
            flex: 1, background: "#0A0A0F", border: "1px solid #2A2A35", borderRadius: 10,
            padding: "12px 14px", color: "#E8E6E1", fontSize: 15,
            fontFamily: "'DM Sans', sans-serif", outline: "none",
          }}
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: c.gradient, border: "none",
            padding: "12px 18px", borderRadius: 10,
            fontSize: 13, fontWeight: 700, color: "#0A0A0F",
            cursor: loading || !input.trim() ? "default" : "pointer",
            opacity: loading || !input.trim() ? 0.4 : 1,
            fontFamily: "'Space Mono', monospace",
            whiteSpace: "nowrap",
            transition: "opacity 0.2s",
          }}
        >
          Ask {c.name}
        </button>
      </div>
    </div>
  );
}
