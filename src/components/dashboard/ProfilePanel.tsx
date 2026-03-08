import { useState, useEffect } from "react";
import { User, Brain, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export const ProfilePanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bio, setBio] = useState("");
  const [tone, setTone] = useState("");
  const [style, setStyle] = useState("");
  const [memoryCount, setMemoryCount] = useState(0);
  const [docCount, setDocCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    const [personaRes, memRes, docRes, goalRes] = await Promise.all([
      supabase.from("persona_settings").select("bio, tone, communication_style").eq("user_id", user.id).maybeSingle(),
      supabase.from("memory_facts").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("knowledge_documents").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("user_goals").select("id", { count: "exact" }).eq("user_id", user.id).eq("status", "active"),
    ]);

    if (personaRes.data) {
      setBio(personaRes.data.bio || "Not set");
      setTone(personaRes.data.tone || "Not set");
      setStyle(personaRes.data.communication_style || "Not set");
    }
    setMemoryCount(memRes.count || 0);
    setDocCount(docRes.count || 0);
    setGoalCount(goalRes.count || 0);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-4">
        {/* Identity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-sidebar-foreground">Identity</span>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2">{bio}</p>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] h-5">{tone}</Badge>
            <Badge variant="secondary" className="text-[10px] h-5">{style}</Badge>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-sidebar-accent p-2 text-center">
            <Brain className="h-3.5 w-3.5 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold text-sidebar-foreground">{memoryCount}</p>
            <p className="text-[10px] text-muted-foreground">Memories</p>
          </div>
          <div className="rounded-md bg-sidebar-accent p-2 text-center">
            <BookOpen className="h-3.5 w-3.5 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold text-sidebar-foreground">{docCount}</p>
            <p className="text-[10px] text-muted-foreground">Docs</p>
          </div>
          <div className="rounded-md bg-sidebar-accent p-2 text-center">
            <Settings className="h-3.5 w-3.5 mx-auto text-primary mb-1" />
            <p className="text-sm font-bold text-sidebar-foreground">{goalCount}</p>
            <p className="text-[10px] text-muted-foreground">Goals</p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-8"
          onClick={() => navigate("/dashboard")}
        >
          <Settings className="h-3 w-3 mr-1.5" />
          Manage Full Profile
        </Button>
      </div>
    </ScrollArea>
  );
};
