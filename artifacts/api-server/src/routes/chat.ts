import { Router } from "express";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { messages, systemPrompt } = req.body as {
      messages: { role: string; content: string }[];
      systemPrompt?: string;
    };

    const baseUrl = process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;

    if (!baseUrl || !apiKey) {
      res.status(503).json({ error: "AI service not configured" });
      return;
    }

    const chatMessages = [
      {
        role: "system",
        content:
          systemPrompt ||
          "You are Poulina AI, an expert DevOps and infrastructure assistant.",
      },
      ...(messages || []),
    ];

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://poulina-opshub.replit.app",
        "X-Title": "Poulina AI OpsHub",
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        max_tokens: 8192,
        messages: chatMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      res.status(response.status).json({ error: errText });
      return;
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? "";
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
