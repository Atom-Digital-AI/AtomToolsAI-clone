import { useState, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export default function TagInput({ value = [], onChange, placeholder, "data-testid": testId }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
      setInputValue("");
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(value.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          data-testid={testId}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-gray-800 border-gray-700 text-white"
        />
        <Button
          data-testid={`${testId}-add`}
          type="button"
          variant="outline"
          size="icon"
          onClick={addTag}
          className="border-gray-700 hover:bg-gray-800"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, index) => (
            <div
              key={index}
              data-testid={`${testId}-tag-${index}`}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-600/20 border border-indigo-600/50 rounded-full text-sm text-indigo-300"
            >
              <span>{tag}</span>
              <button
                data-testid={`${testId}-remove-${index}`}
                type="button"
                onClick={() => removeTag(index)}
                className="hover:text-indigo-100 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
