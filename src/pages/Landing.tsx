import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Brain, MessageSquare, Mic, Shield } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6 animate-pulse">
            <Brain className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Digital Twin</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Your Digital Doppelgänger
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            An AI assistant that communicates, writes, and speaks exactly like you. 
            Powered by your knowledge, your style, your voice.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8 shadow-lg hover:shadow-xl transition-all"
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => navigate("/auth")}
              className="text-lg px-8"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-5xl mx-auto">
          <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Your Writing Style</h3>
            <p className="text-muted-foreground">
              Trained on your documents, emails, and messages to perfectly replicate your unique voice and communication patterns.
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
              <Mic className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Voice Clone</h3>
            <p className="text-muted-foreground">
              Neural text-to-speech trained on your voice samples for authentic audio output that sounds just like you.
            </p>
          </div>

          <div className="bg-card p-8 rounded-xl border shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-xl font-semibold mb-3">Privacy First</h3>
            <p className="text-muted-foreground">
              Your data stays secure with encryption, transparent controls, and clear disclosure of AI-generated content.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
