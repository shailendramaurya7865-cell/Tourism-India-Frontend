import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, tap } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { HomeResponse } from '../models/home-response.model';
import { TouristPlace } from '../models/tourist-place.model';
import { Category } from '../models/category.model';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getHomeData(): Observable<ApiResponse<HomeResponse>> {
    console.log('Homepage API URL:', this.apiUrl);

    return forkJoin({
      places: this.http.get<ApiResponse<TouristPlace[]>>(
        `${this.apiUrl}/tourist-places/featured`
      ).pipe(
        tap(response => {
          console.log('Featured Places API Response:', response);
          console.log('Featured Places Data:', response.data);
        })
      ),

      categories: this.http.get<ApiResponse<Category[]>>(
        `${this.apiUrl}/categories`
      ).pipe(
        tap(response => {
          console.log('Categories API Response:', response);
          console.log('Categories Data:', response.data);
        })
      )
    }).pipe(
      map(({ places, categories }) => {
        const result: ApiResponse<HomeResponse> = {
          success: places.success && categories.success,
          message: 'Homepage data loaded successfully.',
          data: {
            featuredDestinations: places.data ?? [],
            categories: categories.data ?? []
          }
        };

        console.log('Combined Homepage Data:', result);
        console.log(
          'Featured Destinations:',
          result.data.featuredDestinations
        );
        console.log('Homepage Categories:', result.data.categories);

        return result;
      }),

      tap({
        error: error => {
          console.error('Error loading homepage data:', error);
        }
      })
    );
  }
}