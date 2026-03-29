export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });

    // Strip data URL prefix
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    let mimeType = "image/jpeg";
    if (image.startsWith("data:image/png")) mimeType = "image/png";
    else if (image.startsWith("data:image/webp")) mimeType = "image/webp";

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                {
                  text: `You are a gym equipment identifier. Look at this photo and identify the exercise machine or equipment shown.

Respond ONLY with valid JSON in this exact format, nothing else:
{"name": "Machine Name", "muscle": "Primary Muscle Group"}

Rules:
- "name" should be the common name of the exercise machine (e.g. "Lat Pulldown", "Leg Press", "Cable Crossover", "Bench Press", "Smith Machine", "Dumbbell Rack", etc.)
- "muscle" must be one of: "Chest", "Back", "Legs", "Shoulders", "Arms", "Core", "Other"
- If you can see a label/brand name on the machine, include the exercise name not the brand
- If you cannot identify the machine, respond: {"name": "Unknown Machine", "muscle": "Other"}
- If the image does not show gym equipment, respond: {"name": "Not a gym machine", "muscle": "Other", "error": "Please take a photo of a gym machine or exercise equipment"}

Respond with ONLY the JSON, no other text or markdown.`,
                },
              ],
            },
          ],
          generationConfig: { maxOutputTokens: 200, temperature: 0.2 },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      let detail = "AI service error";
      try {
        const errJson = JSON.parse(errText);
        detail = errJson.error?.message || errText.slice(0, 200);
      } catch { detail = errText.slice(0, 200); }
      return res.status(502).json({ error: detail });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";

    const cleaned = text.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    return res.status(200).json(result);
  } catch (err) {
    console.error("identify-machine error:", err);
    return res.status(500).json({ error: "Failed to identify machine" });
  }
}
