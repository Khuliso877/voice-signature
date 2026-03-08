import { useState, useCallback, useRef } from "react";
import { Search, MessageSquare, Brain, FileText, Target, Globe, Filter, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

type SearchResult = {
  id: string;
  sourceType: "chat" | "memory" | "knowledge" | "goal" | "web";
  title: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: string;
  relevance: number;
};

const SOURCE_CONFIG = {
  chat: { icon: MessageSquare, label: "Chat", color: "text-blue-500" },
  memory: { icon: Brain, label: "Memory", color: "text-purple-500" },
  knowledge: { icon: FileText, label: "Knowledge", color: "text-emerald-500" },
  goal: { icon: Target, label: "Goal", color: "text-amber-500" },
  web: { icon: Globe, label: "Web", color: "text-cyan-500" },
};

interface SearchPanelProps {
  onSendMessage?: (message: string) => void;
}

export const SearchPanel = ({ onSendMessage }: SearchPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(["chat", "memory", "knowledge", "goal"]);
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const performSearch = useCallback(async (searchQuery: string, filters: string[]) => {
    if (!user || searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/omniscient-search`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            query: searchQuery,
            filters: { sourceTypes: filters },
            limit: 20,
          }),
        }
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      toast({ title: "Search Error", description: "Failed to search.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, [user, toast]);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(value, activeFilters), 400);
  };

  const toggleFilter = (filter: string) => {
    const updated = activeFilters.includes(filter)
      ? activeFilters.filter(f => f !== filter)
      : [...activeFilters, filter];
    setActiveFilters(updated);
    if (query.trim().length >= 2) performSearch(query, updated);
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.sourceType === "chat" && onSendMessage) {
      onSendMessage(`Tell me more about: "${result.content.slice(0, 100)}"`);
    } else if (onSendMessage) {
      onSendMessage(`What do you know about "${result.title || result.content.slice(0, 60)}"?`);
    }
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text.length > 120 ? text.slice(0, 120) + "..." : text;
    const start = Math.max(0, idx - 40);
    const end = Math.min(text.length, idx + q.length + 80);
    const snippet = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
    return snippet;
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 pb-1 space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search everything..."
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            className="pl-8 pr-8 h-8 text-xs"
          />
          {query && (
            <Button variant="ghost" size="icon" className="absolute right-0.5 top-0.5 h-7 w-7" onClick={() => { setQuery(""); setResults([]); }}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-3 w-3" />
          </Button>
          {showFilters && (
            <div className="flex flex-wrap gap-1">
              {Object.entries(SOURCE_CONFIG).filter(([k]) => k !== "web").map(([key, cfg]) => (
                <Badge
                  key={key}
                  variant={activeFilters.includes(key) ? "default" : "outline"}
                  className="text-[10px] cursor-pointer px-1.5 py-0"
                  onClick={() => toggleFilter(key)}
                >
                  {cfg.label}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-2 pb-2 space-y-1">
          {isSearching && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isSearching && query.trim().length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No results found</p>
          )}

          {!isSearching && query.trim().length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-4">Type 2+ characters to search across all your data</p>
          )}

          {results.map(result => {
            const cfg = SOURCE_CONFIG[result.sourceType] || SOURCE_CONFIG.chat;
            const Icon = cfg.icon;
            return (
              <div
                key={`${result.sourceType}-${result.id}`}
                className="group p-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-sidebar-foreground truncate">
                        {result.title}
                      </span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {highlightMatch(result.content, query)}
                    </p>
                    {result.metadata?.category && (
                      <span className="text-[10px] text-muted-foreground/60">{result.metadata.category}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
