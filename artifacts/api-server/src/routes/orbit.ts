import { Router, type IRouter } from "express";

type ChatMessage = { role: "user" | "assistant"; content: string };

const router: IRouter = Router();

router.post("/orbit/chat", async (req, res) => {
  const apiKey = process.env["GROQ_API_KEY"];
  const messages = req.body?.messages as ChatMessage[] | undefined;

  if (!apiKey) {
    return res.status(503).json({ error: "Orbit is not configured yet. Add GROQ_API_KEY to artifacts/api-server/.env." });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.some(message => !["user", "assistant"].includes(message.role) || typeof message.content !== "string")) {
    return res.status(400).json({ error: "A valid chat history is required." });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_completion_tokens: 350,
        messages: [
          { role: "system", content: "You are Orbit, a warm and practical AI study companion inside StudySync. Help the student plan manageable study sessions, prioritize deadlines, and explain concepts concisely. Do not claim to have completed actions or have access to information that is not in this conversation." },
          ...messages.slice(-12),
        ],
      }),
    });
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message ?? "Groq could not complete the request." });
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) return res.status(502).json({ error: "Orbit received an empty response." });
    return res.json({ reply });
  } catch {
    return res.status(502).json({ error: "Orbit could not reach Groq. Check your connection and try again." });
  }
});

export default router;
