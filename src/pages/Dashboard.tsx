import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, FileText, Mic2, Plus, Trash2, BarChart3, Target, Lightbulb } from "lucide-react";
import { MemoryCategoryChart } from "@/components/MemoryCategoryChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import Footer from "@/components/Footer";

type PersonaSettings = {
  bio: string;
  tone: string;
  communication_style: string;
  favorite_phrases: string[];
  proactive_suggestions_enabled: boolean;
};

type MemoryFact = {
  id: string;
  category: string;
  fact: string;
  importance: "low" | "medium" | "high";
};

type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  document_type: string;
};

type UserGoal = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  target_date: string | null;
};

const DashboardContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [persona, setPersona] = useState<PersonaSettings>({
    bio: "",
    tone: "",
    communication_style: "",
    favorite_phrases: [],
    proactive_suggestions_enabled: true,
  });
  const [memories, setMemories] = useState<MemoryFact[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [newPhrase, setNewPhrase] = useState("");
  const [newMemory, setNewMemory] = useState({
    category: "",
    fact: "",
    importance: "medium" as "low" | "medium" | "high",
  });
  const [newDocument, setNewDocument] = useState({ title: "", content: "", document_type: "" });
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    category: "career",
    priority: "medium",
    target_date: "",
  });

  useEffect(() => {
    if (user) {
      loadPersona();
      loadMemories();
      loadDocuments();
      loadGoals();
    }
  }, [user]);

  const loadPersona = async () => {
    try {
      const { data, error } = await supabase
        .from("persona_settings")
        .select("*")
        .eq("user_id", user?.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      if (data) {
        setPersona({
          bio: data.bio || "",
          tone: data.tone || "",
          communication_style: data.communication_style || "",
          favorite_phrases: data.favorite_phrases || [],
          proactive_suggestions_enabled: data.proactive_suggestions_enabled !== false,
        });
      }
    } catch (error) {
      console.error("Error loading persona:", error);
    }
  };

  const savePersona = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from("persona_settings").upsert(
        {
          user_id: user.id,
          ...persona,
        },
        {
          onConflict: 'user_id'
        }
      );

      if (error) throw error;

      toast({ title: "Success", description: "Persona settings saved!" });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadMemories = async () => {
    try {
      const { data, error } = await supabase
        .from("memory_facts")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setMemories(data.map(m => ({
          ...m,
          importance: m.importance as "low" | "medium" | "high"
        })));
      }
    } catch (error) {
      console.error("Error loading memories:", error);
    }
  };

  const addMemory = async () => {
    if (!user || !newMemory.category || !newMemory.fact) return;

    try {
      const { error } = await supabase.from("memory_facts").insert({
        user_id: user.id,
        ...newMemory,
      });

      if (error) throw error;

      setNewMemory({ category: "", fact: "", importance: "medium" });
      loadMemories();
      toast({ title: "Success", description: "Memory added!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteMemory = async (id: string) => {
    try {
      const { error } = await supabase.from("memory_facts").delete().eq("id", id);
      if (error) throw error;
      loadMemories();
      toast({ title: "Success", description: "Memory deleted!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setDocuments(data);
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  };

  const addDocument = async () => {
    if (!user || !newDocument.title || !newDocument.content) return;

    try {
      const { error } = await supabase.from("knowledge_documents").insert({
        user_id: user.id,
        ...newDocument,
      });

      if (error) throw error;

      setNewDocument({ title: "", content: "", document_type: "" });
      loadDocuments();
      toast({ title: "Success", description: "Document added!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase.from("knowledge_documents").delete().eq("id", id);
      if (error) throw error;
      loadDocuments();
      toast({ title: "Success", description: "Document deleted!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("user_goals")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setGoals(data);
    } catch (error) {
      console.error("Error loading goals:", error);
    }
  };

  const addGoal = async () => {
    if (!user || !newGoal.title) return;

    try {
      const { error } = await supabase.from("user_goals").insert({
        user_id: user.id,
        title: newGoal.title,
        description: newGoal.description,
        category: newGoal.category,
        priority: newGoal.priority,
        target_date: newGoal.target_date || null,
      });

      if (error) throw error;

      setNewGoal({ title: "", description: "", category: "career", priority: "medium", target_date: "" });
      loadGoals();
      toast({ title: "Success", description: "Goal added!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase.from("user_goals").delete().eq("id", id);
      if (error) throw error;
      loadGoals();
      toast({ title: "Success", description: "Goal deleted!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleGoalStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "completed" : "active";
      const { error } = await supabase.from("user_goals").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      loadGoals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const addPhrase = () => {
    if (!newPhrase.trim()) return;
    setPersona({
      ...persona,
      favorite_phrases: [...persona.favorite_phrases, newPhrase],
    });
    setNewPhrase("");
  };

  const removePhrase = (index: number) => {
    setPersona({
      ...persona,
      favorite_phrases: persona.favorite_phrases.filter((_, i) => i !== index),
    });
  };
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your persona, memory, and knowledge base
          </p>
        </div>

        <Tabs defaultValue="persona" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="persona">Persona</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          </TabsList>

          <TabsContent value="persona" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
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
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="Describe yourself, your background, and key traits..."
                    value={persona.bio}
                    onChange={(e) => setPersona({ ...persona, bio: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={persona.tone} onValueChange={(value) => setPersona({ ...persona, tone: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="humorous">Humorous</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Communication Style</Label>
                  <Select value={persona.communication_style} onValueChange={(value) => setPersona({ ...persona, communication_style: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a communication style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="direct">Direct and concise</SelectItem>
                      <SelectItem value="detailed">Detailed and explanatory</SelectItem>
                      <SelectItem value="conversational">Conversational and warm</SelectItem>
                      <SelectItem value="analytical">Analytical and data-driven</SelectItem>
                      <SelectItem value="creative">Creative and expressive</SelectItem>
                      <SelectItem value="empathetic">Empathetic and supportive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Favorite Phrases</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a phrase you commonly use"
                      value={newPhrase}
                      onChange={(e) => setNewPhrase(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addPhrase()}
                    />
                    <Button onClick={addPhrase}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {persona.favorite_phrases.map((phrase, idx) => (
                      <div key={idx} className="bg-muted px-3 py-1 rounded-full flex items-center gap-2">
                        <span className="text-sm">{phrase}</span>
                        <button onClick={() => removePhrase(idx)} className="text-muted-foreground hover:text-foreground">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Proactive Suggestions Toggle */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    <div>
                      <Label className="text-sm font-medium">Proactive Suggestions</Label>
                      <p className="text-xs text-muted-foreground">
                        Allow AI to suggest opportunities based on your goals
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={persona.proactive_suggestions_enabled}
                    onCheckedChange={(checked) => 
                      setPersona({ ...persona, proactive_suggestions_enabled: checked })
                    }
                  />
                </div>

                <Button onClick={savePersona} className="w-full">
                  Save Persona Settings
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Goals & Objectives</h2>
                  <p className="text-sm text-muted-foreground">
                    Set goals for proactive AI suggestions
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Goal Title</Label>
                    <Input
                      placeholder="e.g., Learn Machine Learning"
                      value={newGoal.title}
                      onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={newGoal.category} 
                      onValueChange={(value) => setNewGoal({ ...newGoal, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="career">Career</SelectItem>
                        <SelectItem value="learning">Learning</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                        <SelectItem value="networking">Networking</SelectItem>
                        <SelectItem value="personal">Personal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Describe your goal in detail..."
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select 
                      value={newGoal.priority} 
                      onValueChange={(value) => setNewGoal({ ...newGoal, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Date (Optional)</Label>
                    <Input
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                    />
                  </div>
                </div>
                <Button onClick={addGoal} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Goal
                </Button>
              </div>

              <div className="space-y-3">
                {goals.map((goal) => (
                  <div 
                    key={goal.id} 
                    className={`p-4 rounded-lg flex justify-between items-start ${
                      goal.status === "completed" ? "bg-muted/50 opacity-60" : "bg-muted"
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <button
                          onClick={() => toggleGoalStatus(goal.id, goal.status)}
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                            goal.status === "completed" 
                              ? "bg-primary border-primary text-primary-foreground" 
                              : "border-muted-foreground"
                          }`}
                        >
                          {goal.status === "completed" && "✓"}
                        </button>
                        <span className={`font-medium ${goal.status === "completed" ? "line-through" : ""}`}>
                          {goal.title}
                        </span>
                        <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                          {goal.category}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          goal.priority === "high" ? "bg-destructive/20 text-destructive" :
                          goal.priority === "medium" ? "bg-primary/20 text-primary" :
                          "bg-muted-foreground/20 text-muted-foreground"
                        }`}>
                          {goal.priority}
                        </span>
                      </div>
                      {goal.description && (
                        <p className="text-sm text-muted-foreground ml-7">{goal.description}</p>
                      )}
                      {goal.target_date && (
                        <p className="text-xs text-muted-foreground ml-7 mt-1">
                          Target: {new Date(goal.target_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteGoal(goal.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {goals.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No goals added yet. Add your first goal to enable proactive AI suggestions.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="memory" className="space-y-4">
            {/* Memory Category Chart */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Memory Overview</h2>
                  <p className="text-sm text-muted-foreground">
                    Your memories by category
                  </p>
                </div>
              </div>
              <MemoryCategoryChart memories={memories} />
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
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
              
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                      placeholder="e.g., Preferences, Facts"
                      value={newMemory.category}
                      onChange={(e) => setNewMemory({ ...newMemory, category: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Importance</Label>
                    <Select value={newMemory.importance} onValueChange={(value: any) => setNewMemory({ ...newMemory, importance: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Fact</Label>
                  <Textarea
                    placeholder="Enter a personal fact or preference..."
                    value={newMemory.fact}
                    onChange={(e) => setNewMemory({ ...newMemory, fact: e.target.value })}
                  />
                </div>
                <Button onClick={addMemory} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Memory
                </Button>
              </div>

              <div className="space-y-3">
                {memories.map((memory) => (
                  <div key={memory.id} className="p-4 bg-muted rounded-lg flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{memory.category}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          memory.importance === "high" ? "bg-destructive/20 text-destructive" :
                          memory.importance === "medium" ? "bg-accent/20 text-accent" :
                          "bg-muted-foreground/20 text-muted-foreground"
                        }`}>
                          {memory.importance}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{memory.fact}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteMemory(memory.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {memories.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No memories added yet. Add your first memory above.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
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
              
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="Document title"
                      value={newDocument.title}
                      onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input
                      placeholder="e.g., Essay, Email, Article"
                      value={newDocument.document_type}
                      onChange={(e) => setNewDocument({ ...newDocument, document_type: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    placeholder="Paste your writing sample here..."
                    value={newDocument.content}
                    onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                    rows={6}
                  />
                </div>
                <Button onClick={addDocument} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </Button>
              </div>

              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 bg-muted rounded-lg flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{doc.title}</span>
                        {doc.document_type && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                            {doc.document_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{doc.content}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteDocument(doc.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {documents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No documents added yet. Add your first writing sample above.
                  </p>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};

const Dashboard = () => (
  <ProtectedRoute>
    <DashboardContent />
  </ProtectedRoute>
);

export default Dashboard;
