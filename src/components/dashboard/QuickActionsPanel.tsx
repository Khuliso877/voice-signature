import { useState } from "react";
import { Zap, Plus, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

const DEFAULT_ACTIONS = [
  "Summarize our last conversation",
  "What are my current goals?",
  "Brainstorm ideas for my next project",
  "Draft a professional email about...",
  "What do you know about me?",
];

interface QuickActionsPanelProps {
  onSendMessage: (message: string) => void;
}

export const QuickActionsPanel = ({ onSendMessage }: QuickActionsPanelProps) => {
  const [actions, setActions] = useState<string[]>(() => {
    const stored = localStorage.getItem("quick-actions");
    return stored ? JSON.parse(stored) : DEFAULT_ACTIONS;
  });
  const [newAction, setNewAction] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const saveActions = (updated: string[]) => {
    setActions(updated);
    localStorage.setItem("quick-actions", JSON.stringify(updated));
  };

  const addAction = () => {
    if (!newAction.trim()) return;
    saveActions([...actions, newAction.trim()]);
    setNewAction("");
    setIsAdding(false);
  };

  const removeAction = (index: number) => {
    saveActions(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className="group flex items-center gap-1.5 p-2 rounded-md hover:bg-sidebar-accent cursor-pointer transition-colors"
              onClick={() => onSendMessage(action)}
            >
              <Zap className="h-3 w-3 text-accent shrink-0" />
              <span className="text-[11px] text-sidebar-foreground flex-1 line-clamp-2">{action}</span>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => { e.stopPropagation(); onSendMessage(action); }}
                >
                  <Send className="h-2.5 w-2.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-destructive"
                  onClick={(e) => { e.stopPropagation(); removeAction(idx); }}
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t border-sidebar-border">
        {isAdding ? (
          <div className="flex gap-1">
            <Input
              placeholder="Custom prompt..."
              value={newAction}
              onChange={e => setNewAction(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addAction()}
              className="h-7 text-xs"
              autoFocus
            />
            <Button size="icon" className="h-7 w-7 shrink-0" onClick={addAction}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Quick Action
          </Button>
        )}
      </div>
    </div>
  );
};
