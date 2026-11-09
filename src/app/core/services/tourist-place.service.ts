import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { TouristPlace } from '../models/tourist-place.model';

import {
  AdminTouristPlace,
  AdminTouristPlaceDetail,
  TouristPlaceStats,
  TouristPlaceRequest
} from '../../features/admin/models/admin-tourist-place.model';

@Injectable({
  providedIn: 'root'
})
export class TouristPlaceService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly adminTouristPlacesUrl =
    `${environment.apiUrl}/admin/tourist-places`;

  // ================= RESPONSE HANDLER =================

  private unwrap<T>(response: ApiResponse<T> | T): T {
    if (
      response !== null &&
      typeof response === 'object' &&
      'data' in response
    ) {
      return (response as ApiResponse<T>).data;
    }

    return response as T;
  }

  // ================= PUBLIC APIs =================

  // Get all tourist places
  getTouristPlaces(): Observable<TouristPlace[]> {
    return this.http
      .get<ApiResponse<TouristPlace[]> | TouristPlace[]>(
        `${this.apiUrl}/tourist-places`
      )
      .pipe(
        map(response => this.unwrap(response) ?? [])
      );
  }

  // Get tourist places by city ID
  getTouristPlacesByCityId(cityId: number): Observable<TouristPlace[]> {

    const params = new HttpParams().set('cityId', cityId);

    return this.http
      .get<ApiResponse<TouristPlace[]> | TouristPlace[]>(
        `${this.apiUrl}/tourist-places`,
        { params }
      )
      .pipe(
        map(response => this.unwrap(response) ?? [])
      );
  }

  // Get tourist place details by ID
  getTouristPlaceById(id: number): Observable<TouristPlace> {
    return this.http
      .get<ApiResponse<TouristPlace> | TouristPlace>(
        `${this.apiUrl}/tourist-places/${id}`
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // ================= ADMIN APIs =================

  // Get lightweight tourist place list
  getAdminTouristPlaces(): Observable<AdminTouristPlace[]> {
    return this.http
      .get<ApiResponse<AdminTouristPlace[]> | AdminTouristPlace[]>(
        this.adminTouristPlacesUrl
      )
      .pipe(
        map(response => this.unwrap(response) ?? [])
      );
  }

  // Get complete tourist place details
  getAdminTouristPlaceById(
    id: number
  ): Observable<AdminTouristPlaceDetail> {
    return this.http
      .get<
        ApiResponse<AdminTouristPlaceDetail> |
        AdminTouristPlaceDetail
      >(`${this.adminTouristPlacesUrl}/${id}`)
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Get tourist place statistics
  getTouristPlaceStats(): Observable<TouristPlaceStats> {
    return this.http
      .get<ApiResponse<TouristPlaceStats> | TouristPlaceStats>(
        `${this.adminTouristPlacesUrl}/stats`
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Create tourist place
  createTouristPlace(
    payload: TouristPlaceRequest
  ): Observable<AdminTouristPlaceDetail> {
    return this.http
      .post<
        ApiResponse<AdminTouristPlaceDetail> |
        AdminTouristPlaceDetail
      >(
        this.adminTouristPlacesUrl,
        payload
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Update tourist place
  updateTouristPlace(
    id: number,
    payload: TouristPlaceRequest
  ): Observable<AdminTouristPlaceDetail> {
    return this.http
      .put<
        ApiResponse<AdminTouristPlaceDetail> |
        AdminTouristPlaceDetail
      >(
        `${this.adminTouristPlacesUrl}/${id}`,
        payload
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Delete tourist place
  deleteTouristPlace(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.adminTouristPlacesUrl}/${id}`
    );
  }
}