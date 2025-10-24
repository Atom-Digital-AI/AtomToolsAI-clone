import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CrawledUrl {
  url: string;
  title: string;
}

interface UrlTaggingPageProps {
  crawledUrls: CrawledUrl[];
  onSubmit: (taggedUrls: { about?: string; products: string[]; blogs: string[] }) => void;
  onBack: () => void;
  missingPages: {
    about?: boolean;
    products?: boolean;
    blogs?: boolean;
  };
}

type PageType = "untagged" | "about" | "blog" | "product";

export default function UrlTaggingPage({
  crawledUrls,
  onSubmit,
  onBack,
  missingPages,
}: UrlTaggingPageProps) {
  const { toast } = useToast();
  const [tags, setTags] = useState<Record<string, PageType>>(
    Object.fromEntries(crawledUrls.map(u => [u.url, "untagged" as PageType]))
  );

  const handleTagChange = (url: string, tag: PageType) => {
    // If tagging as "about", untag any existing about page
    if (tag === "about") {
      const newTags = { ...tags };
      Object.keys(newTags).forEach(key => {
        if (newTags[key] === "about" && key !== url) {
          newTags[key] = "untagged";
        }
      });
      newTags[url] = tag;
      setTags(newTags);
    } else {
      setTags(prev => ({ ...prev, [url]: tag }));
    }
  };

  const handleSubmit = () => {
    const about = Object.keys(tags).find(url => tags[url] === "about");
    const products = Object.keys(tags).filter(url => tags[url] === "product");
    const blogs = Object.keys(tags).filter(url => tags[url] === "blog");

    // Check if we have at least one of each required page type
    const errors = [];
    if (missingPages.about && !about) {
      errors.push("Please select at least one About page");
    }
    if (missingPages.products && products.length === 0) {
      errors.push("Please select at least one Product/Service page");
    }
    if (missingPages.blogs && blogs.length === 0) {
      errors.push("Please select at least one Blog article");
    }

    if (errors.length > 0) {
      toast({
        title: "Missing Required Pages",
        description: errors.join(". "),
        variant: "destructive",
      });
      return;
    }

    onSubmit({ about, products, blogs });
  };

  const stats = {
    about: Object.values(tags).filter(t => t === "about").length,
    products: Object.values(tags).filter(t => t === "product").length,
    blogs: Object.values(tags).filter(t => t === "blog").length,
  };

  const requirementsMet = {
    about: !missingPages.about || stats.about >= 1,
    products: !missingPages.products || stats.products >= 1,
    blogs: !missingPages.blogs || stats.blogs >= 1,
  };

  const getUrlPath = (fullUrl: string): string => {
    try {
      const url = new URL(fullUrl);
      return url.pathname + url.search + url.hash;
    } catch {
      return fullUrl;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-[90%] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-400 hover:text-white"
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Manual Entry
            </Button>
            <p className="text-gray-400">
              Review and classify the {crawledUrls.length} crawled URLs to help us understand your website structure.
            </p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!Object.values(requirementsMet).every(Boolean)}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-submit-tags"
          >
            Submit Tagged URLs
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border-2 ${requirementsMet.about ? 'bg-green-950/30 border-green-700' : 'bg-gray-900 border-gray-700'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">About Page</p>
                <p className="text-2xl font-bold">{stats.about}</p>
                <p className="text-xs text-gray-500">
                  {missingPages.about ? "Required: at least 1" : "Not required"}
                </p>
              </div>
              {requirementsMet.about && <Check className="w-6 h-6 text-green-500" />}
            </div>
          </div>
          <div className={`p-4 rounded-lg border-2 ${requirementsMet.products ? 'bg-green-950/30 border-green-700' : 'bg-gray-900 border-gray-700'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Product/Service Pages</p>
                <p className="text-2xl font-bold">{stats.products}</p>
                <p className="text-xs text-gray-500">
                  {missingPages.products ? "Required: at least 1" : "Not required"}
                </p>
              </div>
              {requirementsMet.products && <Check className="w-6 h-6 text-green-500" />}
            </div>
          </div>
          <div className={`p-4 rounded-lg border-2 ${requirementsMet.blogs ? 'bg-green-950/30 border-green-700' : 'bg-gray-900 border-gray-700'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Blog Articles</p>
                <p className="text-2xl font-bold">{stats.blogs}</p>
                <p className="text-xs text-gray-500">
                  {missingPages.blogs ? "Required: at least 1" : "Not required"}
                </p>
              </div>
              {requirementsMet.blogs && <Check className="w-6 h-6 text-green-500" />}
            </div>
          </div>
        </div>

        {/* URL Table */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-16">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">URL</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Page Title</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-48">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {crawledUrls.map((crawledUrl, index) => (
                  <tr
                    key={crawledUrl.url}
                    className="hover:bg-gray-800/50 transition-colors"
                    data-testid={`row-url-${index}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-blue-400 font-mono truncate max-w-md" title={crawledUrl.url}>
                      {getUrlPath(crawledUrl.url)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 truncate max-w-xs" title={crawledUrl.title}>
                      {crawledUrl.title || <span className="text-gray-600 italic">No title</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={tags[crawledUrl.url]}
                        onValueChange={(value) => handleTagChange(crawledUrl.url, value as PageType)}
                      >
                        <SelectTrigger
                          className="w-full bg-gray-800 border-gray-700 text-white"
                          data-testid={`select-tag-${index}`}
                        >
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="untagged" className="text-gray-400">
                            Untagged
                          </SelectItem>
                          <SelectItem value="about" className="text-green-400">
                            About
                          </SelectItem>
                          <SelectItem value="blog" className="text-blue-400">
                            Blog
                          </SelectItem>
                          <SelectItem value="product" className="text-purple-400">
                            Product/Service
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
