import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Download, ArrowLeft, FileText, Calendar, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import type { ContentRequest } from '@shared/schema';

export default function ContentDisplay() {
  const [, params] = useRoute('/app/content/:requestId');
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: contentRequest, isLoading, error } = useQuery<ContentRequest>({
    queryKey: ['/api/content-requests', params?.requestId],
    enabled: !!params?.requestId,
  });

  const copyToClipboard = async () => {
    if (!contentRequest?.generatedContent) return;

    try {
      await navigator.clipboard.writeText(contentRequest.generatedContent);
      setCopied(true);
      toast({
        title: 'Content Copied',
        description: 'The content has been copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy content to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const downloadAsHtml = () => {
    if (!contentRequest?.generatedContent) return;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${contentRequest.title}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        p { margin-bottom: 16px; }
        a { color: #3b82f6; text-decoration: underline; }
    </style>
</head>
<body>
    ${contentRequest.generatedContent}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contentRequest.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download Started',
      description: 'Your content is being downloaded as an HTML file.',
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !contentRequest) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Content Not Found</h2>
              <p className="text-gray-400 mb-6">The requested content could not be found or you don't have permission to view it.</p>
              <Link href="/app/my-tools">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to My Tools
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'N/A';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/app/my-tools">
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to My Tools
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Generated Content</h1>
          <p className="text-gray-400">View and manage your generated content</p>
        </div>

        {/* Content Info */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {contentRequest.title}
              </div>
              <Badge className={getStatusColor(contentRequest.status)}>
                {contentRequest.status.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>Created: {formatDate(contentRequest.createdAt)}</span>
              </div>
              {contentRequest.completedAt && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="h-4 w-4" />
                  <span>Completed: {formatDate(contentRequest.completedAt)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-400">
                <span>Target: {contentRequest.wordCount} words</span>
              </div>
            </div>
            
            {contentRequest.primaryKeyword && (
              <div className="mt-4">
                <p className="text-gray-400 text-sm mb-2">Primary Keyword:</p>
                <Badge variant="secondary" className="bg-gray-700 text-white">
                  {contentRequest.primaryKeyword}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Content Display */}
        {contentRequest.status === 'completed' && contentRequest.generatedContent ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span>Generated Content</span>
                <div className="flex gap-2">
                  <Button
                    onClick={copyToClipboard}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    data-testid="button-copy-content"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button
                    onClick={downloadAsHtml}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="button-download-content"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download HTML
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-invert max-w-none text-gray-300"
                dangerouslySetInnerHTML={{ __html: contentRequest.generatedContent }}
                data-testid="content-display"
              />
            </CardContent>
          </Card>
        ) : contentRequest.status === 'pending' ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-yellow-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Content Generation in Progress</h3>
              <p className="text-gray-400">Your content is currently being generated. This usually takes a few minutes. You'll be notified when it's ready.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold text-white mb-2">Content Generation Failed</h3>
              <p className="text-gray-400 mb-6">There was an issue generating your content. Please try creating a new request.</p>
              <Link href="/app/tools/content-generator">
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  Create New Request
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}