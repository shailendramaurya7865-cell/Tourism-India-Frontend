
import {
  AfterViewChecked,
  Component,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';

import { environment } from '../../../environments/environments';
import { AuthService } from '../../core/services/auth.service';

type LoginMethod = 'google' | 'phone' | 'email';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityServices {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    ux_mode?: 'popup' | 'redirect';
  }): void;

  renderButton(
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      width?: number;
    }
  ): void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleIdentityServices;
      };
    };
  }
}

interface GoogleLoginUser {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email: string;
  profileImgUrl?: string | null;
  picture?: string | null;
  role?: string;
}

interface GoogleLoginResponse {
  success: boolean;
  message: string;
  user: GoogleLoginUser;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements AfterViewChecked {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  // API base URL configured in the Angular environment.
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // Must match google.client-id in the Spring Boot configuration.
  private readonly googleClientId =
    '329854087820-aet9ru3vsj8r8htotv5bdu1rbkpvqjp0.apps.googleusercontent.com';

  selectedMethod: LoginMethod | null = null;

  phoneNumber = '';
  email = '';
  password = '';

  message = '';
  loading = false;

  private googleInitialized = false;
  private googleButtonRendered = false;

  ngAfterViewChecked(): void {
    this.renderGoogleButtonIfReady();
  }

  private renderGoogleButtonIfReady(): void {
    if (
      this.selectedMethod !== 'google' ||
      this.googleButtonRendered
    ) {
      return;
    }

    const googleId = window.google?.accounts?.id;
    const buttonContainer = document.getElementById('googleButton');

    // Wait for the Google script and conditional HTML element.
    if (!googleId || !buttonContainer) {
      return;
    }

    if (!this.googleInitialized) {
      googleId.initialize({
        client_id: this.googleClientId,
        callback: (response: GoogleCredentialResponse) => {
          this.handleGoogleCredential(response);
        },
        auto_select: false,
        ux_mode: 'popup'
      });

      this.googleInitialized = true;
    }

    buttonContainer.replaceChildren();

    googleId.renderButton(buttonContainer, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      width: 320
    });

    this.googleButtonRendered = true;
  }

  selectMethod(method: LoginMethod): void {
    this.selectedMethod = method;
    this.message = '';
    this.loading = false;
    this.googleButtonRendered = false;
  }

  continueWithGoogle(): void {
    this.selectedMethod = 'google';
    this.message = '';
    this.loading = false;
    this.googleButtonRendered = false;
  }

  private handleGoogleCredential(
    response: GoogleCredentialResponse
  ): void {
    if (!response?.credential) {
      this.message = 'Google did not return a valid credential.';
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.message = 'Verifying your Google account...';

    this.http.post<GoogleLoginResponse>(
      `${this.apiUrl}/google`,
      {
        // Google returns "credential"; the backend DTO expects "idToken".
        idToken: response.credential
      },
      {
        withCredentials: true
      }
    ).subscribe({
      next: (result) => {
        this.loading = false;

        if (!result?.success || !result.user) {
          this.message =
            result?.message ||
            'Google sign-in failed. Please try again.';
          return;
        }

        // Update shared authentication state so the navbar
        // immediately displays the profile icon.
        this.authService.setCurrentUser(result.user);

        const displayName =
          result.user.firstName ||
          result.user.name ||
          result.user.email;

        this.message = `Welcome, ${displayName}!`;

        // Navigate only after the backend confirms login.
        void this.router.navigateByUrl('/');
      },

      error: (error: HttpErrorResponse) => {
        this.loading = false;
        this.message = this.getGoogleLoginErrorMessage(error);

        console.error('Google sign-in failed:', error);
      }
    });
  }

  private getGoogleLoginErrorMessage(
    error: HttpErrorResponse
  ): string {
    if (error.status === 0) {
      return 'Cannot reach the server. Check that the backend is running and CORS allows credentials.';
    }

    if (error.status === 401) {
      return 'Google sign-in could not be verified. Please try again.';
    }

    if (error.status === 409) {
      return 'An account with this email already exists. Please sign in using your existing method.';
    }

    return (
      error.error?.detail ||
      error.error?.message ||
      'Google sign-in failed. Please try again.'
    );
  }

  submitPhoneLogin(): void {
    this.message = '';

    if (!/^[6-9]\d{9}$/.test(this.phoneNumber)) {
      this.message =
        'Please enter a valid 10-digit Indian mobile number.';
      return;
    }

    this.message =
      'Phone verification will be available after backend integration.';
  }

  submitEmailLogin(): void {
    this.message = '';

    if (!this.email.trim() || !this.password) {
      this.message = 'Please enter your email and password.';
      return;
    }

    this.message =
      'Email login will be available after backend integration.';
  }

  goBack(): void {
    this.selectedMethod = null;
    this.message = '';
    this.phoneNumber = '';
    this.email = '';
    this.password = '';
    this.loading = false;
    this.googleButtonRendered = false;
  }
}
