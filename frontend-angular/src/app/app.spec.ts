import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the four master-table pills', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const pills = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('nav a'));
    const labels = ['Categorías', 'Platos', 'Mesas', 'Personal'];
    expect(pills.length).toBe(4);
    pills.forEach((a, i) => expect(a.textContent).toContain(labels[i]));
  });
});
