import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertTriangle, 
  Search, 
  Trash2, 
  RefreshCw, 
  Calendar, 
  User, 
  Terminal,
  Bug,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import type { ErrorLog } from "@shared/schema";

interface ErrorLogsResponse {
  logs: ErrorLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ErrorLogs() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const { data: errorLogsData, isLoading, error } = useQuery<ErrorLogsResponse>({
    queryKey: ["/api/admin/error-logs", currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/admin/error-logs?page=${currentPage}&limit=50`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const clearAllLogsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/admin/error-logs");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/error-logs"] });
      toast({
        title: "Success",
        description: "All error logs have been cleared.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to clear error logs",
        variant: "destructive",
      });
    },
  });

  const deleteLogMutation = useMutation({
    mutationFn: async (logId: string) => {
      await apiRequest("DELETE", `/api/admin/error-logs/${logId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/error-logs"] });
      toast({
        title: "Success",
        description: "Error log deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete error log",
        variant: "destructive",
      });
    },
  });

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const getErrorTypeColor = (errorType: string) => {
    switch (errorType) {
      case 'rate_limit':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'validation_error':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'external_api_error':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'client_error':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'application_error':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const filteredLogs = errorLogsData?.logs?.filter(log =>
    log.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.errorMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.errorType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-text-primary">Error Logs</h1>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-surface animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-text-primary">Error Logs</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-text-secondary">
              Failed to load error logs. Please try again.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Error Logs</h1>
            <p className="text-text-secondary">Monitor and debug tool usage errors</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/error-logs"] })}
              data-testid="refresh-logs"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="destructive"
              onClick={() => clearAllLogsMutation.mutate()}
              disabled={clearAllLogsMutation.isPending}
              data-testid="clear-all-logs"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filter Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by tool, error message, user email, or error type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                data-testid="search-logs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-text-primary">
              {errorLogsData?.pagination.total || 0}
            </div>
            <p className="text-text-secondary">Total Errors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-text-primary">
              {filteredLogs.length}
            </div>
            <p className="text-text-secondary">Filtered Results</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-text-primary">
              {new Set(filteredLogs.map(log => log.toolName)).size}
            </div>
            <p className="text-text-secondary">Affected Tools</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-text-primary">
              {new Set(filteredLogs.map(log => log.userId).filter(Boolean)).size}
            </div>
            <p className="text-text-secondary">Affected Users</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Logs List */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-text-secondary py-8">
                <Bug className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No error logs found.</p>
                {searchTerm && (
                  <p className="text-sm mt-2">Try adjusting your search criteria.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredLogs.map((log) => (
            <Card key={log.id} className="border-l-4 border-l-red-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2 text-red-500" />
                        {log.toolName}
                      </CardTitle>
                      <Badge className={getErrorTypeColor(log.errorType)}>
                        {log.errorType.replace('_', ' ')}
                      </Badge>
                      {log.httpStatus && (
                        <Badge variant="outline">
                          HTTP {log.httpStatus}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {format(new Date(log.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                      </span>
                      {log.userEmail && (
                        <span className="flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {log.userEmail}
                        </span>
                      )}
                      <span className="flex items-center">
                        <Terminal className="w-3 h-3 mr-1" />
                        {log.endpoint}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpanded(log.id)}
                      data-testid={`expand-log-${log.id}`}
                    >
                      {expandedLogs.has(log.id) ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteLogMutation.mutate(log.id)}
                      disabled={deleteLogMutation.isPending}
                      data-testid={`delete-log-${log.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-text-primary mb-2">Error Message</h4>
                    <p className="text-sm text-text-secondary bg-red-500/5 p-3 rounded border border-red-500/20">
                      {log.errorMessage}
                    </p>
                  </div>

                  {expandedLogs.has(log.id) && (
                    <div className="space-y-4 border-t pt-4">
                      {log.errorStack && (
                        <div>
                          <h4 className="font-medium text-text-primary mb-2">Stack Trace</h4>
                          <Textarea
                            value={log.errorStack}
                            readOnly
                            className="h-32 font-mono text-xs"
                          />
                        </div>
                      )}

                      {log.requestData && (
                        <div>
                          <h4 className="font-medium text-text-primary mb-2">Request Data</h4>
                          <Textarea
                            value={JSON.stringify(log.requestData, null, 2)}
                            readOnly
                            className="h-32 font-mono text-xs"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {log.userAgent && (
                          <div>
                            <span className="font-medium text-text-primary">User Agent:</span>
                            <p className="text-text-secondary">{log.userAgent}</p>
                          </div>
                        )}
                        {log.ipAddress && (
                          <div>
                            <span className="font-medium text-text-primary">IP Address:</span>
                            <p className="text-text-secondary">{log.ipAddress}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {errorLogsData && errorLogsData.pagination.pages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-text-secondary">
                Page {errorLogsData.pagination.page} of {errorLogsData.pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  data-testid="prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(errorLogsData.pagination.pages, currentPage + 1))}
                  disabled={currentPage === errorLogsData.pagination.pages}
                  data-testid="next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}