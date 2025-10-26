import { Component, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';

/**
 * Navigation component
 * Feature: 004-entra-external-id-auth - User Story 3
 *
 * Displays:
 * - App title
 * - User display name when authenticated
 * - Sign-out button when authenticated
 */
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Computed signals from AuthService
  readonly isAuthenticated = this.authService.isAuthenticated;
  readonly currentUser = this.authService.currentUser;

  // Computed display name with fallback
  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user?.displayName || user?.email || 'User';
  });

  // Handle sign-out button click
  onSignOut(): void {
    this.authService.signOut();
  }

  // Navigate to voice chat
  navigateToVoiceChat(): void {
    this.router.navigate(['/voice-chat']);
  }

  // Navigate to home
  navigateToHome(): void {
    this.router.navigate(['/']);
  }
}
