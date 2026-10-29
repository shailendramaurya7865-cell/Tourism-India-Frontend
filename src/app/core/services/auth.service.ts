
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environments';
import { CsrfService } from '../../csrf.service';

export interface AuthUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  profileImgUrl?: string | null;
  picture?: string | null;
  role?: string;
}

export interface GoogleLoginResponse {
  success?: boolean;
  message?: string;
  user?: AuthUser;
  [key: string]: unknown;
}

interface SessionResponse {
  user?: AuthUser | null;
  [key: string]: unknown;
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

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  setCurrentUser(user: AuthUser): void {
    this.currentUserSubject.next(user);
  }

  clearCurrentUser(): void {
    this.currentUserSubject.next(null);
  }

  /**
   * Restore the current user's session after a page refresh.
   */

  restoreSession(): Observable<AuthUser | null> {
    return this.http
      .get<AuthUser | { user: AuthUser | null }>(
        `${this.apiUrl}/me`,
        { withCredentials: true }
      )
      .pipe(
        map((response): AuthUser | null => {
          if ('user' in response) {
            return response.user ?? null;
          }

          return response;
        }),

        tap((user: AuthUser | null) => {
          if (user) {
            this.setCurrentUser(user);
          } else {
            this.clearCurrentUser();
          }
        }),

        catchError(error => {
          this.clearCurrentUser();

          if (error?.status === 401 || error?.status === 403) {
            return of(null);
          }

          console.error('Session restoration failed:', error);
          return of(null);
        })
      );
  }


  /**
   * Initialize CSRF, perform Google login, then refresh CSRF
   * because authentication can change the session.
   */
  loginWithGoogle(idToken: string): Observable<GoogleLoginResponse> {
    return this.csrfService.initialize().pipe(
      switchMap(() =>
        this.http.post<GoogleLoginResponse>(
          `${this.apiUrl}/google`,
          { idToken },
          { withCredentials: true }
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
   * Refresh CSRF before logout, send the logout POST,
   * clear local auth state, then obtain a fresh anonymous token.
   */
  logout(): Observable<void> {
    return this.csrfService.refresh().pipe(
      switchMap(() =>
        this.http.post<void>(
          `${this.apiUrl}/logout`,
          {},
          { withCredentials: true }
        )
      ),

      tap(() => {
        this.clearCurrentUser();
      }),

      switchMap(() => this.csrfService.refresh())
    );
  }
}
