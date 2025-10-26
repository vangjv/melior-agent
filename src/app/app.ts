import { Component, signal, OnInit, inject, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MsalService } from '@azure/msal-angular';
import { Subject, takeUntil } from 'rxjs';

/**
 * Root application component
 * Feature: 004-entra-external-id-auth - handles MSAL redirect flow
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('melior-agent');

  private readonly msalService = inject(MsalService);
  private readonly destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Handle MSAL redirect flow on application initialization
    // This is required for the redirect authentication flow to complete
    this.msalService.handleRedirectObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result) {
            console.log('Authentication redirect handled successfully');
          }
        },
        error: (error) => {
          console.error('Error handling authentication redirect:', error);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

