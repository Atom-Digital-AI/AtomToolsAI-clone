import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useBrandProfiles } from '@/hooks/useGuidelineProfiles';
import type { GuidelineProfile } from '@shared/schema';

interface BrandContextType {
  selectedBrand: GuidelineProfile | null;
  setSelectedBrand: (brand: GuidelineProfile | null) => void;
  brandProfiles: GuidelineProfile[];
  isLoading: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const [selectedBrand, setSelectedBrandState] = useState<GuidelineProfile | null>(null);

  // Fetch all brand profiles using centralized hook
  const { data: brandProfiles = [], isLoading } = useBrandProfiles();

  // Load selected brand from localStorage on mount
  useEffect(() => {
    const savedBrandId = localStorage.getItem('selectedBrandId');
    if (savedBrandId && brandProfiles.length > 0) {
      const brand = brandProfiles.find(b => b.id === savedBrandId);
      if (brand) {
        setSelectedBrandState(brand);
      } else {
        // Clear invalid saved brand
        localStorage.removeItem('selectedBrandId');
      }
    }
  }, [brandProfiles]);

  const setSelectedBrand = (brand: GuidelineProfile | null) => {
    setSelectedBrandState(brand);
    if (brand) {
      localStorage.setItem('selectedBrandId', brand.id);
    } else {
      localStorage.removeItem('selectedBrandId');
    }
  };

  return (
    <BrandContext.Provider value={{ selectedBrand, setSelectedBrand, brandProfiles, isLoading }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}
