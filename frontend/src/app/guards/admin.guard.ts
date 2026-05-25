import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Verificamos si es admin
  if (authService.isAdmin()) {
    return true;
  }

  if (authService.estaAutenticado()) {
    router.navigate(['/mesas']);
    return false;
  }

  router.navigate(['/login']);
  return false;
};