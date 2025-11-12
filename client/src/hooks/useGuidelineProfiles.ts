import { useQuery } from "@tanstack/react-query";
import type { GuidelineProfile } from "@shared/schema";

/**
 * Centralized hook for fetching guideline profiles.
 * Always fetches all profiles from the server, then filters client-side by type if needed.
 * This ensures React Query can properly deduplicate requests across components.
 * 
 * @param type - Optional filter to return only 'brand' or 'regulatory' profiles
 * @returns Query result with filtered profiles
 */
export function useGuidelineProfiles(type?: 'brand' | 'regulatory') {
  const query = useQuery<GuidelineProfile[]>({
    queryKey: ['guideline-profiles', type ? { type } : undefined].filter(Boolean),
    queryFn: async () => {
      const response = await fetch('/api/guideline-profiles', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch guideline profiles');
      }
      const allProfiles = await response.json();
      
      // Filter client-side if type is specified
      if (type) {
        return allProfiles.filter((profile: GuidelineProfile) => profile.type === type);
      }
      
      return allProfiles;
    },
  });

  return query;
}

/**
 * Hook to fetch only brand guideline profiles
 */
export function useBrandProfiles() {
  return useGuidelineProfiles('brand');
}

/**
 * Hook to fetch only regulatory guideline profiles
 */
export function useRegulatoryProfiles() {
  return useGuidelineProfiles('regulatory');
}

