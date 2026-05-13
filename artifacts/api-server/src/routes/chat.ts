import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const AI_BASE = process.env.AI_INTEGRATIONS_OPENROUTER_BASE_URL;
const AI_KEY = process.env.AI_INTEGRATIONS_OPENROUTER_API_KEY;

const MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-31b-it:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
];

const MAX_TOKENS = 8192;
const TIMEOUT_MS = 60_000;

function getClient() {
  return new OpenAI({
    baseURL: AI_BASE,
    apiKey: AI_KEY,
    timeout: TIMEOUT_MS,
    maxRetries: 0,
  });
}

router.get("/chat/status", (_req, res) => {
  res.json({
    ok: !!(AI_BASE && AI_KEY),
    models: MODELS,
    provider: "openrouter",
  });
});

router.post("/chat", async (req, res) => {
  if (!AI_BASE || !AI_KEY) {
    res.status(503).json({ error: "AI_NOT_CONFIGURED", message: "AI service not configured on server" });
    return;
  }

  const { messages, systemPrompt } = req.body as {
    messages: { role: string; content: string }[];
    systemPrompt?: string;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "INVALID_REQUEST", message: "messages array required" });
    return;
  }

  const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        systemPrompt ||
        "You are Poulina AI, an expert DevOps and infrastructure assistant for Poulina Group. You help diagnose incidents, perform root cause analysis, and recommend remediation steps. Respond clearly and concisely using markdown formatting.",
    },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const client = getClient();

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    try {
      const completion = await client.chat.completions.create({
        model,
        max_tokens: MAX_TOKENS,
        messages: chatMessages,
      });

      const content = completion.choices[0]?.message?.content ?? "";
      if (!content) {
        res.status(502).json({ error: "EMPTY_RESPONSE", message: "AI returned empty response" });
        return;
      }

      console.log(`[ChatAI] ✓ model=${completion.model} chars=${content.length}`);
      res.json({ content, model: completion.model });
      return;
    } catch (err) {
      const message = (err as Error).message ?? "Unknown error";
      const status = (err as { status?: number }).status ?? 0;
      const isRateLimit =
        status === 429 ||
        message.includes("429") ||
        message.toLowerCase().includes("rate limit");

      console.warn(`[ChatAI] ✗ model=${model} status=${status} err=${message}`);

      if (isRateLimit && i < MODELS.length - 1) {
        console.log(`[ChatAI] → retrying with fallback model ${MODELS[i + 1]}`);
        continue;
      }

      if (isRateLimit) {
        res.status(429).json({
          error: "RATE_LIMITED",
          message: "All AI models are rate limited — wait a moment and try again",
        });
        return;
      }

      if (message.includes("timeout") || message.toLowerCase().includes("timed out")) {
        res.status(504).json({ error: "TIMEOUT", message: "AI response timed out — try again" });
        return;
      }

      res.status(500).json({ error: "AI_ERROR", message });
      return;
    }
  }
});

export default router;
