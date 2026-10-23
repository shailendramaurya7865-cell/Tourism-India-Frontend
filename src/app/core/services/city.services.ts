import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams  } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { Observable, forkJoin, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { City } from '../models/city.model';


@Injectable({
  providedIn: 'root'
})
export class CityService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getCities(): Observable<City[]> {
    return this.http
      .get<ApiResponse<City[]> | City[]>(
        `${this.apiUrl}/cities`
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

  getCitiesByStateId(stateId: number): Observable<City[]> {
  const params = new HttpParams().set('stateId', stateId);

  return this.http
    .get<ApiResponse<City[]> | City[]>(`${this.apiUrl}/cities`, { params })
    .pipe(
      map(response =>
        Array.isArray(response) ? response : response.data ?? []
      )
    );
}
}