import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const languageNames: Record<string, string> = {
  nl: "Dutch (Nederlands)",
  en: "English",
};

const DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct";

// Only models offered in the app's settings screen may be billed to our API key.
const ALLOWED_MODELS = new Set([
  "meta-llama/llama-3.1-8b-instruct",
  "meta-llama/llama-3.1-70b-instruct",
  "meta-llama/llama-3.3-70b-instruct",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "openai/gpt-4.1-mini",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-haiku",
  "google/gemini-flash-1.5",
  "google/gemini-pro-1.5",
  "mistralai/mistral-7b-instruct",
  "mistralai/mistral-nemo",
]);

function safeModel(value: unknown, fallback: string): string {
  return typeof value === "string" && ALLOWED_MODELS.has(value) ? value : fallback;
}

const MAX_FIELD = 500;
const MAX_TEMPLATE = 8000;

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

const DEFAULT_SYSTEM = `You are a research strategist who helps professionals identify high-value research questions relevant to their career and industry. Generate questions that are:
- Timely and relevant to current trends (2024-2025)
- Specific enough to research effectively
- Likely to yield insights that can be turned into compelling social media content
- Thought-provoking and non-obvious

IMPORTANT: Write ALL questions in {{languageName}}. Do not use any other language.

Return ONLY a JSON array of exactly 5 strings, each being a research question. No other text or formatting.`;

const DEFAULT_USER = `Generate 5 research questions for a professional with the following context:
- Career/Role: {{career}}
- Industry: {{industry}}
{{topicContext}}
The questions should help them discover insights they can share as thought leadership content on social media.

Remember: respond entirely in {{languageName}}.`;

function fill(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v),
    template
  );
}

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    const body = await req.json();
    const career = clamp(body.career, MAX_FIELD).trim();
    const industry = clamp(body.industry, MAX_FIELD).trim();
    const topic = clamp(body.topic, MAX_FIELD).trim();
    const language = body.language === "en" ? "en" : "nl";

    if (!career || !industry) {
      return respond({ error: "Career and industry are required" }, 400);
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return respond({ error: "Service is not configured" }, 500);
    }

    // User-scoped client — reads only this user's prompt_settings via RLS
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // The anon key is public and satisfies verify_jwt on its own, so require a real user.
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return respond({ error: "Unauthorized" }, 401);
    }

    const { data: promptRows } = await supabase
      .from("prompt_settings")
      .select("key, value")
      .in("key", ["questions_system", "questions_user", "questions_model"]);

    const custom: Record<string, string> = {};
    (promptRows ?? []).forEach(({ key, value }: { key: string; value: string }) => {
      custom[key] = value;
    });

    const langName = languageNames[language] || "English";
    const topicContext = topic
      ? `They are specifically interested in exploring: "${topic}".`
      : "";

    const systemPrompt = fill(
      clamp(custom.questions_system, MAX_TEMPLATE) || DEFAULT_SYSTEM,
      { languageName: langName },
    );
    const userPrompt = fill(clamp(custom.questions_user, MAX_TEMPLATE) || DEFAULT_USER, {
      career,
      industry,
      topicContext,
      languageName: langName,
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: safeModel(custom.questions_model, DEFAULT_MODEL),
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter error", response.status, await response.text());
      return respond({ error: "The question generator is temporarily unavailable." }, 502);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    const cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    let questions: string[];
    try {
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      questions = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleaned);
    } catch {
      const matches = cleaned.match(/"([^"]+\?)"/g);
      questions = matches
        ? matches.map((m: string) => m.replace(/^"|"$/g, "")).slice(0, 5)
        : [];
    }

    return respond({ questions });
  } catch (error) {
    console.error("generate-questions failed", error);
    return respond({ error: "Internal server error" }, 500);
  }
});
