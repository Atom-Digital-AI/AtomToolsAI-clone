import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Section from "@/components/ui/section";
import ToolCard from "@/components/ui/tool-card";

const filters = ["All", "Guides", "Generators", "Reporting"];

const tools = [
  {
    name: "Facebook Ads Looker Studio Connector Guide",
    description: "Complete guide to building your own Facebook Ads connector. No monthly fees or data storage costs.",
    icon: "fab fa-facebook-f",
    iconColor: "bg-blue-500/10 text-blue-400",
    badge: { text: "£499", variant: "accent" as const },
    features: [
      "Step-by-step instructions",
      "Complete source code included",
      "Full control & oversight",
    ],
    href: "/tools/facebook-ads-looker-studio-connector",
    category: "Guides",
  },
  {
    name: "SEO Meta Generator",
    description: "Generate clean, on-brand titles & metas at scale.",
    icon: "fas fa-search",
    iconColor: "bg-green-500/10 text-green-400",
    badge: { text: "Pro", variant: "warning" as const },
    features: [
      "Upload CSV or enter URLs",
      "Pick tone and style",
      "AI generates, you review",
    ],
    href: "/tools/seo-meta-generator",
    category: "Generators",
  },
  {
    name: "Google Ads Copy Generator", 
    description: "High-performing headlines & descriptions in seconds.",
    icon: "fab fa-google",
    iconColor: "bg-red-500/10 text-red-400",
    badge: { text: "New", variant: "accent" as const },
    features: [
      "Enter product/keywords",
      "Set brand guidelines", 
      "Export to Google Ads",
    ],
    href: "/tools/google-ads-copy-generator",
    category: "Generators",
  },
  {
    name: "Content Writer v2",
    description: "Multi-stage AI article generation with concept selection and subtopic planning.",
    icon: "fas fa-pen-fancy",
    iconColor: "bg-purple-500/10 text-purple-400",
    badge: { text: "New", variant: "accent" as const },
    features: [
      "AI-generated article concepts",
      "Subtopic selection & planning",
      "Complete article assembly",
    ],
    href: "/app/tools/content-writer-v2",
    category: "Generators",
  },
];

export default function ToolsIndex() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "All" || tool.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <Section>
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">Marketing Automation Tools</h1>
        <p className="text-xl text-text-secondary mb-8">Choose a tool to start fast. Upgrade when you're ready.</p>
        
        {/* Search and filters */}
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-center mb-8">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="search"
                placeholder="Search tools..."
                className="pl-10 bg-surface border-border focus:ring-accent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search-tools"
              />
            </div>
            <div className="flex gap-2">
              {filters.map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
                  className={
                    activeFilter === filter 
                      ? "bg-accent text-white" 
                      : "bg-surface-2 text-text-secondary hover:text-text-primary"
                  }
                  data-testid={`button-filter-${filter.toLowerCase()}`}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Tool Cards */}
      {filteredTools.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTools.map((tool, index) => (
            <ToolCard key={index} {...tool} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-text-secondary text-lg" data-testid="text-no-tools">
            No tools found matching your search criteria.
          </p>
        </div>
      )}
    </Section>
  );
}
