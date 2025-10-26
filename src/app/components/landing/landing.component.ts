import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

/**
 * Landing page component for unauthenticated and authenticated users
 * Feature: 004-entra-external-id-auth
 *
 * Displays:
 * - Application information and voice chat features
 * - "Sign In" button for unauthenticated users
 * - "Go to Voice Chat" button for authenticated users
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Computed signals for reactive UI state
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;
  readonly isLoading = this.authService.isLoading;

  // Computed signal for button text and action
  readonly primaryButtonText = computed(() =>
    this.isAuthenticated() ? 'Go to Voice Chat' : 'Sign In'
  );

  /**
   * Handle primary button click - either sign in or navigate to voice chat
   */
  onPrimaryButtonClick(): void {
    if (this.isAuthenticated()) {
      // Navigate to voice chat
      this.router.navigate(['/voice-chat']);
    } else {
      // Sign in
      this.authService.signIn();
    }
  }

  /**
   * Handle sign-in button click (always triggers sign-in)
   */
  onSignIn(): void {
    this.authService.signIn();
  }
}
