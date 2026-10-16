import { TouristPlace } from './tourist-place.model';

export interface CityDetailCity {
  id: number;
  slug: string;
  name: string;
  imageUrl: string;
  stateId: number;
  stateName: string;
  cityDescription: string;
  cityTagLine: string;

}

export interface NearbyCity {
  id: number;
  name: string;
  imageUrl: string;
  stateId: number;
  stateName: string;
  distanceFromSource: number;
}

export interface CityDetailData {
  city: CityDetailCity;
  topTouristPlaces: TouristPlace[];
  nearByCities: NearbyCity[];
}