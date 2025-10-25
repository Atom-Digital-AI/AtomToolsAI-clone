import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Cpu, 
  DollarSign, 
  Activity, 
  TrendingUp,
  RefreshCw,
  Calendar,
  Zap,
  BarChart3,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface AIUsageSummary {
  overall: {
    total_calls: number;
    total_tokens: number;
    total_cost: string;
  };
  byProvider: Array<{
    provider: string;
    call_count: number;
    total_tokens: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_cost: string;
    avg_duration_ms: number;
  }>;
  byEndpoint: Array<{
    endpoint: string;
    provider: string;
    call_count: number;
    total_tokens: number;
    total_cost: string;
  }>;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}

interface LanggraphMetrics {
  overall: {
    total_threads: number;
    completed_threads: number;
    failed_threads: number;
    paused_threads: number;
    avg_execution_time_ms: number | null;
  };
  quality: {
    avg_brand_score: number | null;
    avg_fact_score: number | null;
    avg_regeneration_count: number | null;
    percentage_regenerated: number;
    percentage_requiring_review: number;
  };
  perNode: Array<{
    endpoint: string;
    call_count: number;
    total_tokens: number;
    total_cost: number;
    avg_duration_ms: number;
    success_rate: number;
  }>;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
}

export default function AIAnalytics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ start: "", end: "" });

  const { data: summary, isLoading, error, refetch } = useQuery<AIUsageSummary>({
    queryKey: ["/api/admin/ai-usage-summary", appliedFilters.start, appliedFilters.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.start) params.append("startDate", appliedFilters.start);
      if (appliedFilters.end) params.append("endDate", appliedFilters.end);
      
      const response = await fetch(`/api/admin/ai-usage-summary?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const { data: langgraphMetrics, isLoading: isLoadingLanggraph, error: langgraphError, refetch: refetchLanggraph } = useQuery<LanggraphMetrics>({
    queryKey: ["/api/admin/langgraph-metrics", appliedFilters.start, appliedFilters.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (appliedFilters.start) params.append("startDate", appliedFilters.start);
      if (appliedFilters.end) params.append("endDate", appliedFilters.end);
      
      const response = await fetch(`/api/admin/langgraph-metrics?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
  });

  const handleApplyFilters = () => {
    setAppliedFilters({ start: startDate, end: endDate });
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setAppliedFilters({ start: "", end: "" });
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(numValue);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDuration = (ms: number | null) => {
    if (ms === null) return "N/A";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  };

  const getScoreBadgeColor = (score: number | null): string => {
    if (score === null) return "bg-gray-600";
    if (score >= 0.8) return "bg-green-600";
    if (score >= 0.6) return "bg-yellow-600";
    return "bg-red-600";
  };

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Error loading AI analytics: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="heading-ai-analytics">
            AI Usage Analytics
          </h1>
          <p className="text-gray-400">
            Monitor token usage, costs, and performance across all AI API calls
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range Filter
            </CardTitle>
            <CardDescription>Filter analytics by date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-400 mb-2 block">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                  data-testid="input-start-date"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm text-gray-400 mb-2 block">End Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-800 border-gray-700"
                  data-testid="input-end-date"
                />
              </div>
              <Button 
                onClick={handleApplyFilters}
                className="bg-indigo-600 hover:bg-indigo-700"
                data-testid="button-apply-filters"
              >
                Apply Filters
              </Button>
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
          </CardContent>
        </Card>

        {/* Overall Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total AI Calls</CardTitle>
              <Activity className="h-4 w-4 text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-calls">
                {isLoading ? "..." : formatNumber(summary?.overall.total_calls || 0)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                API requests processed
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
              <Cpu className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-tokens">
                {isLoading ? "..." : formatNumber(summary?.overall.total_tokens || 0)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Prompt + Completion tokens
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400" data-testid="text-total-cost">
                {isLoading ? "..." : formatCurrency(summary?.overall.total_cost || 0)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Estimated AI spend
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Provider Breakdown */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Cost Breakdown by Provider
            </CardTitle>
            <CardDescription>AI usage and costs grouped by provider (OpenAI, Anthropic)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Provider</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">API Calls</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Total Tokens</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Prompt Tokens</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Completion Tokens</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Avg Duration (ms)</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td>
                    </tr>
                  ) : summary?.byProvider.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400">No data available</td>
                    </tr>
                  ) : (
                    summary?.byProvider.map((provider, index) => (
                      <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50" data-testid={`row-provider-${provider.provider}`}>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-2">
                            <Zap className="h-4 w-4 text-indigo-400" />
                            <span className="font-medium capitalize">{provider.provider}</span>
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">{formatNumber(provider.call_count)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(provider.total_tokens)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(provider.total_prompt_tokens)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(provider.total_completion_tokens)}</td>
                        <td className="text-right py-3 px-4">{Math.round(provider.avg_duration_ms)}</td>
                        <td className="text-right py-3 px-4 font-medium text-green-400">
                          {formatCurrency(provider.total_cost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Tool/Endpoint Breakdown */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cost Breakdown by Tool/Endpoint
            </CardTitle>
            <CardDescription>Top 20 endpoints by cost - individual tool executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Tool/Endpoint</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Provider</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">API Calls</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Total Tokens</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td>
                    </tr>
                  ) : summary?.byEndpoint.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-400">No data available</td>
                    </tr>
                  ) : (
                    summary?.byEndpoint.map((endpoint, index) => (
                      <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50" data-testid={`row-endpoint-${endpoint.endpoint}`}>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm">{endpoint.endpoint}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm capitalize text-gray-400">{endpoint.provider}</span>
                        </td>
                        <td className="text-right py-3 px-4">{formatNumber(endpoint.call_count)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(endpoint.total_tokens)}</td>
                        <td className="text-right py-3 px-4 font-medium text-green-400">
                          {formatCurrency(endpoint.total_cost)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* LangGraph Workflow Metrics Section */}
        <div className="mb-6 pt-8 border-t border-gray-800">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-purple-400" />
            LangGraph Workflow Metrics
          </h2>
          <p className="text-gray-400 mb-6">
            Track Content Writer workflow execution statistics, quality scores, and per-node performance
          </p>
        </div>

        {/* LangGraph Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
              <GitBranch className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-langgraph-total-threads">
                {isLoadingLanggraph ? "..." : formatNumber(langgraphMetrics?.overall.total_threads || 0)}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Workflow threads created
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400" data-testid="text-langgraph-completion-rate">
                {isLoadingLanggraph ? "..." : langgraphMetrics?.overall.total_threads 
                  ? `${((langgraphMetrics.overall.completed_threads / langgraphMetrics.overall.total_threads) * 100).toFixed(1)}%`
                  : "0%"
                }
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {isLoadingLanggraph ? "..." : `${langgraphMetrics?.overall.completed_threads || 0} / ${langgraphMetrics?.overall.total_threads || 0} completed`}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Regeneration</CardTitle>
              <RefreshCw className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-langgraph-avg-regen">
                {isLoadingLanggraph ? "..." : langgraphMetrics?.quality.avg_regeneration_count 
                  ? langgraphMetrics.quality.avg_regeneration_count.toFixed(2)
                  : "0"
                }
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Iterations per article
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Requiring Review</CardTitle>
              <Clock className="h-4 w-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-400" data-testid="text-langgraph-review-pct">
                {isLoadingLanggraph ? "..." : `${langgraphMetrics?.quality.percentage_requiring_review.toFixed(1) || 0}%`}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {isLoadingLanggraph ? "..." : `${langgraphMetrics?.overall.paused_threads || 0} paused threads`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quality Scores Card */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Quality Scores
            </CardTitle>
            <CardDescription>Average brand alignment and fact verification scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-400 mb-2">Average Brand Score</div>
                <div className="flex items-center gap-3">
                  <Badge className={`${getScoreBadgeColor(langgraphMetrics?.quality.avg_brand_score || null)} text-white px-3 py-1`} data-testid="badge-brand-score">
                    {isLoadingLanggraph ? "..." : langgraphMetrics?.quality.avg_brand_score 
                      ? (langgraphMetrics.quality.avg_brand_score * 100).toFixed(1) + "%"
                      : "N/A"
                    }
                  </Badge>
                  <span className="text-2xl font-bold">
                    {isLoadingLanggraph ? "..." : langgraphMetrics?.quality.avg_brand_score 
                      ? (langgraphMetrics.quality.avg_brand_score * 100).toFixed(1)
                      : "N/A"
                    }
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2">Average Fact Score</div>
                <div className="flex items-center gap-3">
                  <Badge className={`${getScoreBadgeColor(langgraphMetrics?.quality.avg_fact_score || null)} text-white px-3 py-1`} data-testid="badge-fact-score">
                    {isLoadingLanggraph ? "..." : langgraphMetrics?.quality.avg_fact_score 
                      ? (langgraphMetrics.quality.avg_fact_score * 100).toFixed(1) + "%"
                      : "N/A"
                    }
                  </Badge>
                  <span className="text-2xl font-bold">
                    {isLoadingLanggraph ? "..." : langgraphMetrics?.quality.avg_fact_score 
                      ? (langgraphMetrics.quality.avg_fact_score * 100).toFixed(1)
                      : "N/A"
                    }
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2">Articles Regenerated</div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-yellow-600 text-white px-3 py-1" data-testid="badge-regenerated-pct">
                    {isLoadingLanggraph ? "..." : `${langgraphMetrics?.quality.percentage_regenerated.toFixed(1) || 0}%`}
                  </Badge>
                  <span className="text-2xl font-bold">
                    {isLoadingLanggraph ? "..." : `${langgraphMetrics?.quality.percentage_regenerated.toFixed(1) || 0}%`}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-Node Performance Card */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Per-Node Performance
            </CardTitle>
            <CardDescription>Performance metrics for each workflow node (sorted by cost)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">Node Name</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">API Calls</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Tokens</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Cost</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Avg Duration</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingLanggraph ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td>
                    </tr>
                  ) : langgraphMetrics?.perNode.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">No data available</td>
                    </tr>
                  ) : (
                    langgraphMetrics?.perNode.map((node, index) => (
                      <tr key={index} className="border-b border-gray-800 hover:bg-gray-800/50" data-testid={`row-node-${node.endpoint}`}>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm">{node.endpoint}</span>
                        </td>
                        <td className="text-right py-3 px-4">{formatNumber(node.call_count)}</td>
                        <td className="text-right py-3 px-4">{formatNumber(node.total_tokens)}</td>
                        <td className="text-right py-3 px-4 font-medium text-green-400">
                          {formatCurrency(node.total_cost)}
                        </td>
                        <td className="text-right py-3 px-4">{formatDuration(node.avg_duration_ms)}</td>
                        <td className="text-right py-3 px-4">
                          <Badge className={node.success_rate >= 95 ? "bg-green-600" : node.success_rate >= 80 ? "bg-yellow-600" : "bg-red-600"}>
                            {node.success_rate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
