import { Routes } from '@angular/router';

// T121: Lazy loading routes - currently single-page app
// When adding new routes in the future, use lazy loading:
// { path: 'feature', loadComponent: () => import('./feature/feature.component').then(m => m.FeatureComponent) }

export const routes: Routes = [];
