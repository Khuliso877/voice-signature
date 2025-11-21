import { Facebook, Linkedin, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">About Digital Doppelgänger</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Digital Doppelgänger is an AI-powered platform that creates your personalized AI assistant. 
              By learning from your writing style, knowledge base, and communication patterns, it can respond 
              and communicate exactly like you. Perfect for maintaining your digital presence, managing 
              communications, and ensuring consistency across all interactions.
            </p>
          </div>

          {/* Founder Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Contact</h3>
            <div className="space-y-2">
              <p className="text-sm font-medium">Khuliso Mudau</p>
              <p className="text-muted-foreground text-sm">Founder & Creator</p>
              
              <div className="flex flex-col gap-2 mt-4">
                <a 
                  href="mailto:kmudau872@gmail.com" 
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  kmudau872@gmail.com
                </a>
                
                <a 
                  href="https://www.linkedin.com/in/khuliso-mudau?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn Profile
                </a>
                
                <a 
                  href="https://www.facebook.com/share/1EYNCeQSZJ/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                  Facebook Profile
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Digital Doppelgänger. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;