
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  AuthService,
  AuthUser
} from '../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  user: AuthUser | null = null;
  loading = true;
  loggingOut = false;
  errorMessage = '';

  ngOnInit(): void {
    // Check the server session before displaying profile information.
    this.authService.restoreSession().subscribe({
      next: (user) => {
        this.loading = false;

        if (!user) {
          void this.router.navigateByUrl('/login');
          return;
        }

        this.user = user;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Unable to load your account. Please try again.';
      }
    });
  }

  get displayName(): string {
    if (!this.user) {
      return '';
    }

    return (
      this.user.name ||
      `${this.user.firstName || ''} ${this.user.lastName || ''}`.trim() ||
      this.user.email
    );
  }

  get initials(): string {
    if (!this.user) {
      return '';
    }

    const first = this.user.firstName?.trim().charAt(0) ?? '';
    const last = this.user.lastName?.trim().charAt(0) ?? '';

    return (first + last || this.user.email.charAt(0)).toUpperCase();
  }

  logout(): void {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;
    this.errorMessage = '';

    this.authService.logout().subscribe({
      next: () => {
        this.loggingOut = false;
        void this.router.navigateByUrl('/');
      },
      error: (error) => {
        this.loggingOut = false;

        if (error.status === 401 || error.status === 403) {
          this.authService.clearCurrentUser();
          void this.router.navigateByUrl('/');
          return;
        }

        this.errorMessage =
          'Unable to sign out right now. Please try again.';
      }
    });
  }
}
