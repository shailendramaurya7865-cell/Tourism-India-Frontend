import { State } from './state.model';

export interface City {
  id: number;
  name: string;
  state?: State;
  stateId?: number;
  stateName?: string;
  imageUrl?: string;
  shortDescription?: string;
  about?: string;
  bestTimeToVisit?: string;
  averageRating?: number;
  reviewCount?: number;
  activities?: string[];
  latitude?: number;
  longitude?: number;
}