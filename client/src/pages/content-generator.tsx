import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { FileText, Hash, Target, Link, ExternalLink, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { nanoid } from 'nanoid';

const contentGeneratorSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  wordCount: z.number().min(100, 'Word count must be at least 100').max(10000, 'Word count cannot exceed 10,000'),
  primaryKeyword: z.string().min(1, 'Primary keyword is required'),
  secondaryKeywords: z.array(z.string()).default([]),
  internalLinks: z.array(z.string()).default([]),
  externalLinks: z.array(z.string()).default([]),
  additionalInstructions: z.string().optional(),
});

type ContentGeneratorFormData = z.infer<typeof contentGeneratorSchema>;

export default function ContentGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [secondaryKeywordInput, setSecondaryKeywordInput] = useState('');
  const [internalLinkInput, setInternalLinkInput] = useState('');
  const [externalLinkInput, setExternalLinkInput] = useState('');
  const { toast } = useToast();

  const form = useForm<ContentGeneratorFormData>({
    resolver: zodResolver(contentGeneratorSchema),
    defaultValues: {
      title: '',
      wordCount: 1000,
      primaryKeyword: '',
      secondaryKeywords: [],
      internalLinks: [],
      externalLinks: [],
      additionalInstructions: '',
    },
  });

  const addSecondaryKeyword = () => {
    if (secondaryKeywordInput.trim()) {
      const currentKeywords = form.getValues('secondaryKeywords');
      form.setValue('secondaryKeywords', [...currentKeywords, secondaryKeywordInput.trim()]);
      setSecondaryKeywordInput('');
    }
  };

  const removeSecondaryKeyword = (index: number) => {
    const currentKeywords = form.getValues('secondaryKeywords');
    form.setValue('secondaryKeywords', currentKeywords.filter((_, i) => i !== index));
  };

  const addInternalLink = () => {
    if (internalLinkInput.trim()) {
      const currentLinks = form.getValues('internalLinks');
      form.setValue('internalLinks', [...currentLinks, internalLinkInput.trim()]);
      setInternalLinkInput('');
    }
  };

  const removeInternalLink = (index: number) => {
    const currentLinks = form.getValues('internalLinks');
    form.setValue('internalLinks', currentLinks.filter((_, i) => i !== index));
  };

  const addExternalLink = () => {
    if (externalLinkInput.trim()) {
      const currentLinks = form.getValues('externalLinks');
      form.setValue('externalLinks', [...currentLinks, externalLinkInput.trim()]);
      setExternalLinkInput('');
    }
  };

  const removeExternalLink = (index: number) => {
    const currentLinks = form.getValues('externalLinks');
    form.setValue('externalLinks', currentLinks.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ContentGeneratorFormData) => {
    setIsGenerating(true);
    
    try {
      // Generate unique request ID
      const requestId = nanoid();
      
      // First, save the request to our database
      await apiRequest('POST', '/api/content-requests', {
        requestId,
        title: data.title,
        wordCount: data.wordCount,
        primaryKeyword: data.primaryKeyword,
        secondaryKeywords: data.secondaryKeywords,
        internalLinks: data.internalLinks,
        externalLinks: data.externalLinks,
        additionalInstructions: data.additionalInstructions || '',
        status: 'pending'
      });

      // Then send to Make.com with the request ID
      const payload = {
        title: data.title,
        wordCount: data.wordCount,
        primaryKeyword: data.primaryKeyword,
        secondaryKeywords: data.secondaryKeywords,
        internalLinks: data.internalLinks,
        externalLinks: data.externalLinks,
        additionalInstructions: data.additionalInstructions || '',
      };

      const response = await fetch('https://hook.eu2.make.com/2igx71wvb7mc33vlasgm3rij2dxx0afg', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-make-apikey': '*F~k$|1WnBZ6}k08Rp;DPg@!y*-:bkqr0==At0g4wo.:HTXVdvi1C&Qn62W,0jzQ',
          'x-request-id': requestId,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: 'Content Generation Started',
          description: 'Your content is being generated and you will be notified when it is ready. You can check your progress in the My Tools section.',
        });
        
        // Reset form after successful submission
        form.reset();
        setSecondaryKeywordInput('');
        setInternalLinkInput('');
        setExternalLinkInput('');
      } else {
        throw new Error('Failed to submit content generation request');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: 'Generation Failed',
        description: 'Failed to start content generation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Content Generator</h1>
          <p className="text-gray-400">Generate high-quality, SEO-optimized content for your website or blog.</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Question 1: Title */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <FileText className="h-5 w-5" />
                  What is the title of the content?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter the content title..."
                          className="bg-gray-700 border-gray-600 text-white"
                          data-testid="input-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Question 2: Word Count */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <Hash className="h-5 w-5" />
                  How many words should the content have?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="wordCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="100"
                          max="10000"
                          placeholder="1000"
                          className="bg-gray-700 border-gray-600 text-white"
                          data-testid="input-word-count"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Question 3: Primary Keyword */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <Target className="h-5 w-5" />
                  What is the primary keyword for the content?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="primaryKeyword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter primary keyword..."
                          className="bg-gray-700 border-gray-600 text-white"
                          data-testid="input-primary-keyword"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Question 4: Secondary Keywords */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  <Target className="h-5 w-5" />
                  What are the secondary keywords for the content?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={secondaryKeywordInput}
                    onChange={(e) => setSecondaryKeywordInput(e.target.value)}
                    placeholder="Enter secondary keyword..."
                    className="bg-gray-700 border-gray-600 text-white"
                    data-testid="input-secondary-keyword"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSecondaryKeyword())}
                  />
                  <Button
                    type="button"
                    onClick={addSecondaryKeyword}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="button-add-secondary-keyword"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch('secondaryKeywords').map((keyword, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-gray-700 text-white hover:bg-gray-600"
                      data-testid={`badge-secondary-keyword-${index}`}
                    >
                      {keyword}
                      <button
                        type="button"
                        onClick={() => removeSecondaryKeyword(index)}
                        className="ml-2 hover:text-red-400"
                        data-testid={`button-remove-secondary-keyword-${index}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Question 5: Internal Links */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
                    5
                  </div>
                  <Link className="h-5 w-5" />
                  Are there any internal links that should be included in the content?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={internalLinkInput}
                    onChange={(e) => setInternalLinkInput(e.target.value)}
                    placeholder="Enter internal link URL..."
                    className="bg-gray-700 border-gray-600 text-white"
                    data-testid="input-internal-link"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInternalLink())}
                  />
                  <Button
                    type="button"
                    onClick={addInternalLink}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="button-add-internal-link"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch('internalLinks').map((link, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-gray-700 text-white hover:bg-gray-600"
                      data-testid={`badge-internal-link-${index}`}
                    >
                      {link}
                      <button
                        type="button"
                        onClick={() => removeInternalLink(index)}
                        className="ml-2 hover:text-red-400"
                        data-testid={`button-remove-internal-link-${index}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Question 6: External Links */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
                    6
                  </div>
                  <ExternalLink className="h-5 w-5" />
                  Are there any external links that should be included in the content?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={externalLinkInput}
                    onChange={(e) => setExternalLinkInput(e.target.value)}
                    placeholder="Enter external link URL..."
                    className="bg-gray-700 border-gray-600 text-white"
                    data-testid="input-external-link"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExternalLink())}
                  />
                  <Button
                    type="button"
                    onClick={addExternalLink}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    data-testid="button-add-external-link"
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.watch('externalLinks').map((link, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-gray-700 text-white hover:bg-gray-600"
                      data-testid={`badge-external-link-${index}`}
                    >
                      {link}
                      <button
                        type="button"
                        onClick={() => removeExternalLink(index)}
                        className="ml-2 hover:text-red-400"
                        data-testid={`button-remove-external-link-${index}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Question 7: Additional Instructions */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold">
                    7
                  </div>
                  <MessageSquare className="h-5 w-5" />
                  Additional instructions or specific requirements for the content.
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="additionalInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Enter any additional instructions or specific requirements..."
                          className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                          data-testid="textarea-additional-instructions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Generate Button */}
            <div className="flex justify-center pt-6">
              <Button
                type="submit"
                disabled={isGenerating}
                className="bg-indigo-600 hover:bg-indigo-700 px-8 py-3 text-lg"
                data-testid="button-generate-content"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Generating Content...
                  </>
                ) : (
                  'Generate Content'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}