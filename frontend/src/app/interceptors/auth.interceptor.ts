import { inject } from '@angular/core';
import { Router } from '@angular/router'; // 1. Importa el Router
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const esPeticionApi = req.url.includes('/api/') || req.url.startsWith('http');
  if (!esPeticionApi) {
    return next(req);
  }

  const token = authService._sesion$.getValue()?.accessToken;
  const peticionAutenticada = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : req;

  return next(peticionAutenticada).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.error('[AuthInterceptor] Error 401: Sesión expirada');
        authService.limpiarSesion();
        router.navigate(['/login']); // 4. Usa el router inyectado, no 'this'
      }
      return throwError(() => error);
    })
  );
};