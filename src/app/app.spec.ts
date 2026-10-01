import { TestBed } from '@angular/core/testing';
import { Session } from '@supabase/supabase-js';
import { App } from './app';
import { FamilyDataService, NewSimulation } from './family-data.service';

describe('App', () => {
  const testSession = {
    access_token: 'test-session-token',
    user: { id: 'family-member', email: 'family@example.test' },
  } as unknown as Session;
  const familyDataMock = {
    configured: true,
    getSession: async () => testSession as Session | null,
    onAuthStateChange: () => () => undefined,
    signIn: async () => testSession,
    signOut: async () => undefined,
    listSimulations: async () => [],
    saveSimulation: async (simulation: NewSimulation) => ({ id: 1, ...simulation }),
    deleteSimulation: async () => undefined,
  };

  beforeEach(async () => {
    familyDataMock.getSession = async () => testSession;
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: FamilyDataService, useValue: familyDataMock }],
    }).compileComponents();
  });

  it('should create the app with an authenticated family session', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should calculate the target turnover in ariary', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app.metrics().turnover).toBeCloseTo((1_200_000 + 450_000) / 0.73);
  });

  it('should base the forecast reserve on forecast net income', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.setMode('forecast');
    expect(app.metrics().reserve).toBe((app.metrics().netIncome + app.fixedCosts()) * app.reserveMonths());
  });

  it('should render the simulator after restoring an authenticated session', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Donnez un cap');
    expect(compiled.querySelector('#target-net')?.getAttribute('step')).toBe('50000');
  });

  it('should show a private sign-in form without a session', async () => {
    familyDataMock.getSession = async () => null;
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#login-email')).toBeTruthy();
    expect(compiled.querySelector('#target-net')).toBeNull();
  });

  it('should keep the simulator closed until Supabase is configured', () => {
    familyDataMock.configured = false;
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#setup-title')?.textContent).toContain('Connexion sécurisée');
    expect(compiled.querySelector('#login-email')).toBeNull();
    expect(compiled.querySelector('#target-net')).toBeNull();
    familyDataMock.configured = true;
  });
});
