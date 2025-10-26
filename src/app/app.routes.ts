import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { LandingComponent } from './components/landing/landing.component';
import { VoiceChatComponent } from './components/voice-chat/voice-chat.component';

// Feature: 004-entra-external-id-auth
// Public landing page accessible without authentication
// Voice chat routes protected with MsalGuard (User Story 3)

export const routes: Routes = [
  {
    path: '',
    component: LandingComponent,
    title: 'Welcome - Melior Agent'
  },
  {
    path: 'voice-chat',
    component: VoiceChatComponent,
    canActivate: [MsalGuard],
    title: 'Voice Chat - Melior Agent'
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
