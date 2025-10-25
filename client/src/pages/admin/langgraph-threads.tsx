import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  GitBranch, 
  RefreshCw, 
  Calendar,
  Search,
  Eye,
  XCircle,
  Trash2,
  Clock,
  User,
  FileText,
  Activity,
  AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ThreadUser {
  email: string;
}

interface LanggraphThread {
  id: string;
  userId: string;
  sessionId: string | null;
  status: string;
  lastCheckpointId: string | null;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  user: ThreadUser;
}

interface ThreadDetails {
  thread: LanggraphThread;
  checkpoints: any[];
  aiLogs: any[];
}

export default function LanggraphThreadsAdmin() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [timeRangeFilter, setTimeRangeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; threadId: string | null }>({ 
    open: false, 
    threadId: null 
  });
  
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; thread: LanggraphThread | null }>({ 
    open: false, 
    thread: null 
  });
  
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; thread: LanggraphThread | null }>({ 
    open: false, 
    thread: null 
  });

  const { toast } = useToast();

  // Calculate date range from filter
  const getDateRange = () => {
    const now = new Date();
    let startDate: string | undefined;
    
    switch (timeRangeFilter) {
      case "hour":
        startDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
        break;
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        startDate = undefined;
    }
    
    return { startDate };
  };

  // Fetch threads with filters
  const { data: threads, isLoading, error, refetch } = useQuery<LanggraphThread[]>({
    queryKey: ["/api/admin/langgraph-threads", statusFilter, timeRangeFilter, appliedSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      const { startDate } = getDateRange();
      if (startDate) {
        params.append("startDate", startDate);
      }
      
      if (appliedSearch) {
        params.append("search", appliedSearch);
      }
      
      const response = await fetch(`/api/admin/langgraph-threads?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  // Fetch thread details
  const { data: threadDetails, isLoading: isLoadingDetails } = useQuery<ThreadDetails>({
    queryKey: ["/api/admin/langgraph-threads", detailsDialog.threadId],
    enabled: !!detailsDialog.threadId,
    queryFn: async () => {
      const response = await fetch(`/api/admin/langgraph-threads/${detailsDialog.threadId}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  // Cancel thread mutation
  const cancelMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const response = await fetch(`/api/admin/langgraph-threads/${threadId}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Thread cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/langgraph-threads"] });
      setCancelDialog({ open: false, thread: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to cancel thread: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete thread mutation
  const deleteMutation = useMutation({
    mutationFn: async (threadId: string) => {
      const response = await fetch(`/api/admin/langgraph-threads/${threadId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Thread deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/langgraph-threads"] });
      setDeleteDialog({ open: false, thread: null });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete thread: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSearch = () => {
    setAppliedSearch(searchQuery);
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setTimeRangeFilter("all");
    setSearchQuery("");
    setAppliedSearch("");
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case "active":
        return "bg-blue-600";
      case "paused":
        return "bg-yellow-600";
      case "completed":
        return "bg-green-600";
      case "error":
      case "failed":
        return "bg-red-600";
      case "cancelled":
        return "bg-gray-600";
      default:
        return "bg-gray-600";
    }
  };

  const formatAge = (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "Unknown";
    }
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading threads: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2" data-testid="heading-thread-monitor">
            <GitBranch className="h-8 w-8" />
            LangGraph Thread Monitor
          </h1>
          <p className="text-gray-400">
            Monitor and manage all LangGraph workflow threads across users
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Filters
            </CardTitle>
            <CardDescription>Filter threads by status, time range, and search</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Time Range</label>
                <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
                  <SelectTrigger className="bg-gray-800 border-gray-700" data-testid="select-time-range">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="hour">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Search</label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Email or Thread ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="bg-gray-800 border-gray-700"
                    data-testid="input-search"
                  />
                  <Button 
                    onClick={handleSearch}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="button-search"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-end gap-2">
                <Button 
                  onClick={handleClearFilters}
                  variant="outline"
                  className="border-gray-700"
                  data-testid="button-clear-filters"
                >
                  Clear
                </Button>
                <Button 
                  onClick={() => refetch()}
                  variant="outline"
                  className="border-gray-700"
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Threads Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Threads
            </CardTitle>
            <CardDescription>
              {isLoading ? "Loading..." : `${threads?.length || 0} thread(s) found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading threads...</p>
              </div>
            ) : threads && threads.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Thread ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">User Email</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Current Step</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Session ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Age</th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {threads.map((thread) => (
                      <tr key={thread.id} className="border-b border-gray-800 hover:bg-gray-800/50" data-testid={`row-thread-${thread.id}`}>
                        <td className="py-3 px-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <span className="font-mono text-sm">{thread.id.substring(0, 8)}...</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{thread.id}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{thread.user.email}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${getStatusBadgeColor(thread.status)} text-white`} data-testid={`badge-status-${thread.id}`}>
                            {thread.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-300">
                          {thread.metadata?.currentStep || "N/A"}
                        </td>
                        <td className="py-3 px-4">
                          {thread.sessionId ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="font-mono text-sm text-indigo-400">{thread.sessionId.substring(0, 8)}...</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{thread.sessionId}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-gray-500 text-sm">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="flex items-center gap-2 text-sm text-gray-300">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {formatAge(thread.createdAt)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-700"
                              onClick={() => setDetailsDialog({ open: true, threadId: thread.id })}
                              data-testid={`button-view-details-${thread.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            {thread.status !== "cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-yellow-700 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                                onClick={() => setCancelDialog({ open: true, thread })}
                                data-testid={`button-cancel-${thread.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-700 text-red-500 hover:bg-red-500 hover:text-white"
                              onClick={() => setDeleteDialog({ open: true, thread })}
                              data-testid={`button-delete-${thread.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold text-white mb-2">No threads found</h3>
                <p className="text-gray-400">Try adjusting your filters or search query</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thread Details Dialog */}
        <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ open, threadId: open ? detailsDialog.threadId : null })}>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Thread Details
              </DialogTitle>
              <DialogDescription>
                Complete thread information, checkpoints, and AI usage logs
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingDetails ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-gray-400 mt-2">Loading details...</p>
              </div>
            ) : threadDetails ? (
              <div className="space-y-6">
                {/* Thread Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Thread Information</h3>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-400">Thread ID:</span>
                        <p className="font-mono text-white">{threadDetails.thread.id}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">User:</span>
                        <p className="text-white">{threadDetails.thread.user.email}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <p>
                          <Badge className={`${getStatusBadgeColor(threadDetails.thread.status)} text-white mt-1`}>
                            {threadDetails.thread.status}
                          </Badge>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">Created:</span>
                        <p className="text-white">{new Date(threadDetails.thread.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">Metadata</h3>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <pre className="text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(threadDetails.thread.metadata, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Checkpoints */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">
                    Checkpoints ({threadDetails.checkpoints.length})
                  </h3>
                  {threadDetails.checkpoints.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {threadDetails.checkpoints.map((checkpoint, idx) => (
                        <div key={checkpoint.id} className="bg-gray-800 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-sm text-indigo-400">{checkpoint.checkpointId}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(checkpoint.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-400 hover:text-white">
                              View checkpoint data
                            </summary>
                            <pre className="mt-2 text-gray-300 overflow-x-auto">
                              {JSON.stringify(checkpoint.stateData, null, 2)}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No checkpoints found</p>
                  )}
                </div>

                {/* AI Logs */}
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-white">
                    AI Usage Logs ({threadDetails.aiLogs.length})
                  </h3>
                  {threadDetails.aiLogs.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {threadDetails.aiLogs.map((log, idx) => (
                        <div key={log.id} className="bg-gray-800 rounded-lg p-3 text-sm">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-indigo-400 font-medium">{log.provider}</span>
                              <span className="text-gray-500 ml-2">{log.endpoint}</span>
                            </div>
                            <div className="text-right text-xs">
                              <div className="text-green-400">${log.estimatedCost}</div>
                              <div className="text-gray-500">{log.totalTokens} tokens</div>
                            </div>
                          </div>
                          {log.success === false && log.errorMessage && (
                            <div className="mt-2 text-red-400 text-xs">
                              Error: {log.errorMessage}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No AI logs found</p>
                  )}
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, thread: open ? cancelDialog.thread : null })}>
          <AlertDialogContent className="bg-gray-900 border-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Thread?</AlertDialogTitle>
              <AlertDialogDescription>
                This will cancel the workflow execution for thread <span className="font-mono text-yellow-500">{cancelDialog.thread?.id.substring(0, 8)}...</span>
                <br />
                The thread status will be updated to "cancelled".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700">No, keep it</AlertDialogCancel>
              <AlertDialogAction
                className="bg-yellow-600 hover:bg-yellow-700"
                onClick={() => {
                  if (cancelDialog.thread) {
                    cancelMutation.mutate(cancelDialog.thread.id);
                  }
                }}
                data-testid="button-confirm-cancel"
              >
                Yes, cancel thread
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, thread: open ? deleteDialog.thread : null })}>
          <AlertDialogContent className="bg-gray-900 border-gray-800">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Thread?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete thread <span className="font-mono text-red-500">{deleteDialog.thread?.id.substring(0, 8)}...</span> and all its checkpoints.
                <br />
                <strong className="text-red-500">This action cannot be undone.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-gray-700">Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (deleteDialog.thread) {
                    deleteMutation.mutate(deleteDialog.thread.id);
                  }
                }}
                data-testid="button-confirm-delete"
              >
                Yes, delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
