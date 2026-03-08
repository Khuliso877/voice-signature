import { History, User, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ChatHistoryPanel } from "./ChatHistoryPanel";
import { ProfilePanel } from "./ProfilePanel";
import { QuickActionsPanel } from "./QuickActionsPanel";

interface DopamineDashboardProps {
  onSendMessage: (message: string) => void;
}

export const DopamineDashboard = ({ onSendMessage }: DopamineDashboardProps) => {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-sm text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            Dopamine Dashboard
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Accelerator
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="h-[200px]">
              <QuickActionsPanel onSendMessage={onSendMessage} />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Chat History */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <History className="h-3.5 w-3.5 mr-1.5" />
            Memory Lane
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="h-[250px]">
              <ChatHistoryPanel onSendMessage={onSendMessage} />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Profile */}
        <SidebarGroup>
          <SidebarGroupLabel>
            <User className="h-3.5 w-3.5 mr-1.5" />
            Identity Hub
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <ProfilePanel />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
