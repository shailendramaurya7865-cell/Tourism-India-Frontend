export interface AdminTouristPlace {
  id: number;
  name: string;
  slug: string;
  tagline: string | null;
  imageUrl: string | null;
  cityId: number;
  cityName: string;
  stateName: string;
  isFeatured: boolean;
  isActive: boolean;
  averageRating: number | null;
  reviewCount: number;
  categoryNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminTouristPlaceDetail extends AdminTouristPlace {
  shortDescription: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  entryFee: number | null;
  openingTime: string | null;
  closingTime: string | null;
  bestTimeToVisit: string | null;
  timeRequired: string | null;
  weeklyOf: string | null;
  howToReach: string | null;
  categoryIds: number[];
}

export interface TouristPlaceStats {
  totalTouristPlaces: number;
  activeTouristPlaces: number;
  inactiveTouristPlaces: number;
  featuredTouristPlaces: number;
}

export interface TouristPlaceRequest {
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  tagline: string | null;
  cityId: number;
  categoryIds: number[];
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  entryFee: number | null;
  openingTime: string | null;
  closingTime: string | null;
  bestTimeToVisit: string | null;
  timeRequired: string | null;
  weeklyOf: string | null;
  howToReach: string | null;
  imageUrl: string | null;
  isFeatured: boolean;
  isActive: boolean;
}