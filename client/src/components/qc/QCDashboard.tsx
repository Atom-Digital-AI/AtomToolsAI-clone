import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertTriangle, XCircle, FileCheck } from "lucide-react";
import type { QCAgentType } from "@shared/schema";

interface QCAgentReport {
  agentType: QCAgentType;
  score: number;
  executionTimeMs: number;
  issues: any[];
  suggestions: any[];
  metadata?: any;
}

interface QCDashboardProps {
  reports?: {
    proofreader?: QCAgentReport;
    brandGuardian?: QCAgentReport;
    factChecker?: QCAgentReport;
    regulatory?: QCAgentReport;
  };
  overallScore?: number;
  requiresReview?: boolean;
  conflicts?: any[];
}

const agentNames: Record<QCAgentType, string> = {
  proofreader: "Proofreader",
  brand_guardian: "Brand Guardian",
  fact_checker: "Fact Checker",
  regulatory: "Regulatory Compliance",
};

const agentIcons: Record<QCAgentType, any> = {
  proofreader: FileCheck,
  brand_guardian: CheckCircle2,
  fact_checker: AlertTriangle,
  regulatory: XCircle,
};

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 70) return "text-yellow-600";
  if (score >= 50) return "text-orange-600";
  return "text-red-600";
}

function getScoreBadgeVariant(score: number): "default" | "secondary" | "destructive" {
  if (score >= 90) return "default";
  if (score >= 70) return "secondary";
  return "destructive";
}

function QCScoreCard({ agentType, report }: { agentType: QCAgentType; report?: QCAgentReport }) {
  if (!report) {
    return (
      <Card className="opacity-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="text-gray-400">?</span>
            {agentNames[agentType]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Not run</p>
        </CardContent>
      </Card>
    );
  }

  const Icon = agentIcons[agentType];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {agentNames[agentType]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold className={getScoreColor(report.score)}">
              {report.score}
            </span>
            <Badge variant={getScoreBadgeVariant(report.score)}>
              {report.score >= 90 ? "Excellent" : report.score >= 70 ? "Good" : "Needs Review"}
            </Badge>
          </div>
          <Progress value={report.score} className="h-2" />
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Issues: {report.issues?.length || 0}</div>
            <div>Suggestions: {report.suggestions?.length || 0}</div>
            <div>Time: {(report.executionTimeMs / 1000).toFixed(2)}s</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function QCDashboard({ reports, overallScore, requiresReview, conflicts }: QCDashboardProps) {
  if (!reports) {
    return null;
  }

  const hasAnyReport = Object.values(reports).some(r => r !== undefined);

  if (!hasAnyReport) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Quality Control Report</CardTitle>
            <CardDescription>
              Automated review by {Object.values(reports).filter(Boolean).length} quality agents
            </CardDescription>
          </div>
          {overallScore !== undefined && (
            <div className="text-right">
              <div className={`text-3xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div className="text-xs text-muted-foreground">Overall Score</div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Agent Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <QCScoreCard agentType="proofreader" report={reports.proofreader} />
            <QCScoreCard agentType="brand_guardian" report={reports.brandGuardian} />
            <QCScoreCard agentType="fact_checker" report={reports.factChecker} />
            <QCScoreCard agentType="regulatory" report={reports.regulatory} />
          </div>

          {/* Conflicts Warning */}
          {requiresReview && conflicts && conflicts.length > 0 && (
            <Card className="border-yellow-500 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  {conflicts.length} Conflict{conflicts.length > 1 ? 's' : ''} Requiring Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Multiple quality agents have different suggestions for the same content.
                  Please review and select your preferred options.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.values(reports).reduce((sum, r) => sum + (r?.issues?.length || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Issues Found</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Object.values(reports).reduce((sum, r) => sum + (r?.suggestions?.length || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">Suggestions Made</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(Object.values(reports).reduce((sum, r) => sum + (r?.executionTimeMs || 0), 0) / 1000).toFixed(1)}s
              </div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
