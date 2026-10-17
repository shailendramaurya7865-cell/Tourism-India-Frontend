import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { Observable, forkJoin, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { TouristPlace } from '../models/tourist-place.model';


@Injectable({
  providedIn: 'root'
})
export class TouristPlaceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getTouristPlaces(): Observable<TouristPlace[]> {
    return this.http
      .get<ApiResponse<TouristPlace[]> | TouristPlace[]>(
        `${this.apiUrl}/tourist-places`
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