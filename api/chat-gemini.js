export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured. Add it in Vercel environment variables." });

  try {
    const { message, workoutContext, mode } = req.body;
    if (!message) return res.status(400).json({ error: "No message provided" });

    let systemInstruction = `You are Gena, an expert AI fitness coach and certified personal trainer with deep knowledge of exercise science, nutrition, recovery, and workout programming. You are energetic, supportive, and science-driven.

Keep responses concise and actionable — aim for 2-4 short paragraphs max. Use simple language. When giving exercise advice, mention proper form cues. When discussing nutrition, focus on practical meal suggestions rather than strict calorie counting.

If the user asks about medical conditions or injuries, remind them to consult a healthcare professional, but still provide general guidance.`;

    if (mode === "analyze" && workoutContext) {
      systemInstruction += `\n\nThe user wants you to analyze their workout data. Here is their workout log:\n${workoutContext}\n\nProvide analysis covering: muscle balance, volume progression, recovery patterns, and 2-3 specific actionable suggestions. Be encouraging but honest.`;
    } else if (mode === "plan" && workoutContext) {
      systemInstruction += `\n\nThe user wants a workout plan. Here is their exercise history and preferences:\n${workoutContext}\n\nGenerate a structured plan with specific exercises, sets, reps, and rest periods. Format it clearly with days labeled.`;
    } else if (workoutContext) {
      systemInstruction += `\n\nFor context, here is a summary of the user's recent workout history:\n${workoutContext}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      let detail = "Gena is unavailable right now";
      try {
        const errJson = JSON.parse(errText);
        detail = errJson.error?.message || errText.slice(0, 200);
      } catch { detail = errText.slice(0, 200); }
      return res.status(502).json({ error: detail });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "Sorry, I couldn't generate a response.";

    return res.status(200).json({ reply: text, coach: "gena" });
  } catch (err) {
    console.error("chat-gemini error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
