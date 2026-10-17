import { City } from './city.model';
import { State } from './state.model';
import { Category } from './category.model';

export interface PlaceRating {
  average: number;
  totalReviews: number;
}

export interface PlaceLocation {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

export interface Timing {
  openTime: string | null;
  closeTime: string | null;
  closedDays: string[];
}

export interface EntryFees {
  indianAdult: number | null;
  currency: string;
}

export interface VisitorInformation {
  timing: Timing;
  entryFees: EntryFees;
  bestTimeToVisit: string | null;
}

export interface NearbyPlace {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  cityName: string;
  stateName: string;
  rating: PlaceRating;
  distanceKm: number | null;
}

export interface TouristPlaceDetail {
  id: number;
  name: string;
  slug: string;
  placeholderImage: string;
  description: string;
  shortDescription: string;
  city: City;
  state?: State;
  visitorInformationDto: VisitorInformation;
  rating: PlaceRating;
  categories: Category[];
  nearByPlace: NearbyPlace[];
  locationDto: PlaceLocation;
  howToReach: string[];
}

export interface TouristPlaceDetailData {
  place: TouristPlaceDetail;
  nearbyPlaces?: NearbyPlace[];
}