import { State } from './state.model';
import { TouristPlace } from './tourist-place.model';

export interface StateDetailState {
  id: number;
  name: string;
  slug: string;
  imageUrl: string;
  tagLine: string;
  description: string;
}

export interface PopularCity {
  id: number;
  slug: string;
  name: string;
  imageUrl: string;
  cityDescription: string;
}



export interface StateDetailData {
  state: StateDetailState;
  popularCities: PopularCity[];
  topTouristPlaces: TouristPlace[];
}