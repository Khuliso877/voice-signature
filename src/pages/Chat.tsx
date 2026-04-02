import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, User, Bot, Trash2, Volume2, VolumeX, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DopamineDashboard } from "@/components/dashboard/DopamineDashboard";
import { ChatAttachmentPreview, ChatMessageAttachment } from "@/components/chat/ChatAttachment";

type Attachment = {
  url: string;
  fileName: string;
  fileType: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
};

const ACCEPTED_FILE_TYPES = "image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx";

const ChatContent = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadChatHistory();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup preview URL on unmount or change
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const loadChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_history")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (data) {
        data.reverse();
        setMessages(data.map(msg => {
          // Try to parse attachments from content metadata
          let attachments: Attachment[] | undefined;
          let content = msg.content;
          
          // Check for attachment metadata marker
          const attachmentMarker = "\n\n[attachment:";
          if (content.includes(attachmentMarker)) {
            const markerIndex = content.indexOf(attachmentMarker);
            const metaPart = content.slice(markerIndex);
            content = content.slice(0, markerIndex);
            
            try {
              const jsonStr = metaPart.replace("\n\n[attachment:", "").replace("]", "");
              attachments = [JSON.parse(jsonStr)];
            } catch { /* ignore parse errors */ }
          }

          return {
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content,
            attachments,
          };
        }));
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const saveChatMessage = async (role: "user" | "assistant", content: string) => {
    if (!user) return;
    try {
      await supabase.from("chat_history").insert({
        user_id: user.id,
        role,
        content,
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const uploadFile = async (file: File): Promise<Attachment | null> => {
    if (!user) return null;
    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(filePath, file);

      if (error) throw error;

      const { data: signedData, error: signError } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

      if (signError || !signedData?.signedUrl) throw signError || new Error("Failed to get signed URL");

      return {
        url: signedData.signedUrl,
        fileName: file.name,
        fileType: file.type,
        storagePath: filePath,
      };
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload Failed", description: "Could not upload file.", variant: "destructive" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 10MB.", variant: "destructive" });
      return;
    }

    // Clean up old preview
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);

    setPendingFile(file);
    if (file.type.startsWith("image/")) {
      setPendingPreview(URL.createObjectURL(file));
    } else {
      setPendingPreview(null);
    }

    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const removePendingFile = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
  };

  const playTextToSpeech = async (text: string) => {
    if (!voiceEnabled || !text) return;
    try {
      setIsPlayingAudio(true);
      const response = await fetch(
        `https://bpglcfechtxoukhfnhim.supabase.co/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "Aria" }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Text-to-speech error:", errorData);
        toast({
          title: "Voice Generation Failed",
          description: errorData.error || "Failed to generate speech.",
          variant: "destructive",
        });
        setIsPlayingAudio(false);
        return;
      }

      const { audioContent } = await response.json();
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0))],
        { type: "audio/mpeg" }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) audioRef.current.pause();

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => { setIsPlayingAudio(false); URL.revokeObjectURL(audioUrl); };
      audio.onerror = () => { setIsPlayingAudio(false); URL.revokeObjectURL(audioUrl); };
      await audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
      toast({ title: "Voice Error", description: "Failed to play audio.", variant: "destructive" });
      setIsPlayingAudio(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    try {
      await supabase.from("chat_history").delete().eq("user_id", user.id);
      setMessages([]);
      toast({ title: "History cleared", description: "Your chat history has been deleted." });
    } catch (error) {
      console.error("Error clearing history:", error);
      toast({ title: "Error", description: "Failed to clear history.", variant: "destructive" });
    }
  };

  const sendMessage = useCallback(async (messageText?: string) => {
    const text = messageText || input;
    if ((!text.trim() && !pendingFile) || !user) return;

    let attachment: Attachment | null = null;
    if (pendingFile) {
      attachment = await uploadFile(pendingFile);
      removePendingFile();
    }

    const displayContent = text.trim() || (attachment ? `Sent ${attachment.fileName}` : "");
    const userMessage: Message = {
      role: "user",
      content: displayContent,
      attachments: attachment ? [attachment] : undefined,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Save with attachment metadata embedded
    let saveContent = displayContent;
    if (attachment) {
      saveContent += `\n\n[attachment:${JSON.stringify(attachment)}]`;
    }
    saveChatMessage("user", saveContent);

    if (!messageText) setInput("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // Build message for AI - include attachment context
      let aiContent = displayContent;
      if (attachment) {
        aiContent += `\n[User attached a file: ${attachment.fileName} (${attachment.fileType})]`;
      }

      const response = await fetch(
        `https://bpglcfechtxoukhfnhim.supabase.co/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: [...messages, { role: "user", content: aiContent }] }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get response: ${response.status}`);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (assistantContent) {
        saveChatMessage("assistant", assistantContent);
        if (voiceEnabled) await playTextToSpeech(assistantContent);
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [input, user, messages, voiceEnabled, pendingFile]);

  const handleSidebarMessage = useCallback((message: string) => {
    setInput(message);
    setTimeout(() => {
      sendMessage(message);
    }, 100);
  }, [sendMessage]);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background flex w-full">
        <DopamineDashboard onSendMessage={handleSidebarMessage} />

        <div className="flex-1 flex flex-col min-w-0">
          <Navbar />
          
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-card/50">
            <SidebarTrigger />
            <span className="text-xs text-muted-foreground">Toggle Dashboard</span>
          </div>

          <div className="flex-1 container mx-auto px-4 py-6 max-w-4xl">
            <div className="mb-4 flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Chat with Your Doppelgänger
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Ask questions and see responses in your unique style
                </p>
              </div>
              {messages.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearHistory}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVoiceEnabled(!voiceEnabled);
                      if (audioRef.current && isPlayingAudio) {
                        audioRef.current.pause();
                        setIsPlayingAudio(false);
                      }
                    }}
                  >
                    {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>
              )}
            </div>

            <Card className="h-[calc(100vh-220px)] flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Start a conversation...
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 animate-fade-in ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 relative">
                        <Bot className="h-4 w-4 text-primary" />
                        {msg === messages[messages.length - 1] && isPlayingAudio && (
                          <div className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-primary animate-pulse">
                            <Volume2 className="h-2 w-2 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] p-4 rounded-lg ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.attachments?.map((att, i) => (
                        <ChatMessageAttachment
                          key={i}
                          url={att.url}
                          fileName={att.fileName}
                          fileType={att.fileType}
                        />
                      ))}
                    </div>

                    {msg.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-accent" />
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t p-4 space-y-2">
                {pendingFile && (
                  <ChatAttachmentPreview
                    file={pendingFile}
                    previewUrl={pendingPreview}
                    onRemove={removePendingFile}
                  />
                )}
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isUploading}
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && !isLoading && sendMessage()}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendMessage()}
                    disabled={(isLoading || isUploading) || (!input.trim() && !pendingFile)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

const Chat = () => (
  <ProtectedRoute>
    <ChatContent />
  </ProtectedRoute>
);

export default Chat;
