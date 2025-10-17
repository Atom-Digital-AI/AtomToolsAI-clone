import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FeedbackButtonsProps {
  toolType: 'seo-meta' | 'google-ads' | 'content-writer';
  inputData: any;
  outputData: any;
  guidelineProfileId?: string; // Optional: associate with brand for RAG
}

export function FeedbackButtons({
  toolType,
  inputData,
  outputData,
  guidelineProfileId,
}: FeedbackButtonsProps) {
  const [rating, setRating] = useState<'thumbs_up' | 'thumbs_down' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const { toast } = useToast();

  const feedbackMutation = useMutation({
    mutationFn: async (data: { rating: string; feedbackText?: string }) => {
      return apiRequest('POST', '/api/content-feedback', {
        toolType,
        rating: data.rating,
        feedbackText: data.feedbackText,
        inputData,
        outputData,
        guidelineProfileId,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you! Your feedback helps us improve.',
      });
    },
    onError: () => {
      toast({
        title: 'Feedback Failed',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleThumbsUp = () => {
    setRating('thumbs_up');
    setShowFeedbackInput(false);
    feedbackMutation.mutate({ rating: 'thumbs_up' });
  };

  const handleThumbsDown = () => {
    setRating('thumbs_down');
    setShowFeedbackInput(true);
  };

  const handleSubmitFeedback = () => {
    if (!feedbackText.trim()) {
      toast({
        title: 'Feedback Required',
        description: 'Please tell us what could be improved.',
        variant: 'destructive',
      });
      return;
    }
    feedbackMutation.mutate({ rating: 'thumbs_down', feedbackText });
    setShowFeedbackInput(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Was this helpful?</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThumbsUp}
          disabled={feedbackMutation.isPending || rating === 'thumbs_up'}
          className={cn(
            "hover:bg-green-500/10 hover:text-green-500",
            rating === 'thumbs_up' && "bg-green-500/20 text-green-500"
          )}
          data-testid="button-thumbs-up"
        >
          <ThumbsUp className={cn(
            "w-4 h-4",
            rating === 'thumbs_up' && "fill-current"
          )} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleThumbsDown}
          disabled={feedbackMutation.isPending || rating === 'thumbs_down'}
          className={cn(
            "hover:bg-red-500/10 hover:text-red-500",
            rating === 'thumbs_down' && "bg-red-500/20 text-red-500"
          )}
          data-testid="button-thumbs-down"
        >
          <ThumbsDown className={cn(
            "w-4 h-4",
            rating === 'thumbs_down' && "fill-current"
          )} />
        </Button>
      </div>

      {showFeedbackInput && (
        <div className="space-y-2 animate-in slide-in-from-top-2">
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What could we improve? Your feedback helps us generate better content for you."
            className="min-h-[100px] bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
            data-testid="input-feedback-text"
          />
          <Button
            onClick={handleSubmitFeedback}
            disabled={feedbackMutation.isPending}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700"
            data-testid="button-submit-feedback"
          >
            <Send className="w-4 h-4 mr-2" />
            Submit Feedback
          </Button>
        </div>
      )}
    </div>
  );
}
