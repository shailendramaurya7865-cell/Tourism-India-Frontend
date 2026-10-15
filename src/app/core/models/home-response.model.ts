import { TouristPlace } from './tourist-place.model';
import { Category } from './category.model';

export interface HomeResponse {
  featuredDestinations: TouristPlace[];
  categories: Category[];
}