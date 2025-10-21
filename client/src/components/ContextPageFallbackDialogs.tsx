import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ManualServiceUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (exampleUrl: string) => Promise<void>;
}

export function ManualServiceUrlDialog({ open, onOpenChange, onSubmit }: ManualServiceUrlDialogProps) {
  const [exampleUrl, setExampleUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!exampleUrl.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(exampleUrl);
      onOpenChange(false);
      setExampleUrl("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    setExampleUrl("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-100">
            No Service Pages Found
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 space-y-3">
            <p>
              We couldn't automatically find any service or product pages on your website after crawling {" "}
              up to 250 pages.
            </p>
            <p className="font-semibold text-blue-400">
              Help us find them:
            </p>
            <p>
              Provide the URL of <strong>one example service page</strong> from your website. We'll analyze its URL pattern (like <code className="bg-gray-800 px-1 rounded">/services/web-design</code>) and automatically find all similar pages across your site that match the same structure.
            </p>
            <div className="bg-blue-950/20 border border-blue-700 rounded p-3 text-sm">
              <p className="font-semibold text-blue-300 mb-1">Example:</p>
              <p>If you provide <code className="bg-gray-800 px-1 rounded">https://example.com/services/web-design</code></p>
              <p className="mt-1">We'll find all pages like:</p>
              <ul className="list-disc list-inside ml-2 mt-1 text-gray-400">
                <li>https://example.com/services/seo</li>
                <li>https://example.com/services/branding</li>
                <li>https://example.com/services/marketing</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="example-service-url" className="text-gray-200">
            Example Service Page URL
          </Label>
          <Input
            id="example-service-url"
            data-testid="input-example-service-url"
            type="url"
            value={exampleUrl}
            onChange={(e) => setExampleUrl(e.target.value)}
            placeholder="https://yourbrand.com/services/web-design"
            className="mt-2 bg-gray-800 border-gray-700 text-white"
            disabled={isSubmitting}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleSkip}
            disabled={isSubmitting}
            className="bg-gray-700 hover:bg-gray-600 text-white"
            data-testid="button-skip-service-fallback"
          >
            Skip
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!exampleUrl.trim() || isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-submit-service-example"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finding Pages...
              </>
            ) : (
              "Find Similar Pages"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface ManualBlogUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (blogHomeUrl: string) => Promise<void>;
}

export function ManualBlogUrlDialog({ open, onOpenChange, onSubmit }: ManualBlogUrlDialogProps) {
  const [blogHomeUrl, setBlogHomeUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!blogHomeUrl.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(blogHomeUrl);
      onOpenChange(false);
      setBlogHomeUrl("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    setBlogHomeUrl("");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-100">
            No Blog Posts Found
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 space-y-3">
            <p>
              We couldn't automatically find any blog articles on your website after crawling {" "}
              up to 250 pages.
            </p>
            <p className="font-semibold text-blue-400">
              Help us find them:
            </p>
            <p>
              Provide the URL of your <strong>blog home page</strong> (the main page that lists your blog posts). We'll extract all blog post links from that page and follow pagination to collect up to 20 articles.
            </p>
            <div className="bg-blue-950/20 border border-blue-700 rounded p-3 text-sm">
              <p className="font-semibold text-blue-300 mb-1">Example:</p>
              <p>If you provide <code className="bg-gray-800 px-1 rounded">https://example.com/blog</code></p>
              <p className="mt-1">We'll:</p>
              <ul className="list-disc list-inside ml-2 mt-1 text-gray-400">
                <li>Extract all blog post links from that page</li>
                <li>Follow "Next" / pagination links (up to 5 pages)</li>
                <li>Collect up to 20 individual blog articles</li>
                <li>Skip category, tag, and archive pages</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="blog-home-url" className="text-gray-200">
            Blog Home Page URL
          </Label>
          <Input
            id="blog-home-url"
            data-testid="input-blog-home-url"
            type="url"
            value={blogHomeUrl}
            onChange={(e) => setBlogHomeUrl(e.target.value)}
            placeholder="https://yourbrand.com/blog"
            className="mt-2 bg-gray-800 border-gray-700 text-white"
            disabled={isSubmitting}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleSkip}
            disabled={isSubmitting}
            className="bg-gray-700 hover:bg-gray-600 text-white"
            data-testid="button-skip-blog-fallback"
          >
            Skip
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={!blogHomeUrl.trim() || isSubmitting}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-submit-blog-home"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting Posts...
              </>
            ) : (
              "Extract Blog Posts"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
