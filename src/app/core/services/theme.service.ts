import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<ThemeMode>(this.getStoredTheme());
  theme$ = this.themeSubject.asObservable();

  constructor() {
    this.initTheme();
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.themeSubject.value === 'system') {
        this.applyTheme('system');
      }
    });
  }

  private initTheme() {
    const mode = this.getStoredTheme();
    this.themeSubject.next(mode);
    this.applyTheme(mode);
  }

  setTheme(mode: ThemeMode) {
    localStorage.setItem('theme-preference', mode);
    this.themeSubject.next(mode);
    this.applyTheme(mode);
  }

  get currentTheme(): ThemeMode {
    return this.themeSubject.value;
  }

  private applyTheme(mode: ThemeMode) {
    let themeToApply = mode;
    if (mode === 'system') {
      try {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        themeToApply = systemDark ? 'dark' : 'light';
      } catch (e) {
        console.warn('Could not detect system theme, defaulting to light', e);
        themeToApply = 'light';
      }
    }
    
    // Applying to both root and body for maximum compatibility
    document.documentElement.setAttribute('data-bs-theme', themeToApply);
    
    // Manually force dark mode on body as well
    if (themeToApply === 'dark') {
      document.body.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('bg-dark', 'text-white');
    } else {
      document.body.setAttribute('data-bs-theme', 'light');
      document.body.classList.remove('bg-dark', 'text-white');
    }
  }

  private getStoredTheme(): ThemeMode {
    return (localStorage.getItem('theme-preference') as ThemeMode) || 'system';
  }
}
