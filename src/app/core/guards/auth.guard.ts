import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, switchMap, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.isInitialized$.pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      if (authService.currentUser) {
        return true;
      }
      router.navigate(['/login']);
      return false;
    })
  );
};
