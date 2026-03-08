import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, filters, limit = 20 } = await req.json();
    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const searchTerm = `%${query.trim()}%`;
    const sourceTypes: string[] = filters?.sourceTypes || ["chat", "memory", "knowledge", "goal"];

    const results: any[] = [];

    // Search chat history
    if (sourceTypes.includes("chat")) {
      const { data: chats } = await supabase
        .from("chat_history")
        .select("id, content, role, created_at")
        .eq("user_id", user.id)
        .ilike("content", searchTerm)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (chats) {
        results.push(...chats.map(c => ({
          id: c.id,
          sourceType: "chat",
          title: c.role === "user" ? "Your message" : "AI response",
          content: c.content,
          metadata: { role: c.role },
          createdAt: c.created_at,
          relevance: calculateRelevance(query, c.content),
        })));
      }
    }

    // Search memory facts
    if (sourceTypes.includes("memory")) {
      const { data: memories } = await supabase
        .from("memory_facts")
        .select("id, fact, category, importance, created_at")
        .eq("user_id", user.id)
        .ilike("fact", searchTerm)
        .order("importance", { ascending: false })
        .limit(limit);

      if (memories) {
        results.push(...memories.map(m => ({
          id: m.id,
          sourceType: "memory",
          title: `[${m.category}] Memory`,
          content: m.fact,
          metadata: { category: m.category, importance: m.importance },
          createdAt: m.created_at,
          relevance: calculateRelevance(query, m.fact) + (m.importance === "high" ? 0.2 : m.importance === "medium" ? 0.1 : 0),
        })));
      }
    }

    // Search knowledge documents
    if (sourceTypes.includes("knowledge")) {
      const { data: docs } = await supabase
        .from("knowledge_documents")
        .select("id, title, content, document_type, created_at")
        .eq("user_id", user.id)
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (docs) {
        results.push(...docs.map(d => ({
          id: d.id,
          sourceType: "knowledge",
          title: d.title,
          content: d.content.substring(0, 500),
          metadata: { documentType: d.document_type },
          createdAt: d.created_at,
          relevance: calculateRelevance(query, d.title + " " + d.content),
        })));
      }
    }

    // Search goals
    if (sourceTypes.includes("goal")) {
      const { data: goals } = await supabase
        .from("user_goals")
        .select("id, title, description, category, status, priority, target_date, created_at")
        .eq("user_id", user.id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (goals) {
        results.push(...goals.map(g => ({
          id: g.id,
          sourceType: "goal",
          title: g.title,
          content: g.description || g.title,
          metadata: { category: g.category, status: g.status, priority: g.priority, targetDate: g.target_date },
          createdAt: g.created_at,
          relevance: calculateRelevance(query, g.title + " " + (g.description || "")),
        })));
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return new Response(JSON.stringify({ results: results.slice(0, limit) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function calculateRelevance(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  
  // Exact match bonus
  if (t.includes(q)) {
    const idx = t.indexOf(q);
    // Earlier occurrence = more relevant
    return 1.0 - (idx / t.length) * 0.3;
  }
  
  // Word overlap
  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = new Set(t.split(/\s+/).filter(Boolean));
  let matches = 0;
  for (const w of qWords) {
    for (const tw of tWords) {
      if (tw.includes(w) || w.includes(tw)) {
        matches++;
        break;
      }
    }
  }
  return qWords.length > 0 ? (matches / qWords.length) * 0.7 : 0;
}
