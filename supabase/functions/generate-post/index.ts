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
    const { topicId, platform, tone, customStyle, language = "nl" } = await req.json();

    if (!topicId || !platform || !tone) {
      return respond(
        { error: "topicId, platform, and tone are required" },
        400
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: topic, error: fetchError } = await supabase
      .from("research_topics")
      .select("*")
      .eq("id", topicId)
      .maybeSingle();

    if (fetchError || !topic) {
      return respond({ error: "Research topic not found" }, 404);
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return respond({ error: "Anthropic API key not configured" }, 500);
    }

    const langName = languageNames[language] || "English";

    const platformGuide =
      platform === "twitter"
        ? "X (Twitter) posts: Maximum 280 characters each. Concise, punchy, attention-grabbing. Use line breaks for readability. Hashtags are optional."
        : "LinkedIn posts: 800-1500 characters each. Short paragraphs and line breaks. Open with a hook. End with a call-to-action or thought-provoking question. Hashtags at the end are encouraged.";

    const customStyleSection = customStyle
      ? "\n\nAdditional style instructions from the user:\n" + customStyle
      : "";

    const systemPrompt =
      "You are an expert social media content creator. You craft viral, engaging posts from research insights.\n\nThe user's chosen tone/style: " +
      tone +
      customStyleSection +
      "\n\nPlatform rules:\n" +
      platformGuide +
      "\n\nYou must generate exactly 5 distinct post variations based on the research provided. Each variation should take a different angle:\n1. A strong hook / attention-grabber opening\n2. A data-led / statistics-focused approach\n3. A storytelling / personal narrative angle\n4. A contrarian / challenging conventional wisdom take\n5. A call-to-action / community engagement approach\n\n" +
      `IMPORTANT: Write ALL posts entirely in ${langName}. Do not use any other language.\n\n` +
      "Separate each post with exactly this delimiter on its own line: ---POST_SEPARATOR---\n\nReturn ONLY the 5 posts separated by the delimiter. No numbering, no labels, no JSON - just raw post text ready to copy-paste, separated by the delimiter.";

    const researchContext = topic.findings?.summary
      ? "Research Findings:\n" + topic.findings.summary
      : "No detailed research available - use the question itself as the basis for the posts.";

    const platformLabel =
      platform === "twitter" ? "X (Twitter)" : "LinkedIn";
    const userPrompt =
      "Create 5 " +
      platformLabel +
      " post variations based on this research:\n\nQuestion: " +
      topic.question +
      "\nCareer: " +
      topic.career +
      "\nIndustry: " +
      topic.industry +
      "\n\n" +
      researchContext +
      '\n\nWrite 5 compelling posts in a "' +
      tone +
      '" tone that will resonate with professionals in ' +
      topic.industry +
      ".\n\nRemember: all posts must be written in " +
      langName + ".";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return respond(
        {
          error: "Anthropic API error: " + response.status,
          details: errorText,
        },
        502
      );
    }

    const data = await response.json();
    const fullText = data.content?.[0]?.text || "";

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
    return respond(
      { error: "Internal server error", details: String(error) },
      500
    );
  }
});
