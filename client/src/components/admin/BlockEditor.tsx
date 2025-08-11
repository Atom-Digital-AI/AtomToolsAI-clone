import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical, Settings, Copy, Eye, EyeOff, Image, Columns, Grid3X3 } from "lucide-react";
import { ObjectUploader } from "./ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { apiRequest } from "@/lib/queryClient";

export interface BlockColumn {
  id: string;
  content: string;
  width: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12";
  padding?: string;
  margin?: string;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
}

export interface BlockRow {
  id: string;
  columns: BlockColumn[];
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  gap?: string;
  alignItems?: "start" | "center" | "end" | "stretch";
  justifyContent?: "start" | "center" | "end" | "between" | "around" | "evenly";
  minHeight?: string;
}

interface BlockEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function BlockEditor({ content, onChange }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<BlockRow[]>(() => {
    try {
      const parsed = JSON.parse(content || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If content is markdown/text, create a single row with one column
      if (content) {
        return [{
          id: crypto.randomUUID(),
          columns: [{
            id: crypto.randomUUID(),
            content: content,
            width: "12" as const,
            padding: "p-6",
            margin: "",
            alignItems: "start",
            justifyContent: "start"
          }],
          padding: "py-8",
          margin: "",
          gap: "gap-6",
          alignItems: "stretch",
          justifyContent: "start"
        }];
      }
      return [];
    }
  });
  
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [showColumnDialog, setShowColumnDialog] = useState(false);

  const updateContent = (newBlocks: BlockRow[]) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks, null, 2));
  };

  const addRow = (columnCount: 1 | 2 = 1) => {
    const columns: BlockColumn[] = [];
    
    if (columnCount === 1) {
      columns.push({
        id: crypto.randomUUID(),
        content: "# New Content\n\nEdit this content...",
        width: "12",
        padding: "p-6",
        margin: "",
        alignItems: "start",
        justifyContent: "start"
      });
    } else {
      // Two columns with equal width
      columns.push(
        {
          id: crypto.randomUUID(),
          content: "# Left Column\n\nEdit this content...",
          width: "6",
          padding: "p-6",
          margin: "",
          alignItems: "start",
          justifyContent: "start"
        },
        {
          id: crypto.randomUUID(),
          content: "# Right Column\n\nEdit this content...",
          width: "6",
          padding: "p-6",
          margin: "",
          alignItems: "start",
          justifyContent: "start"
        }
      );
    }

    const newRow: BlockRow = {
      id: crypto.randomUUID(),
      columns,
      padding: "py-8",
      margin: "",
      gap: "gap-6",
      alignItems: "stretch",
      justifyContent: "start"
    };
    
    updateContent([...blocks, newRow]);
    setShowColumnDialog(false);
  };

  const duplicateRow = (rowId: string) => {
    const rowIndex = blocks.findIndex(b => b.id === rowId);
    if (rowIndex >= 0) {
      const original = blocks[rowIndex];
      const duplicate: BlockRow = {
        ...original,
        id: crypto.randomUUID(),
        columns: original.columns.map(col => ({
          ...col,
          id: crypto.randomUUID()
        }))
      };
      const newBlocks = [...blocks];
      newBlocks.splice(rowIndex + 1, 0, duplicate);
      updateContent(newBlocks);
    }
  };

  const deleteRow = (rowId: string) => {
    updateContent(blocks.filter(b => b.id !== rowId));
  };

  const addColumn = (rowId: string) => {
    try {
      const newBlocks = blocks.map(row => {
        if (row.id === rowId) {
          // Calculate width for equal distribution
          const currentColumnCount = row.columns.length;
          const newColumnCount = currentColumnCount + 1;
          const newWidth = Math.floor(12 / newColumnCount).toString();
          
          // Update existing columns to new width
          const updatedColumns = row.columns.map(col => ({
            ...col,
            width: newWidth
          }));
          
          const newColumn: BlockColumn = {
            id: crypto.randomUUID(),
            content: `# Column ${newColumnCount}\n\nEdit this content...`,
            width: newWidth,
            padding: "p-4",
            margin: "",
            alignItems: "start",
            justifyContent: "start"
          };
          
          return { 
            ...row, 
            columns: [...updatedColumns, newColumn]
          };
        }
        return row;
      });
      updateContent(newBlocks);
    } catch (error) {
      console.error('Error adding column:', error);
    }
  };

  const deleteColumn = (rowId: string, columnId: string) => {
    const newBlocks = blocks.map(row => {
      if (row.id === rowId) {
        return { ...row, columns: row.columns.filter(col => col.id !== columnId) };
      }
      return row;
    });
    updateContent(newBlocks);
  };

  const updateRow = (rowId: string, updates: Partial<BlockRow>) => {
    const newBlocks = blocks.map(row => 
      row.id === rowId ? { ...row, ...updates } : row
    );
    updateContent(newBlocks);
  };

  const updateColumn = (rowId: string, columnId: string, updates: Partial<BlockColumn>) => {
    const newBlocks = blocks.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          columns: row.columns.map(col =>
            col.id === columnId ? { ...col, ...updates } : col
          )
        };
      }
      return row;
    });
    updateContent(newBlocks);
  };

  // Handle image upload
  const handleImageUpload = async (): Promise<{ method: "PUT"; url: string }> => {
    try {
      console.log("Requesting upload URL...");
      const response = await apiRequest("POST", "/api/images/upload");
      console.log("Upload URL response:", response);
      
      if (!response.uploadURL) {
        throw new Error("No upload URL received from server");
      }
      
      return { method: "PUT", url: response.uploadURL };
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      throw error;
    }
  };

  const handleImageUploadComplete = (rowId: string, columnId: string) => (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL;
      
      // Confirm the upload and get the serving URL
      apiRequest("PUT", "/api/images/confirm", { uploadURL })
        .then((response: any) => {
          const imagePath = response.imagePath;
          const currentColumn = blocks
            .find(row => row.id === rowId)
            ?.columns.find(col => col.id === columnId);
          
          if (currentColumn) {
            const imageMarkdown = `![Uploaded Image](${imagePath})\n\n`;
            updateColumn(rowId, columnId, { 
              content: currentColumn.content + imageMarkdown 
            });
          }
        })
        .catch((error: any) => {
          console.error("Failed to confirm image upload:", error);
        });
    }
  };

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

  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Preview Mode</h3>
          <Button
            onClick={() => setPreviewMode(false)}
            variant="outline"
            size="sm"
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
        <div className="bg-gray-900 rounded-lg p-6">
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
                    {column.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-2 last:mb-0">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Block Editor</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => setPreviewMode(true)}
            variant="outline"
            size="sm"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 text-white">
              <DialogHeader>
                <DialogTitle>Choose Column Layout</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Select how many columns you want in your new row.
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-6">
                <Button
                  onClick={() => addRow(1)}
                  variant="outline"
                  className="h-32 flex flex-col items-center justify-center gap-3 border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/10"
                >
                  <Columns className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold">Single Column</div>
                    <div className="text-xs text-gray-400">Full width content</div>
                  </div>
                </Button>
                <Button
                  onClick={() => addRow(2)}
                  variant="outline"
                  className="h-32 flex flex-col items-center justify-center gap-3 border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/10"
                >
                  <Grid3X3 className="w-8 h-8" />
                  <div className="text-center">
                    <div className="font-semibold">Two Columns</div>
                    <div className="text-xs text-gray-400">Side by side layout</div>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p>No content blocks yet.</p>
            <Dialog open={showColumnDialog} onOpenChange={setShowColumnDialog}>
              <DialogTrigger asChild>
                <Button className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Row
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                  <DialogTitle>Choose Column Layout</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Select how many columns you want in your new row.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-6">
                  <Button
                    onClick={() => addRow(1)}
                    variant="outline"
                    className="h-32 flex flex-col items-center justify-center gap-3 border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/10"
                  >
                    <Columns className="w-8 h-8" />
                    <div className="text-center">
                      <div className="font-semibold">Single Column</div>
                      <div className="text-xs text-gray-400">Full width content</div>
                    </div>
                  </Button>
                  <Button
                    onClick={() => addRow(2)}
                    variant="outline"
                    className="h-32 flex flex-col items-center justify-center gap-3 border-gray-600 hover:border-indigo-500 hover:bg-indigo-500/10"
                  >
                    <Grid3X3 className="w-8 h-8" />
                    <div className="text-center">
                      <div className="font-semibold">Two Columns</div>
                      <div className="text-xs text-gray-400">Side by side layout</div>
                    </div>
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          blocks.map((row, rowIndex) => (
            <Card key={row.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <CardTitle className="text-sm text-white">Row {rowIndex + 1}</CardTitle>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addColumn(row.id)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => duplicateRow(row.id)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedBlock(selectedBlock === row.id ? null : row.id)}
                    >
                      <Settings className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRow(row.id)}
                      disabled={blocks.length === 1}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {selectedBlock === row.id && (
                <CardContent className="pt-0 border-t border-gray-700">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label>Padding</Label>
                      <Select value={row.padding === "" ? "none" : (row.padding || "py-8")} onValueChange={(value) => updateRow(row.id, { padding: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="p-2">Small</SelectItem>
                          <SelectItem value="p-4">Medium</SelectItem>
                          <SelectItem value="p-6">Large</SelectItem>
                          <SelectItem value="py-8">Y-Large</SelectItem>
                          <SelectItem value="py-12">Y-XLarge</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Gap</Label>
                      <Select value={row.gap === "" ? "none" : (row.gap || "gap-6")} onValueChange={(value) => updateRow(row.id, { gap: value === "none" ? "" : value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="gap-2">Small</SelectItem>
                          <SelectItem value="gap-4">Medium</SelectItem>
                          <SelectItem value="gap-6">Large</SelectItem>
                          <SelectItem value="gap-8">X-Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Align Items</Label>
                      <Select value={row.alignItems || "stretch"} onValueChange={(value: any) => updateRow(row.id, { alignItems: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">Start</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="end">End</SelectItem>
                          <SelectItem value="stretch">Stretch</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Justify</Label>
                      <Select value={row.justifyContent || "start"} onValueChange={(value: any) => updateRow(row.id, { justifyContent: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="start">Start</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="end">End</SelectItem>
                          <SelectItem value="between">Between</SelectItem>
                          <SelectItem value="around">Around</SelectItem>
                          <SelectItem value="evenly">Evenly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              )}

              <CardContent className="pt-0">
                <div className={`grid gap-6`} style={{gridTemplateColumns: `repeat(${row.columns.length}, 1fr)`}}>
                  {row.columns.map((column, columnIndex) => (
                    <div key={column.id} className="space-y-2 min-w-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-gray-400">Column {columnIndex + 1}</Label>
                        <div className="flex gap-1">
                          <ObjectUploader
                            onGetUploadParameters={handleImageUpload}
                            onComplete={handleImageUploadComplete(row.id, column.id)}
                            maxNumberOfFiles={1}
                            buttonClassName="h-6 w-6 p-0"
                          >
                            <Image className="w-3 h-3" />
                          </ObjectUploader>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedColumn(selectedColumn === column.id ? null : column.id)}
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteColumn(row.id, column.id)}
                            disabled={row.columns.length === 1}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {selectedColumn === column.id && (
                        <div className="grid grid-cols-2 gap-2 p-3 bg-gray-900 rounded border">
                          <div>
                            <Label className="text-xs">Width</Label>
                            <Select value={column.width} onValueChange={(value: any) => updateColumn(row.id, column.id, { width: value })}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({length: 12}, (_, i) => i + 1).map(num => (
                                  <SelectItem key={num} value={num.toString()}>{num}/12</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">Padding</Label>
                            <Select value={column.padding === "" ? "none" : (column.padding || "p-6")} onValueChange={(value) => updateColumn(row.id, column.id, { padding: value === "none" ? "" : value })}>
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                <SelectItem value="p-2">Small</SelectItem>
                                <SelectItem value="p-4">Medium</SelectItem>
                                <SelectItem value="p-6">Large</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      <Textarea
                        value={column.content}
                        onChange={(e) => updateColumn(row.id, column.id, { content: e.target.value })}
                        className="min-h-[200px] bg-gray-900 border-gray-600 text-white resize-vertical"
                        placeholder="Enter content (Markdown supported)..."
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}