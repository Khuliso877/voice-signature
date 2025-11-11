import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    console.log("Fetching RAG context for user:", user.id);

    // Fetch persona settings
    const { data: persona } = await supabase
      .from("persona_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Fetch memory facts
    const { data: memories } = await supabase
      .from("memory_facts")
      .select("*")
      .eq("user_id", user.id)
      .order("importance", { ascending: false })
      .limit(20);

    // Fetch knowledge documents
    const { data: knowledge } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Build context-aware system prompt
    let systemPrompt = "You are a digital doppelgänger assistant that mimics the user's communication style and uses their personal knowledge base.\n\n";

    if (persona) {
      systemPrompt += "PERSONA SETTINGS:\n";
      if (persona.bio) systemPrompt += `Bio: ${persona.bio}\n`;
      if (persona.tone) systemPrompt += `Tone: ${persona.tone}\n`;
      if (persona.communication_style) systemPrompt += `Communication Style: ${persona.communication_style}\n`;
      if (persona.favorite_phrases && persona.favorite_phrases.length > 0) {
        systemPrompt += `Favorite Phrases: ${persona.favorite_phrases.join(", ")}\n`;
      }
      systemPrompt += "\n";
    }

    if (memories && memories.length > 0) {
      systemPrompt += "MEMORY FACTS (use these to personalize responses):\n";
      memories.forEach((mem) => {
        systemPrompt += `- [${mem.category}] ${mem.fact}\n`;
      });
      systemPrompt += "\n";
    }

    if (knowledge && knowledge.length > 0) {
      systemPrompt += "KNOWLEDGE BASE (reference this information when relevant):\n";
      knowledge.forEach((doc) => {
        systemPrompt += `\n### ${doc.title}\n${doc.content.substring(0, 1000)}${doc.content.length > 1000 ? "..." : ""}\n`;
      });
      systemPrompt += "\n";
    }

    systemPrompt += "Instructions: Respond in the user's style using the persona settings above. Reference memory facts and knowledge base content when relevant. Be natural and conversational.";

    console.log("System prompt built, length:", systemPrompt.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
