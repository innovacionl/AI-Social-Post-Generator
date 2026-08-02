import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const languageNames: Record<string, string> = {
  nl: "Dutch (Nederlands)",
  en: "English",
};

const DEFAULT_MODEL = "openai/gpt-4o-mini";

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
const MAX_STYLE = 2000;
const MAX_TEMPLATE = 8000;
const MAX_RESEARCH = 20000;

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

const DEFAULT_SYSTEM = `You are an expert social media content creator. You craft viral, engaging posts from research insights.

The user's chosen tone/style: {{tone}}
{{customStyleSection}}
Platform rules:
{{platformGuide}}

You must generate exactly 5 distinct post variations based on the research provided. Each variation should take a different angle:
1. A strong hook / attention-grabber opening
2. A data-led / statistics-focused approach
3. A storytelling / personal narrative angle
4. A contrarian / challenging conventional wisdom take
5. A call-to-action / community engagement approach

IMPORTANT: Write ALL posts entirely in {{languageName}}. Do not use any other language.

Separate each post with exactly this delimiter on its own line: ---POST_SEPARATOR---

Return ONLY the 5 posts separated by the delimiter. No numbering, no labels, no JSON - just raw post text ready to copy-paste.`;

const DEFAULT_USER = `Create 5 {{platformLabel}} post variations based on this research:

Question: {{question}}
Career: {{career}}
Industry: {{industry}}
{{researchContext}}
Write 5 compelling posts in a "{{tone}}" tone that will resonate with professionals in {{industry}}.

Remember: all posts must be written in {{languageName}}.`;

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
    const topicId = clamp(body.topicId, 100);
    const platform = body.platform === "twitter" ? "twitter" : body.platform === "linkedin" ? "linkedin" : "";
    const tone = clamp(body.tone, MAX_FIELD).trim();
    const customStyle = clamp(body.customStyle, MAX_STYLE);
    const language = body.language === "en" ? "en" : "nl";

    if (!topicId || !platform || !tone) {
      return respond({ error: "topicId, platform, and tone are required" }, 400);
    }

    // User-scoped client — RLS ensures users only access their own data
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

    const { data: topic, error: fetchError } = await supabase
      .from("research_topics")
      .select("*")
      .eq("id", topicId)
      .maybeSingle();

    if (fetchError || !topic) {
      return respond({ error: "Research topic not found" }, 404);
    }

    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return respond({ error: "Service is not configured" }, 500);
    }

    const langName = languageNames[language] || "English";

    const { data: promptRows } = await supabase
      .from("prompt_settings")
      .select("key, value")
      .in("key", ["post_system", "post_user", "post_model"]);
    const custom: Record<string, string> = {};
    (promptRows ?? []).forEach(({ key, value }: { key: string; value: string }) => {
      custom[key] = value;
    });

    const platformGuide =
      platform === "twitter"
        ? "X (Twitter) posts: Maximum 280 characters each. Concise, punchy, attention-grabbing. Use line breaks for readability. Hashtags are optional."
        : "LinkedIn posts: 800-1500 characters each. Short paragraphs and line breaks. Open with a hook. End with a call-to-action or thought-provoking question. Hashtags at the end are encouraged.";
    const platformLabel = platform === "twitter" ? "X (Twitter)" : "LinkedIn";
    const customStyleSection = customStyle
      ? "\n\nAdditional style instructions from the user:\n" + customStyle
      : "";
    const researchContext = topic.findings?.summary
      ? "\nResearch Findings:\n" + clamp(topic.findings.summary, MAX_RESEARCH)
      : "\nNo detailed research available - use the question itself as the basis for the posts.";

    const systemPrompt = fill(clamp(custom.post_system, MAX_TEMPLATE) || DEFAULT_SYSTEM, {
      tone,
      customStyleSection,
      platformGuide,
      languageName: langName,
    });

    const userPrompt = fill(clamp(custom.post_user, MAX_TEMPLATE) || DEFAULT_USER, {
      platformLabel,
      question: clamp(topic.question, MAX_FIELD),
      career: clamp(topic.career, MAX_FIELD),
      industry: clamp(topic.industry, MAX_FIELD),
      researchContext,
      tone,
      languageName: langName,
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: safeModel(custom.post_model, DEFAULT_MODEL),
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("OpenRouter error", response.status, await response.text());
      return respond({ error: "The post generator is temporarily unavailable." }, 502);
    }

    const data = await response.json();
    const fullText = data.choices?.[0]?.message?.content || "";

    const posts = fullText
      .split("---POST_SEPARATOR---")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    if (posts.length === 0) {
      return respond({ error: "No posts were generated" }, 500);
    }

    const variations = posts.map((content: string, index: number) => ({
      index,
      platform,
      tone,
      content,
      research_topic_id: topicId,
    }));

    return respond({ variations });
  } catch (error) {
    console.error("generate-post failed", error);
    return respond({ error: "Internal server error" }, 500);
  }
});
