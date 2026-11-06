import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { Observable, map } from 'rxjs';

import { ApiResponse } from '../models/api-response.model';
import { State, StateStats } from '../models/state.model';

@Injectable({
  providedIn: 'root'
})
export class StateService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/states`;

  // Get all states
  getStates(): Observable<State[]> {
    return this.http
      .get<ApiResponse<State[]> | State[]>(this.apiUrl)
      .pipe(map(response =>
        Array.isArray(response) ? response : response.data ?? []
      ));
  }

  // Get active states
  getActiveStates(): Observable<State[]> {
    return this.http
      .get<ApiResponse<State[]> | State[]>(`${this.apiUrl}/active`)
      .pipe(map(response =>
        Array.isArray(response) ? response : response.data ?? []
      ));
  }

  // Get inactive states
  getInactiveStates(): Observable<State[]> {
    return this.http
      .get<ApiResponse<State[]> | State[]>(`${this.apiUrl}/inactive`)
      .pipe(map(response =>
        Array.isArray(response) ? response : response.data ?? []
      ));
  }

  // Get featured states
  getFeaturedStates(): Observable<State[]> {
    return this.http
      .get<ApiResponse<State[]> | State[]>(`${this.apiUrl}/featured`)
      .pipe(map(response =>
        Array.isArray(response) ? response : response.data ?? []
      ));
  }

  // Get state statistics
  getStateStats(): Observable<StateStats> {
    return this.http
      .get<ApiResponse<StateStats>>(`${this.apiUrl}/stats`)
      .pipe(map(response => response.data));
  }

  // Create state
  createState(payload: Partial<State>): Observable<State> {
    return this.http
      .post<ApiResponse<State> | State>(this.apiUrl, payload)
      .pipe(map(response =>
        'data' in response ? response.data : response
      ));
  }

  // Update state
  updateState(id: number, payload: Partial<State>): Observable<State> {
    return this.http
      .put<ApiResponse<State> | State>(`${this.apiUrl}/${id}`, payload)
      .pipe(map(response =>
        'data' in response ? response.data : response
      ));
  }

  // Delete state
  deleteState(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}