import { useState, useRef } from "react";

export default function PhotoCapture({ onIdentified, onClose }) {
  const [phase, setPhase] = useState("idle"); // idle | loading | error
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleCapture = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      setPreview(base64);
      setPhase("loading");
      setError(null);

      try {
        const res = await fetch("/api/identify-machine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Server error (${res.status})`);
        }

        const result = await res.json();

        if (result.error) {
          setError(result.error);
          setPhase("error");
          return;
        }

        if (result.name === "Unknown Machine" || result.name === "Not a gym machine") {
          setError(result.error || "Couldn't identify this machine. Try a clearer photo or a different angle.");
          setPhase("error");
          return;
        }

        onIdentified({
          name: result.name,
          muscle: result.muscle,
          machineId: null,
          photoIdentified: true,
        });
      } catch (err) {
        console.error("Photo identification error:", err);
        setError(err.message || "Failed to identify machine. Check your connection and try again.");
        setPhase("error");
      }
    };
    reader.readAsDataURL(file);
  };

  const reset = () => {
    setPhase("idle");
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#C6FF00", fontFamily: "'Space Mono', monospace", letterSpacing: "2px" }}>
          {phase === "loading" ? "IDENTIFYING MACHINE..." : "SNAP A PHOTO"}
        </div>
        <button onClick={onClose} style={{
          background: "none", border: "1px solid #333", color: "#888",
          padding: "6px 14px", borderRadius: 100, fontSize: 11, cursor: "pointer",
        }}>Cancel</button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        style={{ display: "none" }}
      />

      {phase === "idle" && (
        <div style={{ textAlign: "center" }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: "100%", padding: 0, border: "3px dashed #333", borderRadius: 20,
              background: "transparent", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 12, height: 200,
              transition: "border-color 0.2s",
            }}
            onMouseOver={(e) => e.currentTarget.style.borderColor = "#C6FF00"}
            onMouseOut={(e) => e.currentTarget.style.borderColor = "#333"}
          >
            <div style={{ fontSize: 48 }}>📸</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#E8E6E1" }}>
              Tap to take a photo
            </div>
            <div style={{ fontSize: 12, color: "#666", maxWidth: 240, lineHeight: 1.4 }}>
              Point at any gym machine — AI will identify it
            </div>
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div style={{ textAlign: "center" }}>
          {preview && (
            <div style={{
              width: "100%", height: 200, borderRadius: 16, overflow: "hidden",
              marginBottom: 16, position: "relative",
            }}>
              <img src={preview} alt="Captured" style={{
                width: "100%", height: "100%", objectFit: "cover",
                filter: "brightness(0.6)",
              }} />
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 12,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: "3px solid #C6FF00", borderTopColor: "transparent",
                  animation: "spin 0.8s linear infinite",
                }} />
                <div style={{ fontSize: 14, color: "#C6FF00", fontFamily: "'Space Mono', monospace" }}>
                  Analyzing...
                </div>
              </div>
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {phase === "error" && (
        <div>
          {preview && (
            <div style={{
              width: "100%", height: 160, borderRadius: 16, overflow: "hidden", marginBottom: 16,
            }}>
              <img src={preview} alt="Captured" style={{
                width: "100%", height: "100%", objectFit: "cover", opacity: 0.5,
              }} />
            </div>
          )}
          <div style={{
            padding: 14, background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.3)",
            borderRadius: 12, fontSize: 13, color: "#FF6B6B", marginBottom: 16, lineHeight: 1.5,
          }}>
            {error}
          </div>
          <button
            type="button"
            onClick={reset}
            style={{
              width: "100%", background: "#C6FF00", color: "#0A0A0F", border: "none",
              padding: "14px", borderRadius: 100, fontSize: 14,
              fontWeight: 700, cursor: "pointer", fontFamily: "'Space Mono', monospace",
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
