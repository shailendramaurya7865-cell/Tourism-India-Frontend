
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';
import { City } from '../models/city.model';

import {
  AdminCity,
  AdminCityDetail,
  CityStats,
  CityRequest
} from '../../features/admin/models/admin-city.model';

@Injectable({
  providedIn: 'root'
})
export class CityService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly adminCitiesUrl = `${environment.apiUrl}/admin/cities`;

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

  getCities(): Observable<City[]> {
    return this.http
      .get<ApiResponse<City[]> | City[]>(
        `${this.apiUrl}/cities`
      )
      .pipe(
        map(response =>
          Array.isArray(response) ? response : response.data ?? []
        )
      );
  }

  getCitiesByStateId(stateId: number): Observable<City[]> {
    const params = new HttpParams().set('stateId', stateId);
    return this.http
      .get<ApiResponse<City[]> | City[]>(
        `${this.apiUrl}/cities`,
        { params }
      )
      .pipe(
        map(response =>
          Array.isArray(response) ? response : response.data ?? []
        )
      );
  }

  // ================= ADMIN APIs =================



  // Get admin cities by state ID
  getAdminCitiesByStateId(stateId: number): Observable<AdminCity[]> {
    return this.http
      .get<ApiResponse<AdminCity[]> | AdminCity[]>(
        `${this.adminCitiesUrl}/by-state/${stateId}`
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Get lightweight city list
  getAdminCities(): Observable<AdminCity[]> {
    return this.http
      .get<ApiResponse<AdminCity[]> | AdminCity[]>(
        this.adminCitiesUrl
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Get complete city details
  getAdminCityById(id: number): Observable<AdminCityDetail> {
    return this.http
      .get<ApiResponse<AdminCityDetail> | AdminCityDetail>(
        `${this.adminCitiesUrl}/${id}`
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Get city statistics
  getCityStats(): Observable<CityStats> {
    return this.http
      .get<ApiResponse<CityStats> | CityStats>(
        `${this.adminCitiesUrl}/stats`
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Create city
  createCity(payload: CityRequest): Observable<AdminCityDetail> {
    return this.http
      .post<ApiResponse<AdminCityDetail> | AdminCityDetail>(
        this.adminCitiesUrl,
        payload
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Update city
  updateCity(
    id: number,
    payload: CityRequest
  ): Observable<AdminCityDetail> {
    return this.http
      .put<ApiResponse<AdminCityDetail> | AdminCityDetail>(
        `${this.adminCitiesUrl}/${id}`,
        payload
      )
      .pipe(
        map(response => this.unwrap(response))
      );
  }

  // Delete city
  deleteCity(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.adminCitiesUrl}/${id}`
    );
  }
}
