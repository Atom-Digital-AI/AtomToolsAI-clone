import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Section from "@/components/ui/section";

const tabs = ["Blog", "How-tos", "Templates"];

const blogPosts = [
  {
    title: "5 Metrics That Actually Matter for Facebook Ads",
    summary: "Stop tracking vanity metrics and focus on what drives real business growth with these essential KPIs.",
    category: "Marketing",
    readTime: "5 min read",
    image: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=200",
    href: "#article1",
  },
  {
    title: "Meta Tag Automation: A Complete Guide",
    summary: "Learn how to scale your SEO meta tag creation process using AI and automation tools.",
    category: "SEO",
    readTime: "8 min read", 
    image: "https://images.unsplash.com/photo-1432888622747-4eb9a8efeb07?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
    href: "#article2",
  },
  {
    title: "Building Your First Marketing Automation Workflow",
    summary: "Step-by-step guide to creating automated marketing workflows that save time and increase conversions.",
    category: "Automation",
    readTime: "12 min read",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=200",
    href: "#article3",
  },
];

const howTos = [
  {
    title: "Setting up Facebook Ads Connector",
    description: "Complete walkthrough of connecting your Facebook Ads account to Looker Studio.",
    duration: "15 min tutorial",
    icon: "fas fa-play",
    iconColor: "bg-accent/10 text-accent",
    href: "#tutorial1",
  },
  {
    title: "Bulk SEO Meta Generation",
    description: "Learn how to generate hundreds of meta tags from CSV data in minutes.",
    duration: "8 min tutorial", 
    icon: "fas fa-file-alt",
    iconColor: "bg-success/10 text-success",
    href: "#tutorial2",
  },
  {
    title: "Google Ads Copy Optimisation",
    description: "Best practices for creating high-converting ad copy using AI assistance.",
    duration: "12 min tutorial",
    icon: "fab fa-google",
    iconColor: "bg-red-500/10 text-red-400",
    href: "#tutorial3",
  },
];

const templates = [
  {
    title: "Facebook Ads Dashboard Template",
    description: "Ready-to-use Looker Studio dashboard for Facebook Ads performance tracking.",
    badge: { text: "Free", variant: "success" },
    icon: "fas fa-chart-line",
    iconColor: "bg-accent/10 text-accent",
    href: "#template1",
  },
  {
    title: "SEO Audit Checklist",
    description: "Comprehensive checklist for conducting technical SEO audits and meta tag reviews.",
    badge: { text: "Pro", variant: "warning" },
    icon: "fas fa-list",
    iconColor: "bg-success/10 text-success",
    href: "#template2",
  },
  {
    title: "Google Ads Copy Framework",
    description: "Proven framework for writing high-converting Google Ads headlines and descriptions.",
    badge: { text: "Free", variant: "success" },
    icon: "fas fa-ad",
    iconColor: "bg-red-500/10 text-red-400",
    href: "#template3",
  },
];

export default function Resources() {
  const [activeTab, setActiveTab] = useState("Blog");
  const [searchTerm, setSearchTerm] = useState("");

  const getBadgeColors = (variant: string) => {
    const colors = {
      success: "bg-success/10 text-success",
      warning: "bg-warning/10 text-warning",
      accent: "bg-accent/10 text-accent",
    };
    return colors[variant as keyof typeof colors] || colors.success;
  };

  const filterContent = (content: any[]) => {
    return content.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const renderBlogContent = () => {
    const filtered = filterContent(blogPosts);
    
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((post, index) => (
          <Card key={index} className="bg-background border-border overflow-hidden hover:border-accent/50 transition-colors">
            <img 
              src={post.image} 
              alt={post.title}
              className="w-full h-48 object-cover"
            />
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <Badge className={getBadgeColors("accent")}>{post.category}</Badge>
                <span className="text-text-secondary text-xs">{post.readTime}</span>
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-text-primary">{post.title}</h3>
              <p className="text-text-secondary text-sm mb-4">{post.summary}</p>
              <a href={post.href} className="text-accent hover:text-accent-2 text-sm font-medium" data-testid={`link-blog-${index}`}>
                Read more →
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderHowToContent = () => {
    const filtered = filterContent(howTos);
    
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((howTo, index) => (
          <Card key={index} className="bg-background border-border hover:border-accent/50 transition-colors">
            <CardContent className="p-6">
              <div className={`w-12 h-12 ${howTo.iconColor} rounded-xl flex items-center justify-center mb-4`}>
                <i className={`${howTo.icon} text-xl`}></i>
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-text-primary">{howTo.title}</h3>
              <p className="text-text-secondary text-sm mb-4">{howTo.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-xs">{howTo.duration}</span>
                <a href={howTo.href} className="text-accent hover:text-accent-2 text-sm font-medium" data-testid={`link-howto-${index}`}>
                  Watch →
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderTemplatesContent = () => {
    const filtered = filterContent(templates);
    
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((template, index) => (
          <Card key={index} className="bg-background border-border hover:border-accent/50 transition-colors">
            <CardContent className="p-6">
              <div className={`w-12 h-12 ${template.iconColor} rounded-xl flex items-center justify-center mb-4`}>
                <i className={`${template.icon} text-xl`}></i>
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-text-primary">{template.title}</h3>
              <p className="text-text-secondary text-sm mb-4">{template.description}</p>
              <div className="flex items-center justify-between">
                <Badge className={getBadgeColors(template.badge.variant)}>{template.badge.text}</Badge>
                <Button 
                  size="sm" 
                  className="bg-accent hover:bg-accent-2 text-white"
                  data-testid={`button-template-${index}`}
                >
                  Use template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Blog":
        return renderBlogContent();
      case "How-tos":
        return renderHowToContent();
      case "Templates":
        return renderTemplatesContent();
      default:
        return renderBlogContent();
    }
  };

  return (
    <Section className="bg-surface">
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl lg:text-4xl font-bold mb-4 text-text-primary">Resources</h1>
        <p className="text-xl text-text-secondary">Learn, implement, and optimise with our guides and templates</p>
      </div>
      
      {/* Resource Tabs */}
      <div className="mb-8">
        <div className="flex justify-center">
          <div className="inline-flex bg-background rounded-2xl p-1">
            {tabs.map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "ghost"}
                className={`px-6 py-3 rounded-xl transition-colors ${
                  activeTab === tab 
                    ? "bg-accent text-white" 
                    : "text-text-secondary hover:text-text-primary"
                }`}
                onClick={() => setActiveTab(tab)}
                data-testid={`button-tab-${tab.toLowerCase()}`}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Search */}
        <div className="max-w-md mx-auto mt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-10 bg-background border-border focus:ring-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-resources"
            />
          </div>
        </div>
      </div>
      
      {/* Resource Content */}
      {renderContent()}
      
      {/* Empty state */}
      {((activeTab === "Blog" && filterContent(blogPosts).length === 0) ||
        (activeTab === "How-tos" && filterContent(howTos).length === 0) ||
        (activeTab === "Templates" && filterContent(templates).length === 0)) && (
        <div className="text-center py-12">
          <p className="text-text-secondary text-lg" data-testid="text-no-resources">
            No {activeTab.toLowerCase()} found matching your search.
          </p>
        </div>
      )}
    </Section>
  );
}
