import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Eye, FileText, Globe, Settings, Calendar } from "lucide-react";
import type { CmsPage } from "@shared/schema";
import { CmsPageEditor } from "@/components/admin/CmsPageEditor";

export default function CmsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPage, setSelectedPage] = useState<CmsPage | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [activeTab, setActiveTab] = useState("pages");

  const { data: pages = [], isLoading } = useQuery<CmsPage[]>({
    queryKey: ["/api/cms/pages"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/cms/pages/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      toast({
        title: "Success",
        description: "Page deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/cms/pages/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
      toast({
        title: "Success",
        description: "Page published successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateNew = () => {
    setSelectedPage(null);
    setShowEditor(true);
  };

  const handleEdit = (page: CmsPage) => {
    setSelectedPage(page);
    setShowEditor(true);
  };

  const handleDelete = async (page: CmsPage) => {
    if (confirm(`Are you sure you want to delete "${page.title}"?`)) {
      deleteMutation.mutate(page.id);
    }
  };

  const handlePublish = (page: CmsPage) => {
    publishMutation.mutate(page.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return <Badge className="bg-green-600 text-white">Published</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "static":
        return <Badge variant="outline" className="text-blue-400 border-blue-400">Static</Badge>;
      case "blog":
        return <Badge variant="outline" className="text-purple-400 border-purple-400">Blog</Badge>;
      case "resource":
        return <Badge variant="outline" className="text-orange-400 border-orange-400">Resource</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (showEditor) {
    return (
      <CmsPageEditor
        page={selectedPage}
        onSave={() => {
          setShowEditor(false);
          queryClient.invalidateQueries({ queryKey: ["/api/cms/pages"] });
        }}
        onCancel={() => setShowEditor(false)}
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="cms-management">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Content Management</h1>
          <p className="text-gray-400 mt-2">
            Manage static pages, blog posts, and SEO metadata
          </p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="bg-indigo-600 hover:bg-indigo-700"
          data-testid="button-create-page"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Page
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="pages" className="data-[state=active]:bg-indigo-600">
            <FileText className="w-4 h-4 mr-2" />
            All Pages
          </TabsTrigger>
          <TabsTrigger value="static" className="data-[state=active]:bg-indigo-600">
            <Globe className="w-4 h-4 mr-2" />
            Static
          </TabsTrigger>
          <TabsTrigger value="blog" className="data-[state=active]:bg-indigo-600">
            <Calendar className="w-4 h-4 mr-2" />
            Blog
          </TabsTrigger>
          <TabsTrigger value="resource" className="data-[state=active]:bg-indigo-600">
            <Settings className="w-4 h-4 mr-2" />
            Resources
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          <PagesTable
            pages={pages}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublish={handlePublish}
            getStatusBadge={getStatusBadge}
            getTypeBadge={getTypeBadge}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="static" className="space-y-4">
          <PagesTable
            pages={pages.filter(p => p.type === 'static')}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublish={handlePublish}
            getStatusBadge={getStatusBadge}
            getTypeBadge={getTypeBadge}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="blog" className="space-y-4">
          <PagesTable
            pages={pages.filter(p => p.type === 'blog')}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublish={handlePublish}
            getStatusBadge={getStatusBadge}
            getTypeBadge={getTypeBadge}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="resource" className="space-y-4">
          <PagesTable
            pages={pages.filter(p => p.type === 'resource')}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPublish={handlePublish}
            getStatusBadge={getStatusBadge}
            getTypeBadge={getTypeBadge}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface PagesTableProps {
  pages: CmsPage[];
  onEdit: (page: CmsPage) => void;
  onDelete: (page: CmsPage) => void;
  onPublish: (page: CmsPage) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getTypeBadge: (type: string) => React.ReactNode;
  isLoading: boolean;
}

function PagesTable({
  pages,
  onEdit,
  onDelete,
  onPublish,
  getStatusBadge,
  getTypeBadge,
  isLoading
}: PagesTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No pages found</p>
          <p className="text-gray-500 text-sm">Create your first page to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {pages.map((page) => (
        <Card key={page.id} className="bg-gray-800 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-semibold text-white truncate">
                    {page.title}
                  </h3>
                  {getTypeBadge(page.type)}
                  {getStatusBadge(page.status)}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <span className="flex items-center">
                    <Globe className="w-4 h-4 mr-1" />
                    {page.slug}
                  </span>
                  <span>
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </span>
                </div>

                {page.excerpt && (
                  <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                    {page.excerpt}
                  </p>
                )}

                {page.metaDescription && (
                  <div className="mb-3">
                    <span className="text-xs text-gray-500 uppercase tracking-wide">Meta Description</span>
                    <p className="text-gray-400 text-sm line-clamp-1">
                      {page.metaDescription}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                {page.status === 'draft' && (
                  <Button
                    onClick={() => onPublish(page)}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    data-testid={`button-publish-${page.id}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Publish
                  </Button>
                )}
                
                <Button
                  onClick={() => onEdit(page)}
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  data-testid={`button-edit-${page.id}`}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                
                <Button
                  onClick={() => onDelete(page)}
                  size="sm"
                  variant="ghost"
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  data-testid={`button-delete-${page.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}