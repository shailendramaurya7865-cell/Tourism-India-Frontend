import { Category } from './category.model';
import { City } from './city.model';
import { State } from './state.model';

export interface TouristPlace {
  id: number;
  title: string;
  slug?: string;
  imageUrl?: string;
  cityName?: string;
  stateName?: string;
  avgRating?: number;
  reviewCount?: number;
}