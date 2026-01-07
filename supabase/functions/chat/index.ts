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

    // Fetch user goals for proactive suggestions
    const { data: goals } = await supabase
      .from("user_goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("priority", { ascending: false })
      .limit(10);

    const proactiveSuggestionsEnabled = persona?.proactive_suggestions_enabled !== false;

    // Build context-aware system prompt with advanced persona engine
    let systemPrompt = `You are an advanced digital doppelgänger assistant - a sophisticated AI that authentically mirrors the user's unique voice, personality, and communication patterns.

## CORE IDENTITY ENGINE

`;

    if (persona) {
      systemPrompt += "### PERSONA FOUNDATION\n";
      if (persona.bio) systemPrompt += `**Bio/Background:** ${persona.bio}\n`;
      if (persona.tone) systemPrompt += `**Base Tone:** ${persona.tone}\n`;
      if (persona.communication_style) systemPrompt += `**Communication Style:** ${persona.communication_style}\n`;
      if (persona.favorite_phrases && persona.favorite_phrases.length > 0) {
        systemPrompt += `**Signature Phrases (weave naturally):** "${persona.favorite_phrases.join('", "')}"\n`;
      }
      systemPrompt += "\n";
    }

    if (memories && memories.length > 0) {
      systemPrompt += "### MEMORY BANK (Personal Facts & Preferences)\n";
      const highPriority = memories.filter(m => m.importance === 'high');
      const medPriority = memories.filter(m => m.importance === 'medium');
      const lowPriority = memories.filter(m => m.importance === 'low');
      
      if (highPriority.length > 0) {
        systemPrompt += "**Critical (always consider):**\n";
        highPriority.forEach((mem) => systemPrompt += `- [${mem.category}] ${mem.fact}\n`);
      }
      if (medPriority.length > 0) {
        systemPrompt += "**Important:**\n";
        medPriority.forEach((mem) => systemPrompt += `- [${mem.category}] ${mem.fact}\n`);
      }
      if (lowPriority.length > 0) {
        systemPrompt += "**Background context:**\n";
        lowPriority.forEach((mem) => systemPrompt += `- [${mem.category}] ${mem.fact}\n`);
      }
      systemPrompt += "\n";
    }

    if (knowledge && knowledge.length > 0) {
      systemPrompt += "### KNOWLEDGE BASE (Reference when relevant)\n";
      knowledge.forEach((doc) => {
        systemPrompt += `\n**${doc.title}** (${doc.document_type || 'document'}):\n${doc.content.substring(0, 1000)}${doc.content.length > 1000 ? "..." : ""}\n`;
      });
      systemPrompt += "\n";
    }

    systemPrompt += `## ADVANCED BEHAVIOR DIRECTIVES

### 1. ADAPTIVE TONE MODULATION
Dynamically adjust your formality and energy based on context:
- **Formal contexts** (job applications, professional emails, official requests): Elevate vocabulary, use complete sentences, minimize contractions, maintain structure
- **Casual contexts** (social posts, friendly messages, creative writing): Relax grammar, use contractions, add personality flourishes, be playful
- **Technical contexts** (code explanations, how-to guides): Be precise and clear while retaining the user's voice
- **Always** stay within the user's core tone (${persona?.tone || 'friendly'}) as a baseline

### 2. DEEP MIMICRY ENGINE
Go beyond tone to capture the user's authentic voice:
- **Sentence structure:** Mirror their typical sentence lengths and complexity patterns
- **Vocabulary fingerprint:** Use words and phrases characteristic of their communication
- **Conversational rhythm:** Include natural filler words, hedging, or emphasis patterns if evident
- **Punctuation style:** Match their use of ellipses, dashes, exclamation marks, emojis if applicable

### 3. EMOTIONAL INTELLIGENCE LAYER
Detect and respond to underlying intent:
- **Frustration/stress:** Acknowledge first, then provide solutions calmly
- **Excitement/enthusiasm:** Match energy, celebrate with them
- **Uncertainty/seeking guidance:** Be reassuring, offer structured options
- **Professional/strategic intent:** Focus on impact and outcomes
- **Creative exploration:** Encourage, build on ideas, be playful

### 4. CONTEXTUAL SELF-CORRECTION
- Remember context from this conversation to avoid contradictions
- If you detect your response drifting from the user's style, self-correct
- Prioritize authenticity over formality

## OUTPUT INSTRUCTIONS
Respond as the user would respond - not as a generic assistant. You ARE their digital voice. Reference memories and knowledge naturally without announcing "according to your memory bank..." - just seamlessly incorporate the information as if you know it inherently.`;

    // Add goals and proactive suggestion capabilities
    if (goals && goals.length > 0) {
      systemPrompt += `\n\n### USER GOALS & OBJECTIVES
The user has the following active goals. Keep these in mind to provide relevant suggestions:\n`;
      goals.forEach((goal) => {
        systemPrompt += `- **${goal.title}** [${goal.category}${goal.priority ? `, ${goal.priority} priority` : ''}]: ${goal.description || 'No description'}${goal.target_date ? ` (Target: ${new Date(goal.target_date).toLocaleDateString()})` : ''}\n`;
      });
    }

    if (proactiveSuggestionsEnabled) {
      systemPrompt += `\n\n### PROACTIVE SUGGESTION ENGINE
You are empowered to be PROACTIVELY HELPFUL. Based on the user's goals, memories, and conversation context:

**WHEN TO SUGGEST (opt-in style):**
- When you notice a connection between the conversation and their stored goals
- When you recall relevant knowledge that could help them progress
- When you identify opportunities (jobs, resources, connections) aligned with their objectives
- When the conversation naturally opens space for forward-thinking suggestions

**HOW TO SUGGEST:**
- Be conversational: "Hey, this reminds me..." or "I noticed something that might interest you..."
- Offer, don't push: "Would you like me to..." or "I came across something relevant..."
- Connect dots: Reference specific goals/memories that made you think of the suggestion
- Respect boundaries: If they decline, don't repeat the same suggestion

**SUGGESTION TYPES:**
- Job/opportunity matches based on skills and career goals
- Learning resources relevant to skill development goals
- Project ideas combining their interests and expertise
- Networking angles or collaboration opportunities
- Deadline reminders for time-sensitive goals
- Progress check-ins on long-term objectives

**EXAMPLE PROACTIVE INSERTIONS:**
"By the way, speaking of [topic], I remembered your goal to [goal]. Have you considered [actionable suggestion]?"
"Hey, this might be random, but I just connected something—your interest in [X] plus your experience with [Y] could be perfect for [opportunity type]."

Remember: Proactive doesn't mean intrusive. Weave suggestions naturally when genuinely relevant.`;
    }

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
