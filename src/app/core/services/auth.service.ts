
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  catchError,
  finalize,
  map,
  shareReplay,
  tap
} from 'rxjs/operators';

import { environment } from '../../../environments/environments';

export interface AuthUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  picture?: string | null;
  profileImgUrl?: string | null;
  role?: string;
}

interface AuthResponse {
  success?: boolean;
  message?: string;
  user?: AuthUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserSubject =
    new BehaviorSubject<AuthUser | null>(null);

  readonly currentUser$ = this.currentUserSubject.asObservable();

  private sessionChecked = false;
  private sessionRequest?: Observable<AuthUser | null>;

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Call after the backend confirms a successful login.
   */
  setCurrentUser(user: AuthUser): void {
    this.currentUserSubject.next(user);
    this.sessionChecked = true;
    this.sessionRequest = undefined;
  }

  /**
   * Ask the backend whether this browser has an active session.
   * Call during application startup and before displaying the profile.
   */
  restoreSession(): Observable<AuthUser | null> {
    if (this.sessionChecked) {
      return of(this.currentUser);
    }

    if (this.sessionRequest) {
      return this.sessionRequest;
    }

    this.sessionRequest = this.http
      .get<AuthUser | AuthResponse>(`${this.apiUrl}/me`, {
        withCredentials: true
      })
      .pipe(
        map((response) => {
          // Supports either a direct user response or { user: ... }.
          if ('user' in response && response.user) {
            return response.user;
          }

          if ('id' in response && 'email' in response) {
            return response as AuthUser;
          }

          return null;
        }),
        tap((user) => this.currentUserSubject.next(user)),
        catchError((error: HttpErrorResponse) => {
          // No session is normal when a visitor is logged out.
          if (error.status !== 401 && error.status !== 403) {
            console.error('Could not restore login session:', error);
          }

          this.currentUserSubject.next(null);
          return of(null);
        }),
        finalize(() => {
          this.sessionChecked = true;
          this.sessionRequest = undefined;
        }),
        shareReplay(1)
      );

    return this.sessionRequest;
  }

  /**
   * End the server session, then clear the Angular login state.
   */
  logout(): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/logout`, {}, {
        withCredentials: true
      })
      .pipe(
        tap(() => this.clearCurrentUser())
      );
  }

  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
    this.sessionChecked = true;
    this.sessionRequest = undefined;
  }
}
