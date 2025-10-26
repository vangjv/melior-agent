import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing.component';

// Feature: 004-entra-external-id-auth
// Public landing page accessible without authentication
// Protected routes will be added in Phase 5 with MsalGuard

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    title: 'Welcome - Melior Agent'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
