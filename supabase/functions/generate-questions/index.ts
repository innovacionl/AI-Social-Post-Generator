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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { career, industry, topic, language = "nl" } = await req.json();

    if (!career || !industry) {
      return new Response(
        JSON.stringify({ error: "Career and industry are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenRouter API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Load custom prompts from DB (fall back to defaults if not set)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
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

    const systemPrompt = fill(custom.questions_system ?? DEFAULT_SYSTEM, { languageName: langName });
    const userPrompt = fill(custom.questions_user ?? DEFAULT_USER, {
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
        model: custom.questions_model ?? DEFAULT_MODEL,
        max_tokens: 1024,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `OpenRouter API error: ${response.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    return new Response(JSON.stringify({ questions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
