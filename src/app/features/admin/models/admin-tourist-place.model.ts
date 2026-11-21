export interface AdminTouristPlace {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  cityId: number;
  cityName: string;
  stateName: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminTouristPlaceDetail extends AdminTouristPlace {
  tagline: string | null;
  averageRating: number | null;
  reviewCount: number;
  categoryNames: string[];
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

export interface AdminNearbyPlace {
  id: number;
  placeName: string;
  distanceKm: number | null;
  pending?: boolean;
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