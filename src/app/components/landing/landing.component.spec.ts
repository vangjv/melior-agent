import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LandingComponent } from './landing.component';
import { AuthService } from '../../services/auth.service';
import { signal } from '@angular/core';
import { AuthenticationState } from '../../models/auth-state';

describe('LandingComponent', () => {
  let component: LandingComponent;
  let fixture: ComponentFixture<LandingComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const createMockAuthState = (authenticated: boolean): AuthenticationState => ({
    status: authenticated ? 'authenticated' : 'unauthenticated',
    user: authenticated ? {
      userId: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User',
      username: 'test@example.com',
      tenantId: 'test-tenant-id'
    } : null,
    error: null
  });

  beforeEach(async () => {
    // Create spy objects for dependencies
    mockAuthService = jasmine.createSpyObj('AuthService', ['signIn', 'signOut'], {
      isAuthenticated: signal(false),
      currentUser: signal(null),
      isLoading: signal(false),
      authState: signal(createMockAuthState(false))
    });

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render landing page without authentication', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-card-title')?.textContent).toContain('Welcome to Melior Agent');
    expect(compiled.querySelector('mat-card-subtitle')?.textContent).toContain('AI-Powered Voice Assistant');
  });

  it('should show "Sign In" button when not authenticated', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button[color="primary"]');
    expect(button?.textContent).toContain('Sign In');
  });

  it('should call authService.signIn() when sign-in button clicked', () => {
    fixture.detectChanges();

    component.onSignIn();

    expect(mockAuthService.signIn).toHaveBeenCalled();
  });

  it('should show "Go to Voice Chat" button when authenticated', () => {
    // Update mock to authenticated state
    Object.defineProperty(mockAuthService, 'isAuthenticated', {
      value: signal(true),
      writable: false
    });
    Object.defineProperty(mockAuthService, 'currentUser', {
      value: signal({
        userId: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        username: 'test@example.com',
        tenantId: 'test-tenant-id'
      }),
      writable: false
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button[color="primary"]');
    expect(button?.textContent).toContain('Go to Voice Chat');
  });

  it('should navigate to voice chat when authenticated and button clicked', () => {
    // Update mock to authenticated state
    Object.defineProperty(mockAuthService, 'isAuthenticated', {
      value: signal(true),
      writable: false
    });

    fixture.detectChanges();

    component.onPrimaryButtonClick();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/voice-chat']);
  });

  it('should call signIn when not authenticated and button clicked', () => {
    fixture.detectChanges();

    component.onPrimaryButtonClick();

    expect(mockAuthService.signIn).toHaveBeenCalled();
  });

  it('should show loading state during authentication', () => {
    Object.defineProperty(mockAuthService, 'isLoading', {
      value: signal(true),
      writable: false
    });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('button[disabled]');
    expect(button?.textContent).toContain('Authenticating');
  });
});
