import { useBrand } from '@/contexts/BrandContext';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Briefcase, X } from 'lucide-react';

export default function BrandSelector() {
  const { selectedBrand, setSelectedBrand, brandProfiles, isLoading } = useBrand();

  if (isLoading || brandProfiles.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2" data-testid="brand-selector-container">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Briefcase className="h-4 w-4" />
        <span className="hidden sm:inline">Brand:</span>
      </div>
      
      {selectedBrand ? (
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-primary/10 text-primary rounded-md text-sm flex items-center gap-2">
            <span data-testid="text-selected-brand">{selectedBrand.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 hover:bg-primary/20"
              onClick={() => setSelectedBrand(null)}
              data-testid="button-clear-brand"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <Select
          value=""
          onValueChange={(value) => {
            const brand = brandProfiles.find(b => b.id === value);
            if (brand) setSelectedBrand(brand);
          }}
        >
          <SelectTrigger className="w-[200px]" data-testid="select-brand">
            <SelectValue placeholder="Select a brand" />
          </SelectTrigger>
          <SelectContent>
            {brandProfiles.map((brand) => (
              <SelectItem key={brand.id} value={brand.id} data-testid={`option-brand-${brand.id}`}>
                {brand.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
