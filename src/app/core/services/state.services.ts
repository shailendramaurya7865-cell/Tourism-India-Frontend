import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environments';
import { ApiResponse } from '../models/api-response.model';

import {
  AdminState,
  AdminStateDetail,
  StateStats,
  StateRequest
} from '../../features/admin/models/admin-state.model';

@Injectable({
  providedIn: 'root'
})
export class StateService {

  private readonly http = inject(HttpClient);
  private readonly statesUrl = `${environment.apiUrl}/states`;
  private readonly adminStatesUrl = `${environment.apiUrl}/admin/states`;

  // Unwrap ApiResponse<T> or direct T response
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

  getStates(): Observable<any[]> {
    return this.http
      .get<ApiResponse<any[]> | any[]>(this.statesUrl)
      .pipe(map(response => this.unwrap(response)));
  }

  // ================= ADMIN APIs =================

  // Get lightweight state list for admin table
  getAdminStates(): Observable<AdminState[]> {
    return this.http
      .get<ApiResponse<AdminState[]> | AdminState[]>(
        this.adminStatesUrl
      )
      .pipe(map(response => this.unwrap(response)));
  }

  // Get complete state details for editing
  getAdminStateById(id: number): Observable<AdminStateDetail> {
    return this.http
      .get<ApiResponse<AdminStateDetail> | AdminStateDetail>(
        `${this.adminStatesUrl}/${id}`
      )
      .pipe(map(response => this.unwrap(response)));
  }

  // Get state statistics
  getStateStats(): Observable<StateStats> {
    return this.http
      .get<ApiResponse<StateStats> | StateStats>(
        `${this.adminStatesUrl}/stats`
      )
      .pipe(map(response => this.unwrap(response)));
  }

  // Create state
  createState(payload: StateRequest): Observable<AdminStateDetail> {
    return this.http
      .post<ApiResponse<AdminStateDetail> | AdminStateDetail>(
        this.adminStatesUrl,
        payload
      )
      .pipe(map(response => this.unwrap(response)));
  }

  // Update state
  updateState(
    id: number,
    payload: StateRequest
  ): Observable<AdminStateDetail> {
    return this.http
      .put<ApiResponse<AdminStateDetail> | AdminStateDetail>(
        `${this.adminStatesUrl}/${id}`,
        payload
      )
      .pipe(map(response => this.unwrap(response)));
  }

  // Delete state
  deleteState(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.adminStatesUrl}/${id}`
    );
  }
}