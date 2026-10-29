
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService, AuthUser } from '../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  mobileMenuOpen = false;
  profileMenuOpen = false;
  loggingOut = false;

  readonly currentUser$ = this.authService.currentUser$;

  ngOnInit(): void {
    // Restore the user from the server session after page refresh.
    this.authService.restoreSession().subscribe();
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    this.profileMenuOpen = false;
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  getInitials(user: AuthUser): string {
    const first = user.firstName?.trim().charAt(0) ?? '';
    const last = user.lastName?.trim().charAt(0) ?? '';

    if (first || last) {
      return `${first}${last}`.toUpperCase();
    }

    return user.email.charAt(0).toUpperCase();
  }

  logout(): void {
    if (this.loggingOut) {
      return;
    }

    this.loggingOut = true;

    this.authService.logout().subscribe({
      next: () => {
        this.loggingOut = false;
        this.closeMobileMenu();
        void this.router.navigateByUrl('/');
      },
      error: (error) => {
        this.loggingOut = false;

        // If the server session has already expired, clear the UI too.
        if (error.status === 401 || error.status === 403) {
          this.authService.clearCurrentUser();
          this.closeMobileMenu();
          void this.router.navigateByUrl('/');
          return;
        }

        console.error('Logout failed:', error);
      }
    });
  }
}
