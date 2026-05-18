// Interceptor HTTP para inyectar el JWT y manejar errores 401.
// Autor: Camilo Martinez
// Fecha: 21/03/2026

import { inject } from '@angular/core';
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

// Interceptor funcional (Angular 17+ standalone, sin clase)
// Functional interceptor (Angular 17+ standalone, no class)
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);
  const token: string | null = authService.obtenerTokenAcceso();
  
  if (token) {
    console.log(`[AuthInterceptor] Token enviado para ${req.url}:`, token.substring(0, 20) + '...');
  } else {
    console.warn(`[AuthInterceptor] No hay token para la petición a:`, req.url);
  }

  // Clonar la petición e inyectar el header Authorization si hay token
  const peticionAutenticada: HttpRequest<unknown> = token
    ? req.clone({
        setHeaders: { Authorization: 'Bearer ' + token }
      })
    : req;

  return next(peticionAutenticada).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el backend responde 401, la sesión expiró o el token es inválido
      // If backend responds 401, session expired or token is invalid
      if (error.status === 401) {
        console.error('[AuthInterceptor] Error 401 Detectado - Expulsando usuario...');
        authService.expulsarUsuario();
      }
      return throwError(() => error);
    })
  );
};
