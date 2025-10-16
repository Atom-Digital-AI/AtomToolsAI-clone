import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SaveContentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTitle: string;
  toolType: 'seo-meta' | 'google-ads' | 'content-generator';
  inputData: any;
  outputData: any;
}

export function SaveContentDialog({
  isOpen,
  onClose,
  defaultTitle,
  toolType,
  inputData,
  outputData,
}: SaveContentDialogProps) {
  const [customTitle, setCustomTitle] = useState(defaultTitle);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset customTitle when dialog opens or defaultTitle changes
  useEffect(() => {
    if (isOpen) {
      setCustomTitle(defaultTitle);
    }
  }, [isOpen, defaultTitle]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/generated-content', {
        toolType,
        title: customTitle,
        inputData,
        outputData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/generated-content'] });
      toast({
        title: 'Content Saved',
        description: 'Your content has been saved to your library.',
      });
      onClose();
    },
    onError: () => {
      toast({
        title: 'Save Failed',
        description: 'Failed to save content. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    if (!customTitle.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please enter a title for your content.',
        variant: 'destructive',
      });
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Save to Library</DialogTitle>
          <DialogDescription className="text-gray-400">
            Give your generated content a memorable name so you can find it easily later.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="content-title" className="text-gray-300">
              Content Title
            </Label>
            <Input
              id="content-title"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Enter a title for this content..."
              className="bg-gray-800 border-gray-700 text-white"
              data-testid="input-save-title"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
            data-testid="button-cancel-save"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            data-testid="button-confirm-save"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save to Library'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
