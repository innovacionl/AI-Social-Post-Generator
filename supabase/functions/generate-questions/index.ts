import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { career, industry, topic } = await req.json();

    if (!career || !industry) {
      return new Response(
        JSON.stringify({ error: "Career and industry are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topicContext = topic
      ? `They are specifically interested in exploring: "${topic}".`
      : "";

    const systemPrompt = `You are a research strategist who helps professionals identify high-value research questions relevant to their career and industry. Generate questions that are:
- Timely and relevant to current trends (2024-2025)
- Specific enough to research effectively
- Likely to yield insights that can be turned into compelling social media content
- Thought-provoking and non-obvious

Return ONLY a JSON array of exactly 5 strings, each being a research question. No other text or formatting.`;

    const userPrompt = `Generate 5 research questions for a professional with the following context:
- Career/Role: ${career}
- Industry: ${industry}
${topicContext}

The questions should help them discover insights they can share as thought leadership content on social media.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `Anthropic API error: ${response.status}`, details: errorText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "[]";

    let questions: string[];
    try {
      questions = JSON.parse(content);
    } catch {
      const matches = content.match(/"([^"]+\?)"/g);
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
