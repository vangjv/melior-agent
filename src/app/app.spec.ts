import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MsalService, MsalBroadcastService, MSAL_INSTANCE } from '@azure/msal-angular';
import { IPublicClientApplication, AuthenticationResult, InteractionStatus } from '@azure/msal-browser';
import { App } from './app';
import { of, Subject } from 'rxjs';

describe('App', () => {
  let mockMsalInstance: jasmine.SpyObj<IPublicClientApplication>;
  let mockMsalService: jasmine.SpyObj<MsalService>;
  let mockMsalBroadcastService: Partial<MsalBroadcastService>;

  beforeEach(async () => {
    // Create MSAL mocks
    mockMsalInstance = jasmine.createSpyObj('IPublicClientApplication', [
      'initialize',
      'handleRedirectPromise',
      'getAllAccounts'
    ]);
    mockMsalInstance.initialize.and.returnValue(Promise.resolve());
    mockMsalInstance.handleRedirectPromise.and.returnValue(Promise.resolve(null));
    mockMsalInstance.getAllAccounts.and.returnValue([]);

    mockMsalService = jasmine.createSpyObj('MsalService', [
      'handleRedirectObservable'
    ]);
    mockMsalService.handleRedirectObservable.and.returnValue(of({} as AuthenticationResult));

    mockMsalBroadcastService = {
      msalSubject$: new Subject(),
      inProgress$: of(InteractionStatus.None)
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: MSAL_INSTANCE, useValue: mockMsalInstance },
        { provide: MsalService, useValue: mockMsalService },
        { provide: MsalBroadcastService, useValue: mockMsalBroadcastService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render voice chat component', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-voice-chat')).toBeTruthy();
  });
});
