import { Category } from './category.model';
import { City } from './city.model';
import { State } from './state.model';

export interface TouristPlace {
  id: number;
  name: string;
  slug?: string;
  cityName?: string;
  stateName?: string;
  averageRating?: number;
  reviewCount?: number;
}