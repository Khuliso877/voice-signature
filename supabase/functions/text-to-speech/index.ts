import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OpenAI TTS as fallback
async function generateWithOpenAI(text: string, voice: string): Promise<string> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // Map ElevenLabs voices to OpenAI voices
  const openAIVoices: Record<string, string> = {
    "Aria": "alloy",
    "Roger": "echo",
    "Sarah": "nova",
    "Laura": "shimmer",
    "Charlie": "onyx",
  };

  const openAIVoice = openAIVoices[voice] || "alloy";

  console.log("Using OpenAI TTS with voice:", openAIVoice);

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice: openAIVoice,
      response_format: "mp3",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("OpenAI TTS error:", error);
    throw new Error(`OpenAI TTS error: ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
}

// ElevenLabs TTS (primary)
async function generateWithElevenLabs(text: string, voice: string): Promise<string> {
  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const voiceIds: Record<string, string> = {
    "Aria": "9BWtsMINqrJLrRacOk9x",
    "Roger": "CwhRBWXzGAHq8TQ4Fs17",
    "Sarah": "EXAVITQu4vr4xnSDxMaL",
    "Laura": "FGY2WhTYpPnrIDTdsKH5",
    "Charlie": "IKne3meq5aSn9XLyUdCD",
  };

  const voiceId = voiceIds[voice] || voiceIds["Aria"];

  console.log("Trying ElevenLabs TTS with voice:", voice);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("ElevenLabs API error:", error);
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, voice = "Aria" } = await req.json();

    if (!text) {
      throw new Error("Text is required");
    }

    let audioContent: string;
    let usedProvider: string;

    // Try ElevenLabs first, fall back to OpenAI
    try {
      audioContent = await generateWithElevenLabs(text, voice);
      usedProvider = "elevenlabs";
      console.log("Successfully generated audio with ElevenLabs");
    } catch (elevenLabsError) {
      console.log("ElevenLabs failed, trying OpenAI TTS:", elevenLabsError);
      
      try {
        audioContent = await generateWithOpenAI(text, voice);
        usedProvider = "openai";
        console.log("Successfully generated audio with OpenAI");
      } catch (openAIError) {
        console.error("Both TTS providers failed:", openAIError);
        throw new Error("All TTS providers failed. Please try again later.");
      }
    }

    return new Response(
      JSON.stringify({ audioContent, provider: usedProvider }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in text-to-speech:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
