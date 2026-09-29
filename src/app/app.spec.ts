import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpTesting.expectOne('http://localhost:3000/simulations').flush([]);
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

  it('should render the simulator and load saved scenarios', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpTesting.expectOne('http://localhost:3000/simulations').flush([]);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Donnez un cap');
    expect(compiled.querySelector('#target-net')?.getAttribute('step')).toBe('50000');
  });
});
