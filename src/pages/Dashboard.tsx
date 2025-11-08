import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, FileText, Mic2 } from "lucide-react";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your persona, memory, and knowledge base
          </p>
        </div>

        <Tabs defaultValue="persona" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="persona">Persona</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          </TabsList>

          <TabsContent value="persona" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Persona Settings</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how your AI thinks and responds
                  </p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Bio</label>
                  <p className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                    Coming soon: Edit your AI's personality and background
                  </p>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Memory Bank</h2>
                  <p className="text-sm text-muted-foreground">
                    Personal facts and preferences
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                Coming soon: Add and manage personal facts that your AI can reference
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Mic2 className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Knowledge Base</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload documents and training data
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                Coming soon: Upload your writings, transcripts, and other materials
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
