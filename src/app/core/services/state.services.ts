import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environments';
import { Observable, forkJoin, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { State } from '../models/state.model';


@Injectable({
  providedIn: 'root'
})
export class StateService {
  private readonly http = inject(HttpClient);
    private readonly apiUrl = environment.apiUrl;

  getStates(): Observable<State[]> {
    return this.http
      .get<ApiResponse<State[]> | State[]>(
        `${this.apiUrl}/states`
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