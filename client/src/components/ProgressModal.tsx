import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, X, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CrawlJobStatus {
  id: string;
  status: string;
  progress: number;
  results: {
    home_page: string;
    about_page: string;
    service_pages: string[];
    blog_articles: string[];
    totalPagesCrawled: number;
    reachedLimit: boolean;
  } | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface ProgressModalProps {
  jobId: string | null;
  open: boolean;
  onClose: () => void;
  onComplete?: (results: CrawlJobStatus['results']) => void;
}

export function ProgressModal({ jobId, open, onClose, onComplete }: ProgressModalProps) {
  const [runningInBackground, setRunningInBackground] = useState(false);
  const queryClient = useQueryClient();

  // Poll for job status every second
  const { data: jobStatus, isLoading } = useQuery<CrawlJobStatus>({
    queryKey: ['/api/crawl', jobId, 'status'],
    enabled: !!jobId && open,
    refetchInterval: (data) => {
      // Stop polling if job is complete, failed, or cancelled
      if (!data) return 1000;
      if (['completed', 'failed', 'cancelled'].includes(data.status)) {
        return false;
      }
      return 1000; // Poll every second
    },
  });

  // Cancel job mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/crawl/${jobId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crawl', jobId, 'status'] });
    },
  });

  // Handle completion
  useEffect(() => {
    if (jobStatus?.status === 'completed' && jobStatus.results && !runningInBackground) {
      // Auto-call onComplete after a short delay to show success message
      const timer = setTimeout(() => {
        onComplete?.(jobStatus.results);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [jobStatus?.status, jobStatus?.results, runningInBackground, onComplete]);

  const handleRunInBackground = () => {
    setRunningInBackground(true);
    onClose();
  };

  const handleCancel = () => {
    if (jobStatus?.status === 'running' || jobStatus?.status === 'pending') {
      cancelMutation.mutate();
    }
    onClose();
  };

  const getStatusIcon = () => {
    if (!jobStatus) return <Loader2 className="h-6 w-6 animate-spin" />;
    
    switch (jobStatus.status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircle className="h-6 w-6 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="h-6 w-6 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-6 w-6 animate-spin text-primary" />;
      default:
        return <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    if (!jobStatus) return "Initializing...";
    
    switch (jobStatus.status) {
      case 'pending':
        return "Starting crawl...";
      case 'running':
        return "Crawling website...";
      case 'completed':
        return "Crawl completed successfully!";
      case 'failed':
        return `Crawl failed: ${jobStatus.error}`;
      case 'cancelled':
        return "Crawl cancelled";
      default:
        return jobStatus.status;
    }
  };

  const isComplete = jobStatus?.status === 'completed';
  const isFailed = jobStatus?.status === 'failed';
  const isCancelled = jobStatus?.status === 'cancelled';
  const isRunning = jobStatus?.status === 'running' || jobStatus?.status === 'pending';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-crawl-progress">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Auto Discovery Progress
          </DialogTitle>
          <DialogDescription>
            {getStatusText()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium" data-testid="text-progress-percentage">
                {jobStatus?.progress || 0}%
              </span>
            </div>
            <Progress 
              value={jobStatus?.progress || 0} 
              className="h-2" 
              data-testid="progress-bar-crawl"
            />
          </div>

          {/* Results Summary (when running or complete) */}
          {jobStatus?.results && (
            <div className="space-y-2 rounded-lg border p-3 text-sm">
              <div className="font-medium">Discovered:</div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>Home Page: {jobStatus.results.home_page ? '✓' : '—'}</div>
                <div>About Page: {jobStatus.results.about_page ? '✓' : '—'}</div>
                <div>Services: {jobStatus.results.service_pages?.length || 0}</div>
                <div>Blog Posts: {jobStatus.results.blog_articles?.length || 0}</div>
              </div>
              <div className="text-xs text-muted-foreground pt-2">
                {jobStatus.results.totalPagesCrawled} pages crawled
                {jobStatus.results.reachedLimit && " (reached limit)"}
              </div>
            </div>
          )}

          {/* Error Message */}
          {isFailed && jobStatus?.error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {jobStatus.error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            {isRunning && (
              <>
                <Button
                  variant="outline"
                  onClick={handleRunInBackground}
                  data-testid="button-run-background"
                >
                  Run in Background
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                  data-testid="button-cancel-crawl"
                >
                  {cancelMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </>
                  )}
                </Button>
              </>
            )}
            {(isComplete || isFailed || isCancelled) && (
              <Button onClick={onClose} data-testid="button-close-modal">
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
