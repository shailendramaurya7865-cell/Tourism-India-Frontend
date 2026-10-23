
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { TouristPlace } from '../models/tourist-place.model';

export interface CategoryPlaceFilters {
  stateId?: number | null;
  cityId?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryExplorationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getTouristPlacesByCategory(
    slug: string,
    filters: CategoryPlaceFilters = {}
  ): Observable<TouristPlace[]> {

    let params = new HttpParams();

    if (filters.stateId != null) {
      params = params.set('stateId', filters.stateId);
    }

    if (filters.cityId != null) {
      params = params.set('cityId', filters.cityId);
    }

    return this.http
      .get<ApiResponse<TouristPlace[]> | TouristPlace[]>(
        `${this.apiUrl}/tourist-places/category/${encodeURIComponent(slug)}`,
        { params }
      )
      .pipe(
        map(response => {
          if (Array.isArray(response)) {
            return response;
          }

          return response.data ?? [];
        })
      );
  }
}
