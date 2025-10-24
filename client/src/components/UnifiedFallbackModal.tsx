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

interface UnifiedFallbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTagCrawledPages: () => void;
  onAddManually: () => void;
  missingPages: {
    about?: boolean;
    products?: boolean;
    blogs?: boolean;
  };
}

export function UnifiedFallbackModal({
  open,
  onOpenChange,
  onTagCrawledPages,
  onAddManually,
  missingPages,
}: UnifiedFallbackModalProps) {
  const missingCount = Object.values(missingPages).filter(Boolean).length;
  const missingList = [];
  
  if (missingPages.about) missingList.push("About page");
  if (missingPages.products) missingList.push("Product/Service pages");
  if (missingPages.blogs) missingList.push("Blog articles");

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-gray-900 border-gray-700 max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-100">
            Could Not Find Some Pages
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 space-y-3">
            <p>
              We crawled up to 250 pages but couldn't automatically find:
            </p>
            <ul className="list-disc list-inside ml-2 text-gray-400">
              {missingList.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="font-semibold text-blue-400 mt-4">
              What would you like to do?
            </p>
            <div className="space-y-2">
              <div className="bg-blue-950/20 border border-blue-700 rounded p-3 text-sm">
                <p className="font-semibold text-blue-300 mb-1">Option 1: Tag Crawled Pages</p>
                <p className="text-gray-400">
                  Review all crawled URLs and manually classify them by selecting
                  "About", "Blog", or "Product/Service" from the dropdown next to each URL.
                  You'll need to tag at least one page for each missing category.
                </p>
              </div>
              <div className="bg-gray-800 border border-gray-600 rounded p-3 text-sm">
                <p className="font-semibold text-gray-300 mb-1">Option 2: Add Manually</p>
                <p className="text-gray-400">
                  Go to the brand context editor and manually enter the URLs.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="bg-gray-700 hover:bg-gray-600 text-white"
            data-testid="button-cancel-fallback"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onAddManually}
            className="bg-gray-600 hover:bg-gray-700 text-white"
            data-testid="button-add-manually"
          >
            Add Manually
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onTagCrawledPages}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            data-testid="button-tag-crawled"
          >
            Tag Crawled Pages
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
