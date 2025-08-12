import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Target, 
  Globe, 
  FileText, 
  Zap, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface UsageStats {
  productId: string;
  productName: string;
  currentUsage: number;
  limit: number;
  period: string;
  subfeatures: Record<string, boolean>;
  remaining: number;
}

interface UsageStatsResponse {
  usageStats: UsageStats[];
  hasActiveTier: boolean;
  tierName?: string;
  tierId?: string;
}

export default function UsageStatsDisplay() {
  const { data: usageData, isLoading } = useQuery<UsageStatsResponse>({
    queryKey: ['/api/user/usage-stats'],
  });

  const getProductIcon = (productName: string) => {
    if (productName.toLowerCase().includes('seo')) {
      return <Globe className="h-5 w-5 text-green-400" />;
    }
    if (productName.toLowerCase().includes('ads') || productName.toLowerCase().includes('google')) {
      return <Target className="h-5 w-5 text-blue-400" />;
    }
    if (productName.toLowerCase().includes('content')) {
      return <FileText className="h-5 w-5 text-purple-400" />;
    }
    return <Zap className="h-5 w-5 text-indigo-400" />;
  };

  const getUsageColor = (currentUsage: number, limit: number) => {
    const percentage = limit > 0 ? (currentUsage / limit) * 100 : 0;
    if (percentage >= 90) return 'text-red-400';
    if (percentage >= 75) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getProgressColor = (currentUsage: number, limit: number) => {
    const percentage = limit > 0 ? (currentUsage / limit) * 100 : 0;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  if (isLoading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              <div className="h-12 bg-gray-700 rounded"></div>
              <div className="h-12 bg-gray-700 rounded"></div>
              <div className="h-12 bg-gray-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageData?.hasActiveTier) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-white">
            <BarChart3 className="h-5 w-5" />
            <span>Usage & Limits</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Active Subscription</h3>
            <p className="text-gray-400 mb-4">
              Subscribe to a package to start using our AI tools and track your usage.
            </p>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              View Packages
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Usage & Limits</span>
          </div>
          <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
            {usageData.tierName}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {usageData.usageStats.map((stat) => {
            const percentage = stat.limit > 0 ? (stat.currentUsage / stat.limit) * 100 : 0;
            
            return (
              <div 
                key={stat.productId} 
                className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getProductIcon(stat.productName)}
                    <div>
                      <h4 className="font-medium text-white">{stat.productName}</h4>
                      <p className="text-xs text-gray-400 capitalize">{stat.period} limit</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${getUsageColor(stat.currentUsage, stat.limit)}`}>
                      {formatNumber(stat.currentUsage)} / {formatNumber(stat.limit)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatNumber(stat.remaining)} remaining
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Progress 
                    value={percentage} 
                    className="h-2 bg-gray-700"
                    data-testid={`progress-${stat.productId}`}
                  />
                  
                  {/* Subfeatures */}
                  {Object.keys(stat.subfeatures).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.entries(stat.subfeatures).map(([feature, enabled]) => (
                        <Badge
                          key={feature}
                          variant={enabled ? "default" : "secondary"}
                          className={
                            enabled 
                              ? "bg-green-500/20 text-green-400 border-green-500/30" 
                              : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          }
                        >
                          {enabled ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {percentage >= 90 && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Approaching usage limit</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-gray-300">Need more usage?</span>
            </div>
            <Button 
              size="sm" 
              className="bg-indigo-600 hover:bg-indigo-700"
              data-testid="button-upgrade-plan"
            >
              Upgrade Plan
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}