
export interface AdminCity {
  id: number;
  name: string;
  code: string | null;
  slug: string | null;
  imageUrl: string | null;
  tagline: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;

  stateId: number;
  stateName: string;
  stateCode: string | null;
}

export interface AdminCityDetail extends AdminCity {
  description: string | null;
  config: Record<string, unknown>;
}

export interface CityStats {
  totalCities: number;
  activeCities: number;
  inactiveCities: number;
  featuredCities: number;
}

export interface CityRequest {
  name: string;
  code: string | null;
  slug: string | null;
  tagline: string | null;
  description: string | null;
  imageUrl: string | null;
  stateId: number;
  isFeatured: boolean;
  isActive: boolean;
  config: Record<string, unknown>;
}
