
import {
  AfterViewChecked,
  OnInit,
  Component,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';

import {
  AuthService,
  LoginResponse
} from '../../core/services/auth.service';

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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements AfterViewChecked, OnInit {

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly googleClientId =
    '329854087820-aet9ru3vsj8r8htotv5bdu1rbkpvqjp0.apps.googleusercontent.com';

  // Normal login
  selectedMethod: LoginMethod | null = null;

  phoneNumber = '';
  email = '';
  password = '';

  // Admin modal
  isAdminModalOpen = false;

  adminIdentifier = '';
  adminPassword = '';

  adminLoading = false;
  adminMessage = '';
  adminError = false;

  // Normal login status
  message = '';
  loading = false;

  private googleInitialized = false;
  private googleButtonRendered = false;

  ngAfterViewChecked(): void {
    this.renderGoogleButtonIfReady();
  }

  // ------------------------------------
  // ADMIN MODAL
  // ------------------------------------

  openAdminModal(): void {
    this.isAdminModalOpen = true;

    this.adminIdentifier = '';
    this.adminPassword = '';

    this.adminMessage = '';
    this.adminError = false;
    this.adminLoading = false;
  }

  closeAdminModal(): void {
    if (this.adminLoading) {
      return;
    }

    this.isAdminModalOpen = false;

    this.adminIdentifier = '';
    this.adminPassword = '';

    this.adminMessage = '';
    this.adminError = false;
  }

  submitAdminLogin(): void {

    if (this.adminLoading) {
      return;
    }

    this.adminMessage = '';
    this.adminError = false;

    if (
      !this.adminIdentifier.trim() ||
      !this.adminPassword
    ) {
      this.adminError = true;
      this.adminMessage =
        'Please enter your email/phone and password.';
      return;
    }

    this.adminLoading = true;
    this.adminMessage = 'Verifying administrator credentials...';

    this.authService
      .loginWithPassword(
        this.adminIdentifier.trim(),
        this.adminPassword
      )
      .subscribe({

        next: response => {

          if (!response?.success || !response.user) {
            this.adminLoading = false;
            this.adminError = true;

            this.adminMessage =
              response?.message || 'Invalid login credentials.';

            return;
          }

          const user = response.user;

          const isAdmin =
            user.role?.toUpperCase() === 'ADMIN';

          if (!isAdmin) {
            // Clear the session created for a non-admin user.
            this.authService.logout().subscribe({

              next: () => {
                this.adminLoading = false;
                this.adminError = true;

                this.adminPassword = '';

                this.adminMessage =
                  'Access denied. Admin privileges are required.';
              },

              error: () => {
                this.adminLoading = false;
                this.adminError = true;

                this.adminPassword = '';

                this.adminMessage =
                  'Access denied. Please try again.';
              }

            });

            return;
          }

          // Valid administrator
          this.adminMessage = 'Admin verified successfully!';

          this.isAdminModalOpen = false;

          this.adminLoading = false;

          this.adminIdentifier = '';
          this.adminPassword = '';

          void this.router.navigateByUrl('/admin/dashboard');
        },

        error: error => {

          this.adminLoading = false;
          this.adminError = true;

          this.adminMessage =
            this.getLoginErrorMessage(error);

          console.error(
            'Admin login failed:',
            error
          );
        }

      });
  }



  // ------------------------------------
  // NORMAL LOGIN
  // ------------------------------------

  selectMethod(method: LoginMethod): void {

    this.selectedMethod = method;

    this.message = '';
    this.loading = false;

    this.googleButtonRendered = false;
  }

  continueWithGoogle(): void {
    this.selectMethod('google');
  }

  submitPhoneLogin(): void {

    this.message = '';

    if (!/^[6-9]\d{9}$/.test(this.phoneNumber)) {
      this.message =
        'Please enter a valid 10-digit Indian mobile number.';
      return;
    }

    this.performPasswordLogin(
      this.phoneNumber,
      this.password
    );
  }

  submitEmailLogin(): void {

    this.message = '';

    if (!this.email.trim() || !this.password) {
      this.message =
        'Please enter your email and password.';
      return;
    }

    this.performPasswordLogin(
      this.email.trim(),
      this.password
    );
  }

  private performPasswordLogin(
    identifier: string,
    password: string
  ): void {

    if (this.loading) {
      return;
    }

    this.loading = true;
    this.message = 'Signing in...';

    this.authService
      .loginWithPassword(identifier, password)
      .subscribe({

        next: response => {

          this.loading = false;

          if (!response?.success || !response.user) {
            this.message =
              response?.message || 'Login failed. Please try again.';
            return;
          }

          this.message =
            `Welcome, ${response.user.firstName || response.user.name || response.user.email}!`;

          this.navigateAfterLogin(response);
        },

        error: error => {

          this.loading = false;

          this.message =
            this.getLoginErrorMessage(error);

          console.error(
            'Password login failed:',
            error
          );
        }

      });
  }

  // ------------------------------------
  // GOOGLE LOGIN
  // ------------------------------------

  private renderGoogleButtonIfReady(): void {

    if (
      this.selectedMethod !== 'google' ||
      this.googleButtonRendered
    ) {
      return;
    }

    const googleId = window.google?.accounts?.id;

    const buttonContainer =
      document.getElementById('googleButton');

    if (!googleId || !buttonContainer) {
      return;
    }

    if (!this.googleInitialized) {

      googleId.initialize({

        client_id: this.googleClientId,

        callback: response =>
          this.handleGoogleCredential(response),

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

  ngOnInit(): void {
    if (
      this.activatedRoute.snapshot.queryParamMap.get('admin') === 'true'
    ) {
      this.openAdminModal();
    }
  }

  private handleGoogleCredential(
    response: GoogleCredentialResponse
  ): void {

    if (!response?.credential) {
      this.message =
        'Google did not return a valid credential.';
      return;
    }

    if (this.loading) {
      return;
    }

    this.loading = true;

    this.message =
      'Verifying your Google account...';

    this.authService
      .loginWithGoogle(response.credential)
      .subscribe({

        next: result => {

          this.loading = false;

          if (!result?.success || !result.user) {
            this.message =
              result?.message || 'Google sign-in failed.';
            return;
          }

          this.message =
            `Welcome, ${result.user.firstName || result.user.name || result.user.email}!`;

          this.navigateAfterLogin(result);
        },

        error: error => {

          this.loading = false;

          this.message =
            this.getLoginErrorMessage(error);

          console.error(
            'Google sign-in failed:',
            error
          );
        }

      });
  }

  // ------------------------------------
  // NAVIGATION
  // ------------------------------------

  private navigateAfterLogin(
    response: LoginResponse
  ): void {

    if (response.user?.role?.toUpperCase() === 'ADMIN') {

      void this.router.navigateByUrl('/admin/dashboard');

    } else {

      void this.router.navigateByUrl('/');
    }
  }

  // ------------------------------------
  // ERROR HANDLING
  // ------------------------------------

  private getLoginErrorMessage(error: {
    status?: number;
    error?: {
      detail?: string;
      message?: string;
    };
  }): string {

    if (error.status === 0) {
      return 'Cannot reach the server. Check your connection and backend.';
    }

    if (error.status === 401) {
      return 'Invalid email/phone or password.';
    }

    if (error.status === 403) {
      return 'Your account is inactive or security verification failed.';
    }

    return (
      error.error?.detail ||
      error.error?.message ||
      'Login failed. Please try again.'
    );
  }

  // ------------------------------------
  // BACK
  // ------------------------------------

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
