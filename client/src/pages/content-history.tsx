import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  MoreVertical,
  Calendar,
  Target,
  Globe,
  Copy,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { GeneratedContent } from '@shared/schema';

export default function ContentHistory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [toolFilter, setToolFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contents = [], isLoading } = useQuery<GeneratedContent[]>({
    queryKey: ['/api/generated-content', toolFilter === 'all' ? undefined : toolFilter],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/generated-content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/generated-content'] });
      toast({
        title: 'Content Deleted',
        description: 'The generated content has been deleted successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Delete Failed',
        description: 'Failed to delete the content. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const filteredContents = (contents || []).filter((content: GeneratedContent) =>
    content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(content.inputData).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const copyToClipboard = async (content: GeneratedContent) => {
    try {
      let textToCopy = '';
      
      if (content.toolType === 'google-ads') {
        const data = content.outputData as any;
        textToCopy = `Headlines:\n${data.headlines?.join('\n') || ''}\n\nDescriptions:\n${data.descriptions?.join('\n') || ''}`;
      } else if (content.toolType === 'seo-meta') {
        const data = content.outputData as any;
        textToCopy = `Titles:\n${data.titles?.join('\n') || ''}\n\nDescriptions:\n${data.descriptions?.join('\n') || ''}`;
      } else if (content.toolType === 'content-generator') {
        const data = content.outputData as any;
        textToCopy = data.content || '';
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(content.id);
      toast({
        title: 'Content Copied',
        description: 'The content has been copied to your clipboard.',
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy content to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const downloadContent = (content: GeneratedContent) => {
    let fileContent = '';
    let fileName = '';
    
    if (content.toolType === 'google-ads') {
      const data = content.outputData as any;
      fileContent = `Google Ads Copy - ${content.title}\n\nHeadlines:\n${data.headlines?.join('\n') || ''}\n\nDescriptions:\n${data.descriptions?.join('\n') || ''}`;
      fileName = `google-ads-${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    } else if (content.toolType === 'seo-meta') {
      const data = content.outputData as any;
      fileContent = `SEO Meta Tags - ${content.title}\n\nTitles:\n${data.titles?.join('\n') || ''}\n\nDescriptions:\n${data.descriptions?.join('\n') || ''}`;
      fileName = `seo-meta-${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    } else if (content.toolType === 'content-generator') {
      const data = content.outputData as any;
      fileContent = data.content || '';
      fileName = `content-${content.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    }

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download Started',
      description: 'Your content is being downloaded.',
    });
  };

  const getToolIcon = (toolType: string) => {
    switch (toolType) {
      case 'google-ads':
        return <Target className="h-4 w-4" />;
      case 'seo-meta':
        return <Globe className="h-4 w-4" />;
      case 'content-generator':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getToolLabel = (toolType: string) => {
    switch (toolType) {
      case 'google-ads':
        return 'Google Ads';
      case 'seo-meta':
        return 'SEO Meta';
      case 'content-generator':
        return 'Content Generator';
      default:
        return toolType;
    }
  };

  const getToolColor = (toolType: string) => {
    switch (toolType) {
      case 'google-ads':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'seo-meta':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'content-generator':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Content History</h1>
          <p className="text-gray-400">View and manage all your generated content</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
              data-testid="input-search-content"
            />
          </div>
          <Select value={toolFilter} onValueChange={setToolFilter}>
            <SelectTrigger className="w-48 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Filter by tool" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tools</SelectItem>
              <SelectItem value="google-ads">Google Ads</SelectItem>
              <SelectItem value="seo-meta">SEO Meta</SelectItem>
              <SelectItem value="content-generator">Content Generator</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
          </div>
        ) : filteredContents.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 text-center">
              <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Content Found</h3>
              <p className="text-gray-400">
                {searchTerm || toolFilter !== 'all' 
                  ? 'No content matches your current filters.'
                  : 'You haven\'t generated any content yet. Start using our tools to create your first content!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContents.map((content: GeneratedContent) => (
              <Card key={content.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getToolIcon(content.toolType)}
                      <CardTitle className="text-white text-sm truncate" title={content.title}>
                        {content.title}
                      </CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-white">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-gray-800 border-gray-700">
                        <DropdownMenuItem 
                          onClick={() => copyToClipboard(content)}
                          className="text-gray-300 hover:text-white hover:bg-gray-700"
                          data-testid={`button-copy-${content.id}`}
                        >
                          {copiedId === content.id ? (
                            <CheckCircle className="mr-2 h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="mr-2 h-4 w-4" />
                          )}
                          Copy Content
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => downloadContent(content)}
                          className="text-gray-300 hover:text-white hover:bg-gray-700"
                          data-testid={`button-download-${content.id}`}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteMutation.mutate(content.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                          data-testid={`button-delete-${content.id}`}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getToolColor(content.toolType)}>
                      {getToolLabel(content.toolType)}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="h-3 w-3" />
                      {formatDate(content.createdAt)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-gray-300 text-sm">
                    {content.toolType === 'google-ads' && (
                      <div>
                        <p><strong>Target:</strong> {(content.inputData as any).targetKeywords || 'N/A'}</p>
                        <p><strong>Brand:</strong> {(content.inputData as any).brandName || 'N/A'}</p>
                      </div>
                    )}
                    {content.toolType === 'seo-meta' && (
                      <div>
                        <p><strong>Keywords:</strong> {(content.inputData as any).targetKeywords || 'N/A'}</p>
                        <p><strong>Type:</strong> {(content.inputData as any).contentType || 'N/A'}</p>
                      </div>
                    )}
                    {content.toolType === 'content-generator' && (
                      <div>
                        <p><strong>Word Count:</strong> {(content.inputData as any).wordCount || 'N/A'}</p>
                        <p><strong>Keyword:</strong> {(content.inputData as any).primaryKeyword || 'N/A'}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}