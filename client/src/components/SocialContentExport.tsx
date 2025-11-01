import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Wireframe {
  id: string;
  platform: string;
  format: string;
  optionLabel: string;
  textFields: Record<string, {
    text: string;
    charCount: number;
    limit: number | string;
    passed: boolean;
  }>;
  ctaButton?: string;
  mediaSpecs: any;
  mediaConcept: string;
  altText?: string;
  rationale: string;
}

interface SocialContentExportProps {
  wireframes: Wireframe[];
  sessionId: string;
}

export function SocialContentExport({ wireframes, sessionId }: SocialContentExportProps) {
  const [copiedFields, setCopiedFields] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFields(new Set(Array.from(copiedFields).concat(fieldId)));
      setTimeout(() => {
        setCopiedFields(prev => {
          const next = new Set(prev);
          next.delete(fieldId);
          return next;
        });
      }, 2000);
      
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const exportAsJSON = () => {
    const exportData = wireframes.map(wireframe => ({
      platform: wireframe.platform,
      format: wireframe.format,
      option: wireframe.optionLabel,
      textFields: Object.entries(wireframe.textFields).reduce((acc, [key, value]) => {
        acc[key] = value.text;
        return acc;
      }, {} as Record<string, string>),
      cta: wireframe.ctaButton,
      mediaSpecs: wireframe.mediaSpecs,
      mediaConcept: wireframe.mediaConcept,
      altText: wireframe.altText,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-content-${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "JSON file downloaded successfully",
    });
  };

  const exportAsCSV = () => {
    // CSV headers
    const headers = ['Platform', 'Format', 'Option', 'Field Name', 'Text', 'Character Count', 'CTA', 'Media Concept'];
    
    // CSV rows
    const rows = wireframes.flatMap(wireframe =>
      Object.entries(wireframe.textFields).map(([fieldName, fieldData]) => [
        wireframe.platform,
        wireframe.format,
        wireframe.optionLabel,
        fieldName,
        `"${fieldData.text.replace(/"/g, '""')}"`,
        fieldData.charCount,
        wireframe.ctaButton || '',
        `"${wireframe.mediaConcept.replace(/"/g, '""')}"`,
      ])
    );

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-content-${sessionId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "CSV file downloaded successfully",
    });
  };

  const exportAsTXT = () => {
    const text = wireframes.map(wireframe => {
      const fields = Object.entries(wireframe.textFields)
        .map(([name, data]) => `${name}: ${data.text} (${data.charCount} chars)`)
        .join('\n');
      
      return `
=== ${wireframe.platform} - ${wireframe.format} (Option ${wireframe.optionLabel}) ===

${fields}

CTA: ${wireframe.ctaButton || 'N/A'}

Media Concept:
${wireframe.mediaConcept}

${wireframe.altText ? `Alt Text: ${wireframe.altText}` : ''}

---
`;
    }).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-content-${sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded",
      description: "Text file downloaded successfully",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Download All
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportAsJSON}>
              Download as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsCSV}>
              Download as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsTXT}>
              Download as TXT
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {wireframes.map((wireframe) => (
        <Card key={wireframe.id}>
          <CardHeader>
            <CardTitle className="text-lg">
              {wireframe.platform} - {wireframe.format} (Option {wireframe.optionLabel})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(wireframe.textFields).map(([fieldName, fieldData]) => {
              const fieldId = `${wireframe.id}-${fieldName}`;
              const isCopied = copiedFields.has(fieldId);
              
              return (
                <div key={fieldName} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{fieldName}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(fieldData.text, fieldId)}
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm">{fieldData.text}</p>
                    <div className="text-xs text-muted-foreground mt-2">
                      {fieldData.charCount} / {fieldData.limit} characters
                    </div>
                  </div>
                </div>
              );
            })}

            {wireframe.ctaButton && (
              <div className="space-y-2">
                <span className="font-semibold text-sm">CTA Button</span>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{wireframe.ctaButton}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <span className="font-semibold text-sm">Media Concept</span>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{wireframe.mediaConcept}</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="font-semibold text-sm">Technical Specs</span>
              <div className="p-3 bg-muted rounded-lg text-xs space-y-1">
                <div>Type: {wireframe.mediaSpecs.type}</div>
                <div>Aspect Ratio: {wireframe.mediaSpecs.aspectRatio}</div>
                {wireframe.mediaSpecs.dimensions && (
                  <div>Dimensions: {wireframe.mediaSpecs.dimensions}</div>
                )}
                {wireframe.mediaSpecs.maxSizeMB && (
                  <div>Max Size: {wireframe.mediaSpecs.maxSizeMB}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
