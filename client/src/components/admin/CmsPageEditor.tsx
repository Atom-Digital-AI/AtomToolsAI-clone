import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Eye, Globe, Search, Image as ImageIcon, FileText, Twitter } from "lucide-react";
import { insertCmsPageSchema, type CmsPage } from "@shared/schema";
import { z } from "zod";
import { BlockEditor } from "./BlockEditor";

const editorSchema = insertCmsPageSchema.extend({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  robotsMeta: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().url().optional().or(z.literal('')),
  ogType: z.string().optional(),
  twitterCard: z.string().optional(),
  twitterTitle: z.string().optional(),
  twitterDescription: z.string().optional(),
  twitterImage: z.string().url().optional().or(z.literal('')),
});

type EditorFormData = z.infer<typeof editorSchema>;

interface CmsPageEditorProps {
  page?: CmsPage | null;
  onSave: () => void;
  onCancel: () => void;
}

export function CmsPageEditor({ page, onSave, onCancel }: CmsPageEditorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("content");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const form = useForm<EditorFormData>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      title: page?.title || "",
      slug: page?.slug || "",
      type: (page?.type as "static" | "blog" | "resource") || "static",
      status: (page?.status as "draft" | "published" | "archived") || "draft",
      content: page?.content || "",
      excerpt: page?.excerpt || "",
      featuredImage: page?.featuredImage || "",
      metaTitle: page?.metaTitle || "",
      metaDescription: page?.metaDescription || "",
      canonicalUrl: page?.canonicalUrl || "",
      robotsMeta: page?.robotsMeta || "index,follow",
      ogTitle: page?.ogTitle || "",
      ogDescription: page?.ogDescription || "",
      ogImage: page?.ogImage || "",
      ogType: page?.ogType || "article",
      twitterCard: page?.twitterCard || "summary_large_image",
      twitterTitle: page?.twitterTitle || "",
      twitterDescription: page?.twitterDescription || "",
      twitterImage: page?.twitterImage || "",
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: EditorFormData) => {
      if (page) {
        return apiRequest("PUT", `/api/cms/pages/${page.id}`, data);
      } else {
        return apiRequest("POST", "/api/cms/pages", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: page ? "Page updated successfully" : "Page created successfully",
      });
      onSave();
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
    mutationFn: (data: EditorFormData) => {
      const publishData = { ...data, status: "published" };
      if (page) {
        return apiRequest("PUT", `/api/cms/pages/${page.id}`, publishData);
      } else {
        return apiRequest("POST", "/api/cms/pages", publishData);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Page published successfully",
      });
      onSave();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-generate slug from title
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "title" && value.title && !page) {
        const slug = "/" + value.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();
        form.setValue("slug", slug);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, page]);

  const onSubmit = (data: EditorFormData) => {
    saveMutation.mutate(data);
  };

  const onPublish = (data: EditorFormData) => {
    publishMutation.mutate(data);
  };

  const insertTextAtCursor = (text: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentValue = form.getValues("content");
    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    
    form.setValue("content", newValue);
    
    // Set focus back and position cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const toolbarButtons = [
    { label: "H1", action: () => insertTextAtCursor("\n# "), icon: "H1" },
    { label: "H2", action: () => insertTextAtCursor("\n## "), icon: "H2" },
    { label: "H3", action: () => insertTextAtCursor("\n### "), icon: "H3" },
    { label: "Bold", action: () => insertTextAtCursor("**text**"), icon: "B" },
    { label: "Italic", action: () => insertTextAtCursor("*text*"), icon: "I" },
    { label: "Link", action: () => insertTextAtCursor("[Link Text](https://example.com)"), icon: "🔗" },
    { label: "Image", action: () => insertTextAtCursor("![Alt text](image-url.jpg)"), icon: "🖼️" },
    { label: "List", action: () => insertTextAtCursor("\n- Item 1\n- Item 2\n- Item 3"), icon: "📝" },
    { label: "Quote", action: () => insertTextAtCursor("\n> This is a quote"), icon: "💬" },
    { label: "Code", action: () => insertTextAtCursor("`code`"), icon: "💻" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6" data-testid="cms-page-editor">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={onCancel}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pages
          </Button>
          <h1 className="text-2xl font-bold text-white">
            {page ? "Edit Page" : "Create New Page"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
            data-testid="button-save-draft"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
          <Button
            onClick={form.handleSubmit(onPublish)}
            disabled={publishMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
            data-testid="button-publish"
          >
            <Eye className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
              <TabsTrigger value="content" className="data-[state=active]:bg-indigo-600">
                <FileText className="w-4 h-4 mr-2" />
                Content
              </TabsTrigger>
              <TabsTrigger value="seo" className="data-[state=active]:bg-indigo-600">
                <Search className="w-4 h-4 mr-2" />
                SEO
              </TabsTrigger>
              <TabsTrigger value="social" className="data-[state=active]:bg-indigo-600">
                <Globe className="w-4 h-4 mr-2" />
                Social
              </TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-indigo-600">
                <ImageIcon className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Title</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-gray-700 border-gray-600 text-white"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Slug (URL Path)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="/about-us"
                          data-testid="input-slug"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-700 border-gray-600">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="static">Static Page</SelectItem>
                          <SelectItem value="blog">Blog Post</SelectItem>
                          <SelectItem value="resource">Resource</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-gray-700 border-gray-600">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featuredImage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Featured Image URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          className="bg-gray-700 border-gray-600 text-white"
                          placeholder="https://example.com/image.jpg"
                          data-testid="input-featured-image"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-300">Excerpt</FormLabel>
                      <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ''}
                        className="bg-gray-700 border-gray-600 text-white"
                        placeholder="Brief description of the page content"
                        rows={3}
                        data-testid="textarea-excerpt"
                      />
                      </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel className="text-gray-300">Content Builder</FormLabel>

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <BlockEditor 
                          content={field.value} 
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Search className="w-5 h-5" />
                    SEO Metadata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Meta Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="SEO-optimized title (50-60 characters)"
                            data-testid="input-meta-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Meta Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Brief description for search results (150-160 characters)"
                            rows={3}
                            data-testid="textarea-meta-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="canonicalUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Canonical URL</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-gray-700 border-gray-600 text-white"
                              placeholder="https://example.com/page"
                              data-testid="input-canonical-url"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="robotsMeta"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Robots Meta</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-700 border-gray-600">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="index,follow">Index, Follow</SelectItem>
                              <SelectItem value="index,nofollow">Index, No Follow</SelectItem>
                              <SelectItem value="noindex,follow">No Index, Follow</SelectItem>
                              <SelectItem value="noindex,nofollow">No Index, No Follow</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="social" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Open Graph (Facebook)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ogTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">OG Title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-gray-700 border-gray-600 text-white"
                              placeholder="Title for social sharing"
                              data-testid="input-og-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ogType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">OG Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-700 border-gray-600">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="article">Article</SelectItem>
                              <SelectItem value="website">Website</SelectItem>
                              <SelectItem value="blog">Blog</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="ogDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">OG Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Description for social sharing"
                            rows={3}
                            data-testid="textarea-og-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ogImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">OG Image</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="https://example.com/og-image.jpg"
                            data-testid="input-og-image"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Twitter className="w-5 h-5" />
                    Twitter Card
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="twitterCard"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Twitter Card Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-gray-700 border-gray-600">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="summary">Summary</SelectItem>
                              <SelectItem value="summary_large_image">Summary Large Image</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="twitterTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-300">Twitter Title</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              className="bg-gray-700 border-gray-600 text-white"
                              placeholder="Title for Twitter sharing"
                              data-testid="input-twitter-title"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="twitterDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Twitter Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="Description for Twitter sharing"
                            rows={2}
                            data-testid="textarea-twitter-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twitterImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Twitter Image</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="bg-gray-700 border-gray-600 text-white"
                            placeholder="https://example.com/twitter-image.jpg"
                            data-testid="input-twitter-image"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Page Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-gray-400">
                    <h3 className="text-white font-medium mb-2">Publishing Info</h3>
                    <p className="text-sm">
                      Page created: {page ? new Date(page.createdAt).toLocaleString() : "New page"}
                    </p>
                    {page?.updatedAt && (
                      <p className="text-sm">
                        Last updated: {new Date(page.updatedAt).toLocaleString()}
                      </p>
                    )}
                    {page?.publishedAt && (
                      <p className="text-sm">
                        Published: {new Date(page.publishedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}