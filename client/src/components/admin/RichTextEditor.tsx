import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  Heading1, 
  Heading2, 
  Heading3,
  Eye,
  EyeOff,
  Type
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, className, placeholder }: RichTextEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    const newText = 
      textarea.value.substring(0, start) + 
      before + selectedText + after + 
      textarea.value.substring(end);
    
    onChange(newText);
    
    // Set cursor position after insertion
    setTimeout(() => {
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const formatActions = [
    {
      icon: Bold,
      label: 'Bold',
      action: () => insertAtCursor('**', '**')
    },
    {
      icon: Italic,
      label: 'Italic', 
      action: () => insertAtCursor('*', '*')
    },
    {
      icon: Underline,
      label: 'Underline',
      action: () => insertAtCursor('<u>', '</u>')
    },
    {
      icon: Heading1,
      label: 'Heading 1',
      action: () => insertAtCursor('# ')
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      action: () => insertAtCursor('## ')
    },
    {
      icon: Heading3,
      label: 'Heading 3',
      action: () => insertAtCursor('### ')
    },
    {
      icon: Link,
      label: 'Link',
      action: () => insertAtCursor('[', '](url)')
    },
    {
      icon: List,
      label: 'Bullet List',
      action: () => insertAtCursor('- ')
    },
    {
      icon: ListOrdered,
      label: 'Numbered List',
      action: () => insertAtCursor('1. ')
    },
    {
      icon: Quote,
      label: 'Quote',
      action: () => insertAtCursor('> ')
    },
    {
      icon: Code,
      label: 'Code',
      action: () => insertAtCursor('`', '`')
    }
  ];

  // Handle image insertion from markdown format like ![alt](src)
  const processImageUrls = (text: string) => {
    // Convert relative image paths to absolute paths for preview
    return text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      if (src.startsWith('/images/')) {
        return `![${alt}](${src})`;
      }
      return match;
    });
  };

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-800 border border-gray-600 border-b-0 rounded-t-md">
        {formatActions.map((action, index) => (
          <Button
            key={index}
            type="button"
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              action.action();
            }}
            className="h-8 w-8 p-0 hover:bg-gray-700"
            title={action.label}
          >
            <action.icon className="w-4 h-4" />
          </Button>
        ))}
        
        <div className="border-l border-gray-600 mx-2" />
        
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowPreview(!showPreview);
          }}
          className="h-8 px-2 hover:bg-gray-700"
          title={showPreview ? "Hide Preview" : "Show Preview"}
        >
          {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {showPreview ? "Edit" : "Preview"}
        </Button>
      </div>

      {/* Editor/Preview */}
      <div className="border border-gray-600 border-t-0 rounded-b-md">
        {showPreview ? (
          <div className="p-4 bg-gray-900 min-h-[200px] rounded-b-md overflow-auto">
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children, ...props }) => (
                    <h1 className="text-2xl font-bold text-white mb-4" {...props}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 className="text-xl font-semibold text-white mb-3" {...props}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 className="text-lg font-semibold text-white mb-2" {...props}>
                      {children}
                    </h3>
                  ),
                  p: ({ children, ...props }) => (
                    <p className="text-gray-300 mb-3 leading-relaxed" {...props}>
                      {children}
                    </p>
                  ),
                  ul: ({ children, ...props }) => (
                    <ul className="text-gray-300 mb-3 list-disc list-inside space-y-1" {...props}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children, ...props }) => (
                    <ol className="text-gray-300 mb-3 list-decimal list-inside space-y-1" {...props}>
                      {children}
                    </ol>
                  ),
                  blockquote: ({ children, ...props }) => (
                    <blockquote className="border-l-4 border-indigo-500 pl-4 italic text-gray-400 mb-3" {...props}>
                      {children}
                    </blockquote>
                  ),
                  strong: ({ children, ...props }) => (
                    <strong className="text-white font-semibold" {...props}>
                      {children}
                    </strong>
                  ),
                  em: ({ children, ...props }) => (
                    <em className="text-gray-200 italic" {...props}>
                      {children}
                    </em>
                  ),
                  a: ({ children, href, ...props }) => (
                    <a 
                      href={href} 
                      className="text-indigo-400 hover:text-indigo-300 underline"
                      target={href?.startsWith('http') ? '_blank' : undefined}
                      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                      {...props}
                    >
                      {children}
                    </a>
                  ),
                  code: ({ children, ...props }) => (
                    <code className="bg-gray-800 text-indigo-300 px-2 py-1 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  ),
                  pre: ({ children, ...props }) => (
                    <pre className="bg-gray-800 text-gray-300 p-3 rounded-lg overflow-x-auto mb-3 font-mono text-sm" {...props}>
                      {children}
                    </pre>
                  ),
                  img: ({ src, alt, ...props }) => (
                    <img 
                      src={src} 
                      alt={alt || ''}
                      className="max-w-full h-auto rounded-lg my-3 border border-gray-700" 
                      loading="lazy"
                      {...props}
                    />
                  ),
                }}
              >
                {processImageUrls(value)}
              </ReactMarkdown>
            </div>
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-[200px] bg-gray-900 border-0 text-white resize-vertical rounded-t-none focus:ring-0 focus:ring-offset-0"
            placeholder={placeholder || "Enter content (Markdown supported)..."}
          />
        )}
      </div>

      {/* Help text */}
      <div className="text-xs text-gray-500 mt-1">
        Use Markdown formatting. Insert images with ![alt text](/images/path). Click the image upload button above to add images.
      </div>
    </div>
  );
}