
module.exports = async function handler(req, res) {
  const allowedOrigin =
    process.env.SITE_ORIGIN || "https://karkihubbb.github.io";

  const origin = req.headers.origin;

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Vary", "Origin");

  if (origin === allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  }

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (origin && origin !== allowedOrigin) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "AI key is not configured" });
  }

  try {
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const safeMessages = messages
      .filter(m =>
        ["user", "assistant"].includes(m.role) &&
        typeof m.content === "string"
      )
      .slice(-16)
      .map(m => ({
        role: m.role,
        content: m.content.slice(0, 4000)
      }));

    const aiResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-6-astra",
          instructions:
            "You are KarkiAI, a helpful, intelligent and friendly personal AI assistant. " +
            "Give clear, accurate and natural answers. Explain difficult things simply. " +
            "Be conversational and helpful.",
          input: safeMessages,
          max_output_tokens: 700
        })
      }
    );

    const result = await aiResponse.json();

    if (!aiResponse.ok) {
      console.error("OpenAI error:", result);
      return res.status(502).json({
        error: "The AI service could not complete the request."
      });
    }

    const reply = (result.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n");

    if (!reply) {
      return res.status(502).json({ error: "No AI response received" });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error("KarkiAI backend error:", error);

    return res.status(500).json({
      error: "Something went wrong. Please try again."
    });
  }
};
