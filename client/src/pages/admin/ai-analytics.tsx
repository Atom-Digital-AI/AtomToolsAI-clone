import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Cpu, 
  DollarSign, 
  Activity, 
  TrendingUp,
  RefreshCw,
  Calendar,
  Zap,
  BarChart3
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
        <Card className="bg-gray-900 border-gray-800">
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
      </div>
    </div>
  );
}
