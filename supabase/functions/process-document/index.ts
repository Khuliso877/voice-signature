import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { storagePath, fileName, fileType, instruction, outputFormat } = await req.json();

    if (!storagePath || !instruction) {
      return new Response(JSON.stringify({ error: "Missing storagePath or instruction" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing document: ${fileName} for user ${user.id}`);
    console.log(`Instruction: ${instruction}, Output format: ${outputFormat}`);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("chat-attachments")
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      throw new Error("Failed to download file");
    }

    // Extract text content from the file
    let fileContent = "";
    if (fileType.startsWith("text/") || fileType === "application/json" || 
        fileType === "text/csv" || fileName.endsWith(".txt") || fileName.endsWith(".csv") ||
        fileName.endsWith(".md")) {
      fileContent = await fileData.text();
    } else {
      // For binary files (PDF, DOCX, etc.), we'll pass file info to AI
      // and let it work with what metadata we can extract
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      // Try to extract any readable text from the binary
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = decoder.decode(bytes);
      // Filter to printable chars to get any embedded text
      fileContent = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
      if (fileContent.length < 50) {
        fileContent = `[Binary file: ${fileName} (${fileType}, ${bytes.length} bytes). Unable to extract full text content. Please provide instructions based on the file name and type.]`;
      } else {
        fileContent = fileContent.substring(0, 15000);
      }
    }

    const format = outputFormat || "text";

    // Build AI prompt for document processing
    const systemPrompt = `You are a professional document processor. The user has uploaded a file and wants you to process it.

## TASK
Process the uploaded document according to the user's instructions and return the optimized/transformed content.

## OUTPUT FORMAT: ${format.toUpperCase()}
${format === "csv" ? "Return ONLY valid CSV content with proper escaping. Use commas as delimiters." : ""}
${format === "markdown" ? "Return well-formatted Markdown content." : ""}
${format === "text" ? "Return clean, well-formatted plain text." : ""}

## RULES
- Follow the user's instruction precisely
- Maintain professional quality
- If optimizing a CV/resume, improve impact statements, fix formatting, add metrics where possible
- If refining a report, improve clarity, structure, and professionalism
- If transforming data, ensure accuracy and proper formatting
- Return ONLY the processed content, no meta-commentary`;

    const userPrompt = `## UPLOADED FILE
**File Name:** ${fileName}
**File Type:** ${fileType}

## FILE CONTENT
${fileContent.substring(0, 20000)}

## USER INSTRUCTION
${instruction}

Please process this document and return the optimized content.`;

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
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI processing failed");
    }

    const aiResult = await response.json();
    const processedContent = aiResult.choices?.[0]?.message?.content || "";

    if (!processedContent) throw new Error("No content returned from AI");

    // Determine output file extension
    const extMap: Record<string, string> = {
      csv: "csv",
      markdown: "md",
      text: "txt",
    };
    const ext = extMap[format] || "txt";
    const outputFileName = `processed_${Date.now()}.${ext}`;
    const outputPath = `${user.id}/processed/${outputFileName}`;

    // Upload processed file to storage
    const contentBlob = new Blob([processedContent], { type: "text/plain" });
    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(outputPath, contentBlob);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload processed file");
    }

    // Create signed URL for download
    const { data: signedData, error: signError } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(outputPath, 60 * 60 * 24 * 7); // 7 days

    if (signError || !signedData?.signedUrl) {
      throw new Error("Failed to create download link");
    }

    console.log("Document processed successfully:", outputFileName);

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedData.signedUrl,
      fileName: outputFileName,
      processedContent: processedContent.substring(0, 500) + (processedContent.length > 500 ? "..." : ""),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
