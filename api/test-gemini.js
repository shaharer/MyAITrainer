export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({ status: "MISSING", message: "GEMINI_API_KEY is not set" });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "Say hello in one word" }] }],
          generationConfig: { maxOutputTokens: 10 },
        }),
      }
    );

    const text = await response.text();

    if (!response.ok) {
      return res.status(200).json({
        status: "API_ERROR",
        httpCode: response.status,
        message: text.slice(0, 500),
      });
    }

    const data = JSON.parse(text);
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "no reply";

    return res.status(200).json({
      status: "OK",
      keyPrefix: apiKey.slice(0, 8) + "...",
      reply: reply,
    });
  } catch (err) {
    return res.status(200).json({ status: "ERROR", message: err.message });
  }
}
