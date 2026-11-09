export interface AdminCategory {
  id: number;
  name: string;
  slug: string;
  iconUrl: string | null;
  isActive: boolean;
  touristPlaceCount:number,
  createdAt: string;
  updatedAt: string;
}

export interface AdminCategoryDetail extends AdminCategory {
  description: string | null;
  config: Record<string, unknown>;
  touristPlaceCount: number;
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  categoriesWithPlaces: number;
}

export interface CategoryRequest {
  name: string;
  slug: string | null;
  iconUrl: string | null;
  description: string | null;
  isActive: boolean;
  config: Record<string, unknown>;
}