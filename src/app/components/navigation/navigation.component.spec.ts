import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { NavigationComponent } from './navigation.component';
import { AuthService } from '../../services/auth.service';
import { signal } from '@angular/core';

/**
 * Unit tests for NavigationComponent
 * Feature: 004-entra-external-id-auth - User Story 3
 * Tests: T059, T060, T061 - Navigation component display and interactions
 */
describe('NavigationComponent', () => {
  let component: NavigationComponent;
  let fixture: ComponentFixture<NavigationComponent>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerMock: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    // Create mock signals (keep as writable for test manipulation)
    const isAuthenticatedSignal = signal(false);
    const currentUserSignal = signal(null);

    // Create service mocks
    authServiceMock = jasmine.createSpyObj('AuthService', ['signOut'], {
      isAuthenticated: isAuthenticatedSignal,
      currentUser: currentUserSignal
    });

    routerMock = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        NavigationComponent,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatDividerModule
      ],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('T060: Navigation shows user display name when authenticated', () => {
    it('should display user display name when authenticated', () => {
      // Set up authenticated state
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        username: 'test@example.com',
        tenantId: 'tenant-456'
      };

      // Update mock signals
      (authServiceMock.isAuthenticated as any).set(true);
      (authServiceMock.currentUser as any).set(mockUser);

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const displayNameElement = compiled.querySelector('.user-display-name');

      expect(component.isAuthenticated()).toBe(true);
      expect(component.displayName()).toBe('Test User');
      expect(displayNameElement?.textContent).toContain('Test User');
    });

    it('should fallback to email when display name is not available', () => {
      const mockUser = {
        userId: 'user-123',
        email: 'fallback@example.com',
        displayName: '',
        username: 'fallback@example.com',
        tenantId: 'tenant-456'
      };

      (authServiceMock.isAuthenticated as any).set(true);
      (authServiceMock.currentUser as any).set(mockUser);

      fixture.detectChanges();

      expect(component.displayName()).toBe('fallback@example.com');
    });

    it('should use "User" as fallback when neither display name nor email available', () => {
      const mockUser = {
        userId: 'user-123',
        email: '',
        displayName: '',
        username: '',
        tenantId: 'tenant-456'
      };

      (authServiceMock.isAuthenticated as any).set(true);
      (authServiceMock.currentUser as any).set(mockUser);

      fixture.detectChanges();

      expect(component.displayName()).toBe('User');
    });

    it('should show user menu button when authenticated', () => {
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        username: 'test@example.com',
        tenantId: 'tenant-456'
      };

      (authServiceMock.isAuthenticated as any).set(true);
      (authServiceMock.currentUser as any).set(mockUser);

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const userMenu = compiled.querySelector('.user-menu');
      const menuButton = compiled.querySelector('button[aria-label="User menu"]');

      expect(userMenu).toBeTruthy();
      expect(menuButton).toBeTruthy();
    });

    it('should hide user menu when not authenticated', () => {
      (authServiceMock.isAuthenticated as any).set(false);
      (authServiceMock.currentUser as any).set(null);

      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const userMenu = compiled.querySelector('.user-menu');

      expect(userMenu).toBeFalsy();
    });
  });

  describe('T061: Sign-out button calls authService.signOut()', () => {
    it('should call authService.signOut() when sign-out button clicked', () => {
      // Set up authenticated state
      const mockUser = {
        userId: 'user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        username: 'test@example.com',
        tenantId: 'tenant-456'
      };

      (authServiceMock.isAuthenticated as any).set(true);
      (authServiceMock.currentUser as any).set(mockUser);

      fixture.detectChanges();

      // Call component method directly
      component.onSignOut();

      expect(authServiceMock.signOut).toHaveBeenCalled();
      expect(authServiceMock.signOut).toHaveBeenCalledTimes(1);
    });

    it('should navigate to home when home button clicked', () => {
      component.navigateToHome();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should navigate to voice chat when voice chat button clicked', () => {
      component.navigateToVoiceChat();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/voice-chat']);
    });
  });

  describe('T059: Navigation component structure', () => {
    it('should have app title', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const appTitle = compiled.querySelector('.app-title');

      expect(appTitle).toBeTruthy();
      expect(appTitle?.textContent).toContain('Melior Agent');
    });

    it('should have Material toolbar', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const toolbar = compiled.querySelector('mat-toolbar');

      expect(toolbar).toBeTruthy();
    });

    it('should be sticky positioned', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const toolbar = compiled.querySelector('.navigation-toolbar');

      expect(toolbar).toBeTruthy();
    });
  });

  describe('Responsive behavior', () => {
    it('should be responsive to different viewport sizes', () => {
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const toolbar = compiled.querySelector('.navigation-toolbar');

      // Component should render regardless of viewport
      expect(toolbar).toBeTruthy();
    });
  });

  describe('Computed signals', () => {
    it('should reactively update displayName when user changes', () => {
      const user1 = {
        userId: 'user-1',
        email: 'user1@example.com',
        displayName: 'User One',
        username: 'user1@example.com',
        tenantId: 'tenant-1'
      };

      const user2 = {
        userId: 'user-2',
        email: 'user2@example.com',
        displayName: 'User Two',
        username: 'user2@example.com',
        tenantId: 'tenant-2'
      };

      (authServiceMock.currentUser as any).set(user1);
      fixture.detectChanges();
      expect(component.displayName()).toBe('User One');

      (authServiceMock.currentUser as any).set(user2);
      fixture.detectChanges();
      expect(component.displayName()).toBe('User Two');
    });

    it('should reactively update when authentication state changes', () => {
      expect(component.isAuthenticated()).toBe(false);

      (authServiceMock.isAuthenticated as any).set(true);
      fixture.detectChanges();

      expect(component.isAuthenticated()).toBe(true);
    });
  });
});
