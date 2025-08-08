import { Card, CardContent } from "@/components/ui/card";
import Section from "@/components/ui/section";

export default function LogoShowcase() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      <Section>
        <div className="max-w-4xl mx-auto">
          <h1 className="font-display text-4xl font-bold mb-4 text-center">atomtools.ai Logo</h1>
          <p className="text-xl text-text-secondary text-center mb-12">
            Brand identity assets for atomtools.ai
          </p>
          
          {/* Full Logo */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-surface border-border">
              <CardContent className="p-8">
                <h2 className="font-display text-xl font-semibold mb-6">Full Logo</h2>
                <div className="flex items-center justify-center p-8 bg-background rounded-xl border border-border mb-4">
                  <img src="/logo.svg" alt="atomtools.ai full logo" width="200" height="67" />
                </div>
                <p className="text-sm text-text-secondary">
                  Primary logo with animated atomic structure and brand name
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-surface border-border">
              <CardContent className="p-8">
                <h2 className="font-display text-xl font-semibold mb-6">Logo Icon</h2>
                <div className="flex items-center justify-center p-8 bg-background rounded-xl border border-border mb-4">
                  <img src="/logo-icon.svg" alt="atomtools.ai logo icon" width="64" height="64" />
                </div>
                <p className="text-sm text-text-secondary">
                  Icon version for favicons and small applications
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Favicon */}
          <Card className="bg-surface border-border mb-12">
            <CardContent className="p-8">
              <h2 className="font-display text-xl font-semibold mb-6">Favicon</h2>
              <div className="flex items-center justify-center p-8 bg-background rounded-xl border border-border mb-4">
                <img src="/favicon.svg" alt="atomtools.ai favicon" width="32" height="32" />
              </div>
              <p className="text-sm text-text-secondary">
                Favicon with dark background for better visibility in browser tabs
              </p>
            </CardContent>
          </Card>
          
          {/* Brand Guidelines */}
          <Card className="bg-surface border-border">
            <CardContent className="p-8">
              <h2 className="font-display text-xl font-semibold mb-6">Brand Guidelines</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Colors</h3>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#6366F1] rounded border"></div>
                      <span className="text-sm">#6366F1 (Electric Indigo)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#F8FAFC] rounded border"></div>
                      <span className="text-sm">#F8FAFC (White)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#1E293B] rounded border"></div>
                      <span className="text-sm">#1E293B (Dark)</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Typography</h3>
                  <p className="text-sm text-text-secondary">
                    <strong>Primary:</strong> Space Grotesk (headings)<br />
                    <strong>Secondary:</strong> Inter (body text)
                  </p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Design Concept</h3>
                  <p className="text-sm text-text-secondary">
                    The logo represents atomtools.ai's core concept of atomic, modular marketing tools. 
                    The atomic structure symbolizes precision, science, and interconnected components 
                    working together efficiently.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}