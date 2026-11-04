
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import {
  BehaviorSubject,
  Observable,
  of
} from 'rxjs';

import {
  catchError,
  map,
  switchMap,
  tap
} from 'rxjs/operators';

import { environment } from '../../../environments/environments';
import { CsrfService } from '../../csrf.service';

export interface AuthUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  username?: string | null;
  email: string;
  phone?: string | null;
  profileImgUrl?: string | null;
  picture?: string | null;
  role?: string | null;
}

export interface LoginResponse {
  success?: boolean;
  message?: string;
  user?: AuthUser;
}

export interface GoogleLoginResponse extends LoginResponse {}

interface SessionResponse {
  success?: boolean;
  user?: AuthUser | null;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);
  private readonly csrfService = inject(CsrfService);

  private readonly apiUrl =
    `${environment.apiUrl.replace(/\/+$/, '')}/auth`;

  private readonly currentUserSubject =
    new BehaviorSubject<AuthUser | null>(null);

  readonly currentUser$ =
    this.currentUserSubject.asObservable();

  /**
   * Current authenticated user.
   */
  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  /**
   * Update authenticated user.
   */
  setCurrentUser(user: AuthUser): void {
    this.currentUserSubject.next(user);
  }

  /**
   * Clear authenticated user.
   */
  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
  }

  /**
   * Restore the server-side session after page refresh.
   *
   * Backend:
   * GET /auth/me
   */
  restoreSession(): Observable<AuthUser | null> {

    return this.http.get<SessionResponse>(
      `${this.apiUrl}/me`,
      {
        withCredentials: true
      }
    ).pipe(

      map(response => response.user ?? null),

      tap(user => {
        if (user) {
          this.setCurrentUser(user);
        } else {
          this.clearCurrentUser();
        }
      }),

      catchError(error => {

        this.clearCurrentUser();

        if (
          error?.status !== 401 &&
          error?.status !== 403
        ) {
          console.error(
            'Session restoration failed:',
            error
          );
        }

        return of(null);
      })
    );
  }

  /**
   * Login using email or phone and password.
   *
   * Backend:
   * POST /auth/login
   */
  loginWithPassword(
    identifier: string,
    password: string
  ): Observable<LoginResponse> {

    return this.csrfService.initialize().pipe(

      switchMap(() =>
        this.http.post<LoginResponse>(
          `${this.apiUrl}/login`,
          {
            identifier: identifier.trim(),
            password
          },
          {
            withCredentials: true
          }
        )
      ),

      switchMap(response => {

        if (!response?.success || !response.user) {
          return of(response);
        }

        this.setCurrentUser(response.user);

        // Refresh CSRF token for the authenticated session.
        return this.csrfService.refresh().pipe(
          map(() => response)
        );
      })
    );
  }

  /**
   * Google authentication.
   *
   * Backend:
   * POST /auth/google
   */
  loginWithGoogle(
    idToken: string
  ): Observable<GoogleLoginResponse> {

    return this.csrfService.initialize().pipe(

      switchMap(() =>
        this.http.post<GoogleLoginResponse>(
          `${this.apiUrl}/google`,
          {
            idToken
          },
          {
            withCredentials: true
          }
        )
      ),

      switchMap(response => {

        if (!response?.success || !response.user) {
          return of(response);
        }

        this.setCurrentUser(response.user);

        return this.csrfService.refresh().pipe(
          map(() => response)
        );
      })
    );
  }

  /**
   * Logout and invalidate the server-side session.
   *
   * Backend:
   * POST /auth/logout
   */
  logout(): Observable<void> {

    return this.csrfService.refresh().pipe(

      switchMap(() =>
        this.http.post<void>(
          `${this.apiUrl}/logout`,
          {},
          {
            withCredentials: true
          }
        )
      ),

      tap(() => {
        this.clearCurrentUser();
      }),

      // Obtain a fresh CSRF token for the anonymous session.
      switchMap(() =>
        this.csrfService.refresh()
      )
    );
  }
}
