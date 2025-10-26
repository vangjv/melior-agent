import { Component, ChangeDetectionStrategy, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

/**
 * Landing page component for unauthenticated and authenticated users
 * Feature: 004-entra-external-id-auth
 *
 * Displays:
 * - Application information and voice chat features
 * - "Sign In" button for unauthenticated users
 * - "Go to Voice Chat" button for authenticated users
 * - Authentication error messages via Material Snackbar
 */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  // Computed signals for reactive UI state
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;
  readonly isLoading = this.authService.isLoading;
  readonly authError = this.authService.authError;

  // Computed signal for button text and action
  readonly primaryButtonText = computed(() =>
    this.isAuthenticated() ? 'Go to Voice Chat' : 'Sign In'
  );

  constructor() {
    // Display authentication errors in snackbar
    effect(() => {
      const error = this.authError();
      if (error) {
        this.snackBar.open(
          error.userMessage,
          error.retryable ? 'Retry' : 'Close',
          {
            duration: error.retryable ? undefined : 5000, // Auto-close non-retryable errors after 5s
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
            panelClass: error.retryable ? 'auth-error-retryable' : 'auth-error'
          }
        ).onAction().subscribe(() => {
          // If user clicks "Retry", attempt sign-in again
          if (error.retryable) {
            this.authService.signIn();
          }
        });
      }
    });
  }

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
