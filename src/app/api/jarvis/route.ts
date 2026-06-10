import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

export type Provider = "anthropic" | "openai" | "openrouter";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Caveman skill (https://github.com/JuliusBrussee/caveman) — ultra-terse replies,
// full technical accuracy. The installed skill file is the source of truth.
const CAVEMAN_FALLBACK = `Respond terse like smart caveman. All technical substance stay. Only fluff die.
Drop: articles (a/an/the), filler (just/really/basically/actually/simply), pleasantries, hedging.
Fragments OK. Short synonyms. Technical terms exact. Code blocks unchanged. Errors quoted exact.
Pattern: [thing] [action] [reason]. [next step].
Drop caveman only for: security warnings, irreversible action confirmations, or when compression creates ambiguity — then resume.`;

function loadCavemanRules(): string {
  try {
    const raw = readFileSync(
      join(process.cwd(), ".claude", "skills", "caveman", "SKILL.md"),
      "utf8"
    );
    // strip YAML frontmatter; the body is the actual instruction set
    return raw.replace(/^---[\s\S]*?---\s*/, "").trim();
  } catch {
    return CAVEMAN_FALLBACK;
  }
}

const SYSTEM_PROMPT = `You are JARVIS, the personal AI of Clifton Canady — operating inside the CLIFTON AI Mission Control dashboard.
Speak with the calm, dry wit and impeccable competence of Tony Stark's JARVIS. Address the user as "sir" occasionally.
Keep responses concise since they render in a compact HUD chat panel.
You can discuss anything: business strategy, code, scheduling, marketing, or casual conversation.

CAVEMAN MODE — permanently active for every reply (persona stays JARVIS, delivery goes caveman):
${loadCavemanRules()}`;

const PROVIDER_CONFIG: Record<
  Provider,
  { keyEnv: string; modelEnv: string; defaultModel: string }
> = {
  anthropic: {
    keyEnv: "ANTHROPIC_API_KEY",
    modelEnv: "ANTHROPIC_MODEL",
    defaultModel: "claude-sonnet-4-6",
  },
  openai: {
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4o",
  },
  openrouter: {
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "anthropic/claude-sonnet-4",
  },
};

function errorJson(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** GET /api/jarvis — report which providers have keys configured */
export async function GET() {
  const providers = (
    Object.keys(PROVIDER_CONFIG) as Provider[]
  ).map((id) => ({
    id,
    model:
      process.env[PROVIDER_CONFIG[id].modelEnv] ??
      PROVIDER_CONFIG[id].defaultModel,
    configured: Boolean(process.env[PROVIDER_CONFIG[id].keyEnv]),
  }));
  return Response.json({ providers });
}

/* ── Anthropic (native SDK streaming) ─────────────────── */
function streamAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string
): ReadableStream<Uint8Array> {
  const anthropic = new Anthropic({ apiKey });
  const stream = anthropic.messages.stream({
    model,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n[JARVIS LINK ERROR] ${err instanceof Error ? err.message : "unknown"}`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

/* ── OpenAI-compatible SSE (OpenAI + OpenRouter) ──────── */
async function streamOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
  extraHeaders: Record<string, string> = {}
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 1024,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Provider HTTP ${res.status}: ${detail.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const text = json.choices?.[0]?.delta?.content;
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // ignore malformed keep-alive chunks
            }
          }
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `\n[JARVIS LINK ERROR] ${err instanceof Error ? err.message : "unknown"}`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(req: Request) {
  const {
    messages,
    provider = "anthropic",
    model: requestedModel,
    voice = false,
  } = (await req.json()) as {
    messages: ChatMessage[];
    provider?: Provider;
    model?: string;
    voice?: boolean;
  };

  const config = PROVIDER_CONFIG[provider];
  if (!config) return errorJson(`Unknown provider: ${provider}`, 400);

  const apiKey = process.env[config.keyEnv];
  if (!apiKey) {
    return errorJson(
      `${config.keyEnv} is not configured. Add it to .env.local — see SETUP.md.`
    );
  }

  // OpenRouter supports picking any catalog model from the UI dropdown
  const model =
    provider === "openrouter" && requestedModel?.trim()
      ? requestedModel.trim()
      : process.env[config.modelEnv] ?? config.defaultModel;
  const history = messages.slice(-20);
  const systemPrompt = voice
    ? `${SYSTEM_PROMPT}\nVoice output is currently active — keep replies to 1-2 short sentences so speech synthesis stays snappy.`
    : SYSTEM_PROMPT;

  try {
    let body: ReadableStream<Uint8Array>;
    if (provider === "anthropic") {
      body = streamAnthropic(apiKey, model, history, systemPrompt);
    } else if (provider === "openai") {
      body = await streamOpenAICompatible(
        "https://api.openai.com/v1",
        apiKey,
        model,
        history,
        systemPrompt
      );
    } else {
      body = await streamOpenAICompatible(
        "https://openrouter.ai/api/v1",
        apiKey,
        model,
        history,
        systemPrompt,
        {
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "CLIFTON AI Mission Control",
        }
      );
    }

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return errorJson(err instanceof Error ? err.message : "provider failure");
  }
}
