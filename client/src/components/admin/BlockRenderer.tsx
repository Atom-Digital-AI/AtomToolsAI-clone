import ReactMarkdown from "react-markdown";
import type { BlockRow, BlockColumn } from "./BlockEditor";

interface BlockRendererProps {
  content: string;
}

export function BlockRenderer({ content }: BlockRendererProps) {
  let blocks: BlockRow[] = [];
  
  try {
    blocks = JSON.parse(content);
    // Ensure it's an array
    if (!Array.isArray(blocks)) {
      blocks = [];
    }
  } catch {
    // If parsing fails, treat as legacy markdown content
    return (
      <div className="prose prose-invert prose-lg max-w-none">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }

  const getColumnClass = (column: BlockColumn) => {
    const widthClass = `col-span-${column.width}`;
    const paddingClass = column.padding || "";
    const marginClass = column.margin || "";
    const alignClass = column.alignItems ? `items-${column.alignItems}` : "";
    const justifyClass = column.justifyContent ? `justify-${column.justifyContent}` : "";
    
    return `${widthClass} ${paddingClass} ${marginClass} ${alignClass} ${justifyClass} flex flex-col`.trim();
  };

  const getRowClass = (row: BlockRow) => {
    const paddingClass = row.padding || "";
    const marginClass = row.margin || "";
    const gapClass = row.gap || "";
    const alignClass = row.alignItems ? `items-${row.alignItems}` : "";
    const justifyClass = row.justifyContent ? `justify-${row.justifyContent}` : "";
    const minHeightClass = row.minHeight || "";
    
    return `grid grid-cols-12 ${gapClass} ${paddingClass} ${marginClass} ${alignClass} ${justifyClass} ${minHeightClass}`.trim();
  };

  if (blocks.length === 0) {
    return (
      <div className="prose prose-invert prose-lg max-w-none">
        <p>No content available.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {blocks.map((row) => (
        <div
          key={row.id}
          className={getRowClass(row)}
          style={{
            backgroundColor: row.backgroundColor,
            minHeight: row.minHeight
          }}
        >
          {row.columns.map((column) => (
            <div key={column.id} className={getColumnClass(column)}>
              <div className="prose prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children, ...props }) => (
                      <h1 className="text-4xl font-bold text-white mb-6" {...props}>
                        {children}
                      </h1>
                    ),
                    h2: ({ children, ...props }) => (
                      <h2 className="text-3xl font-semibold text-white mb-4" {...props}>
                        {children}
                      </h2>
                    ),
                    h3: ({ children, ...props }) => (
                      <h3 className="text-2xl font-semibold text-white mb-3" {...props}>
                        {children}
                      </h3>
                    ),
                    p: ({ children, ...props }) => (
                      <p className="text-gray-300 mb-4 leading-relaxed" {...props}>
                        {children}
                      </p>
                    ),
                    ul: ({ children, ...props }) => (
                      <ul className="text-gray-300 mb-4 list-disc list-inside space-y-2" {...props}>
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }) => (
                      <ol className="text-gray-300 mb-4 list-decimal list-inside space-y-2" {...props}>
                        {children}
                      </ol>
                    ),
                    blockquote: ({ children, ...props }) => (
                      <blockquote className="border-l-4 border-indigo-500 pl-6 italic text-gray-400 mb-4" {...props}>
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children, ...props }) => (
                      <strong className="text-white font-semibold" {...props}>
                        {children}
                      </strong>
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
                      <pre className="bg-gray-800 text-gray-300 p-4 rounded-lg overflow-x-auto mb-4 font-mono text-sm" {...props}>
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {column.content}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}