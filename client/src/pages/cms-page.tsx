import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Tag } from "lucide-react";
import type { CmsPage } from "@shared/schema";
import ReactMarkdown from "react-markdown";
import { BlockRenderer } from "@/components/admin/BlockRenderer";

interface CmsPageDisplayProps {
  slug: string;
}

function CmsPageDisplay({ slug }: CmsPageDisplayProps) {
  const { data: page, isLoading, error } = useQuery<CmsPage>({
    queryKey: [`/api/public/pages/${slug}`],
    queryFn: async () => {
      const response = await fetch(`/api/public/pages/${slug}`);
      if (!response.ok) {
        throw new Error(`Page not found: ${response.status}`);
      }
      return response.json();
    },
    retry: false,
  });

  // Update document title and meta tags when page loads
  useEffect(() => {
    if (page) {
      // Update title
      document.title = page.metaTitle || page.title || "atomtools.ai";
      
      // Update meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", page.metaDescription || page.excerpt || "");
      } else if (page.metaDescription || page.excerpt) {
        const meta = document.createElement("meta");
        meta.name = "description";
        meta.content = page.metaDescription || page.excerpt || "";
        document.head.appendChild(meta);
      }

      // Update Open Graph tags
      if (page.ogTitle) {
        updateMetaTag("property", "og:title", page.ogTitle);
      }
      if (page.ogDescription) {
        updateMetaTag("property", "og:description", page.ogDescription);
      }
      if (page.ogImage) {
        updateMetaTag("property", "og:image", page.ogImage);
      }
      if (page.ogType) {
        updateMetaTag("property", "og:type", page.ogType);
      }

      // Update Twitter Card tags
      if (page.twitterCard) {
        updateMetaTag("name", "twitter:card", page.twitterCard);
      }
      if (page.twitterTitle) {
        updateMetaTag("name", "twitter:title", page.twitterTitle);
      }
      if (page.twitterDescription) {
        updateMetaTag("name", "twitter:description", page.twitterDescription);
      }
      if (page.twitterImage) {
        updateMetaTag("name", "twitter:image", page.twitterImage);
      }

      // Update canonical URL
      if (page.canonicalUrl) {
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
          canonical.setAttribute("href", page.canonicalUrl);
        } else {
          const link = document.createElement("link");
          link.rel = "canonical";
          link.href = page.canonicalUrl;
          document.head.appendChild(link);
        }
      }

      // Update robots meta
      if (page.robotsMeta) {
        updateMetaTag("name", "robots", page.robotsMeta);
      }
    }
  }, [page]);

  const updateMetaTag = (attribute: string, name: string, content: string) => {
    const existing = document.querySelector(`meta[${attribute}="${name}"]`);
    if (existing) {
      existing.setAttribute("content", content);
    } else {
      const meta = document.createElement("meta");
      meta.setAttribute(attribute, name);
      meta.setAttribute("content", content);
      document.head.appendChild(meta);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Page Not Found</h1>
          <p className="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
          <a 
            href="/" 
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Featured Image */}
        {page.featuredImage && (
          <div className="mb-8">
            <img
              src={page.featuredImage}
              alt={page.title}
              className="w-full h-64 md:h-96 object-cover rounded-lg"
            />
          </div>
        )}

        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge
              variant="outline"
              className={`${
                page.type === "blog"
                  ? "text-purple-400 border-purple-400"
                  : page.type === "resource"
                  ? "text-orange-400 border-orange-400"
                  : "text-blue-400 border-blue-400"
              }`}
            >
              <Tag className="w-3 h-3 mr-1" />
              {page.type.charAt(0).toUpperCase() + page.type.slice(1)}
            </Badge>
            
            {page.publishedAt && (
              <div className="flex items-center text-gray-400 text-sm">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(page.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {page.title}
          </h1>

          {page.excerpt && (
            <p className="text-xl text-gray-300 leading-relaxed">
              {page.excerpt}
            </p>
          )}
        </header>

        {/* Page Content */}
        <main className="px-4 md:px-0">
          <div className="max-w-4xl mx-auto">
            <BlockRenderer content={page.content} />
          </div>
        </main>

        {/* Page Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center">
              <User className="w-4 h-4 mr-1" />
              Published by atomtools.ai
            </div>
            <div>
              Last updated: {new Date(page.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Homepage component that uses CMS data
export function CmsHomePage() {
  return <CmsPageDisplay slug="/" />;
}

// Dynamic page component that extracts slug from URL
export default function DynamicCmsPage() {
  const [match, params] = useRoute("/:slug*");
  
  if (!match || !params?.["slug*"]) {
    return null;
  }

  // Convert the slug to match the expected format
  const rawSlug = params["slug*"];
  const slug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;
  
  return <CmsPageDisplay slug={slug} />;
}