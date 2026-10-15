import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { StateDetailData } from '../models/state-detail-response.model';

@Injectable({
  providedIn: 'root'
})
export class StateDetailService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  getStateDetail(
    stateId: number
  ): Observable<ApiResponse<StateDetailData>> {

    const url = `${this.apiUrl}/states/${stateId}`;

    console.log('State Detail API URL:', url);

    return this.http
      .get<ApiResponse<StateDetailData>>(url)
      .pipe(
        tap({
          next: response => {
            console.log('State Detail API Response:', response);
            console.log('State:', response.data?.state);
            console.log(
              'Popular Cities:',
              response.data?.popularCities
            );
            console.log(
              'Top Tourist Places:',
              response.data?.topTouristPlaces
            );
          },
          error: error => {
            console.error('Error loading state detail:', error);
          }
        })
      );
  }
}