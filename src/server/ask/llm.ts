import "server-only";

export interface LlmConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** Konfigurasi dari environment server. Tanpa LLM_API_KEY fitur otomatis nonaktif (tidak ada rahasia di kode/klien). */
export function llmConfig(env: Record<string, string | undefined> = process.env): LlmConfig | null {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (env.LLM_BASE_URL?.trim() || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
    model: env.LLM_MODEL?.trim() || "llama-3.3-70b-versatile",
  };
}

export type LlmResult = { ok: true; text: string } | { ok: false; kind: "quota" | "error" };
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Memanggil layanan chat kompatibel OpenAI (Groq, OpenRouter, endpoint OpenAI milik Gemini, dll.). Isi pertanyaan tidak dicatat. */
export async function chat(cfg: LlmConfig, messages: ChatMessage[], fetchImpl: typeof fetch = fetch, timeoutMs = 20_000): Promise<LlmResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify({ model: cfg.model, messages, temperature: 0.3, max_tokens: 500 }),
      signal: ctl.signal,
    });
    if (res.status === 429 || res.status === 402) return { ok: false, kind: "quota" };
    if (!res.ok) return { ok: false, kind: "error" };
    const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] };
    const text = data.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return { ok: false, kind: "error" };
    return { ok: true, text: text.trim().slice(0, 2000) };
  } catch {
    return { ok: false, kind: "error" };
  } finally {
    clearTimeout(timer);
  }
}
