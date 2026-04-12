import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "https://esm.sh/docx@9.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePDF(content: string, title: string): Uint8Array {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(title, margin, y);
  y += 12;

  // Separator line
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Body content
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");

  const lines = content.split("\n");
  for (const line of lines) {
    // Handle headings (markdown-style)
    if (line.startsWith("# ")) {
      y += 4;
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      const splitLines = doc.splitTextToSize(line.replace(/^#+\s*/, ""), maxWidth);
      for (const sl of splitLines) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(sl, margin, y);
        y += 8;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      continue;
    }
    if (line.startsWith("## ")) {
      y += 3;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      const splitLines = doc.splitTextToSize(line.replace(/^#+\s*/, ""), maxWidth);
      for (const sl of splitLines) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(sl, margin, y);
        y += 7;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      continue;
    }
    if (line.startsWith("### ")) {
      y += 2;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      const splitLines = doc.splitTextToSize(line.replace(/^#+\s*/, ""), maxWidth);
      for (const sl of splitLines) {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(sl, margin, y);
        y += 6;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      continue;
    }

    // Bold text markers
    const cleanLine = line.replace(/\*\*(.*?)\*\*/g, "$1");

    if (cleanLine.trim() === "") {
      y += 4;
      continue;
    }

    const splitLines = doc.splitTextToSize(cleanLine, maxWidth);
    for (const sl of splitLines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(sl, margin, y);
      y += 6;
    }
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

async function generateDOCX(content: string, title: string): Promise<Uint8Array> {
  const children: (typeof Paragraph.prototype)[] = [];

  // Title
  children.push(new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 36, font: "Arial" })],
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));

  // Parse content lines
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("### ")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^###\s*/, ""), bold: true, size: 26, font: "Arial" })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }));
    } else if (line.startsWith("## ")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^##\s*/, ""), bold: true, size: 30, font: "Arial" })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }));
    } else if (line.startsWith("# ")) {
      children.push(new Paragraph({
        children: [new TextRun({ text: line.replace(/^#\s*/, ""), bold: true, size: 34, font: "Arial" })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 140 },
      }));
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      // Bullet point
      const text = line.replace(/^[-*]\s*/, "");
      const runs = parseBoldText(text);
      children.push(new Paragraph({
        children: runs,
        bullet: { level: 0 },
        spacing: { after: 60 },
      }));
    } else if (line.trim() === "") {
      children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
    } else {
      const runs = parseBoldText(line);
      children.push(new Paragraph({
        children: runs,
        spacing: { after: 80 },
      }));
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}

function parseBoldText(text: string): InstanceType<typeof TextRun>[] {
  const runs: InstanceType<typeof TextRun>[] = [];
  const parts = text.split(/(\*\*.*?\*\*)/g);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, size: 22, font: "Arial" }));
    } else if (part) {
      runs.push(new TextRun({ text: part, size: 22, font: "Arial" }));
    }
  }
  return runs;
}

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
      const bytes = new Uint8Array(await fileData.arrayBuffer());
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = decoder.decode(bytes);
      fileContent = rawText.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
      if (fileContent.length < 50) {
        fileContent = `[Binary file: ${fileName} (${fileType}, ${bytes.length} bytes). Unable to extract full text content. Please provide instructions based on the file name and type.]`;
      } else {
        fileContent = fileContent.substring(0, 15000);
      }
    }

    const format = outputFormat || "text";

    // Build AI prompt for document processing
    const formatInstructions: Record<string, string> = {
      csv: "Return ONLY valid CSV content with proper escaping. Use commas as delimiters.",
      markdown: "Return well-formatted Markdown content with headings (#, ##, ###), bullet points, and bold text.",
      text: "Return clean, well-formatted plain text.",
      pdf: "Return well-structured content using Markdown formatting (# for headings, ## for subheadings, **bold** for emphasis, - for bullet points). This will be converted to a professional PDF.",
      docx: "Return well-structured content using Markdown formatting (# for headings, ## for subheadings, **bold** for emphasis, - for bullet points). This will be converted to a professional Word document.",
    };

    const systemPrompt = `You are a professional document processor. The user has uploaded a file and wants you to process it.

## TASK
Process the uploaded document according to the user's instructions and return the optimized/transformed content.

## OUTPUT FORMAT: ${format.toUpperCase()}
${formatInstructions[format] || formatInstructions.text}

## RULES
- Follow the user's instruction precisely
- Maintain professional quality
- If optimizing a CV/resume, improve impact statements, fix formatting, add metrics where possible
- If refining a report, improve clarity, structure, and professionalism
- If transforming data, ensure accuracy and proper formatting
- Return ONLY the processed content, no meta-commentary or explanations`;

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

    // Generate output file based on format
    let fileBytes: Uint8Array;
    let contentType: string;
    let ext: string;
    const baseTitle = fileName.replace(/\.[^/.]+$/, "") + " (Processed)";

    switch (format) {
      case "pdf": {
        fileBytes = generatePDF(processedContent, baseTitle);
        contentType = "application/pdf";
        ext = "pdf";
        break;
      }
      case "docx": {
        fileBytes = await generateDOCX(processedContent, baseTitle);
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        ext = "docx";
        break;
      }
      case "csv": {
        fileBytes = new TextEncoder().encode(processedContent);
        contentType = "text/csv";
        ext = "csv";
        break;
      }
      case "markdown": {
        fileBytes = new TextEncoder().encode(processedContent);
        contentType = "text/markdown";
        ext = "md";
        break;
      }
      default: {
        fileBytes = new TextEncoder().encode(processedContent);
        contentType = "text/plain";
        ext = "txt";
        break;
      }
    }

    const outputFileName = `processed_${Date.now()}.${ext}`;
    const outputPath = `${user.id}/processed/${outputFileName}`;

    // Upload processed file to storage
    const blob = new Blob([fileBytes], { type: contentType });
    const { error: uploadError } = await supabase.storage
      .from("chat-attachments")
      .upload(outputPath, blob);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload processed file");
    }

    // Create signed URL for download
    const { data: signedData, error: signError } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(outputPath, 60 * 60 * 24 * 7);

    if (signError || !signedData?.signedUrl) {
      throw new Error("Failed to create download link");
    }

    console.log("Document processed successfully:", outputFileName);

    return new Response(JSON.stringify({
      success: true,
      downloadUrl: signedData.signedUrl,
      fileName: outputFileName,
      outputFormat: format,
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
