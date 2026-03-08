import { useState, useEffect } from "react";
import { Search, Pin, PinOff, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";

type ConversationGroup = {
  date: string;
  label: string;
  firstMessage: string;
  messageCount: number;
  isPinned: boolean;
};

interface ChatHistoryPanelProps {
  onSendMessage?: (message: string) => void;
}

export const ChatHistoryPanel = ({ onSendMessage }: ChatHistoryPanelProps) => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [pinnedDates, setPinnedDates] = useState<string[]>(() => {
    const stored = localStorage.getItem("pinned-conversations");
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("chat_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500);

    if (error || !data) return;

    // Group by date
    const dateMap = new Map<string, { messages: typeof data }>();
    for (const msg of data) {
      const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { messages: [] });
      }
      dateMap.get(dateKey)!.messages.push(msg);
    }

    const grouped: ConversationGroup[] = [];
    for (const [dateKey, { messages }] of dateMap) {
      const date = new Date(dateKey);
      let label = format(date, "MMM d, yyyy");
      if (isToday(date)) label = "Today";
      else if (isYesterday(date)) label = "Yesterday";
      else if (isThisWeek(date)) label = format(date, "EEEE");

      const userMessages = messages.filter(m => m.role === "user");
      const firstUserMsg = userMessages[userMessages.length - 1]?.content || "Conversation";

      grouped.push({
        date: dateKey,
        label,
        firstMessage: firstUserMsg.slice(0, 60) + (firstUserMsg.length > 60 ? "..." : ""),
        messageCount: messages.length,
        isPinned: pinnedDates.includes(dateKey),
      });
    }

    // Sort: pinned first, then by date desc
    grouped.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.date.localeCompare(a.date);
    });

    setGroups(grouped);
  };

  const togglePin = (dateKey: string) => {
    const updated = pinnedDates.includes(dateKey)
      ? pinnedDates.filter(d => d !== dateKey)
      : [...pinnedDates, dateKey];
    setPinnedDates(updated);
    localStorage.setItem("pinned-conversations", JSON.stringify(updated));
    setGroups(prev =>
      prev.map(g => g.date === dateKey ? { ...g, isPinned: !g.isPinned } : g)
        .sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return b.date.localeCompare(a.date);
        })
    );
  };

  const filtered = groups.filter(
    g => g.firstMessage.toLowerCase().includes(search.toLowerCase()) || g.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search history..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-1">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No conversations found</p>
          )}
          {filtered.map(group => (
            <div
              key={group.date}
              className="group flex items-start gap-2 p-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium text-sidebar-foreground">{group.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.stopPropagation(); togglePin(group.date); }}
                  >
                    {group.isPinned ? (
                      <PinOff className="h-3 w-3 text-primary" />
                    ) : (
                      <Pin className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{group.firstMessage}</p>
                <span className="text-[10px] text-muted-foreground/60">{group.messageCount} messages</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
