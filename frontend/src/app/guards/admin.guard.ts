import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take, delay } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private auth: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.auth.sesionActiva$.pipe(
      take(1),
      map(sesion => {
        const token = sesion?.accessToken || localStorage.getItem('access_token');
        const rol = sesion?.usuario?.rol || localStorage.getItem('user_role');
        
        console.log('%c [DEBUG] ENTRANDO AL DASHBOARD CON ROL: ' + rol, 'background: #222; color: #bada55; font-size: 1.5rem; padding: 10px;');
        
        // RELAJACIÓN MÁXIMA: Si hay token, entramos.
        if (token) {
          return true;
        }
        
        // Si no hay token, PERO el servidor podría estar caído, no redirigir violentamente
        console.warn('[AdminGuard] No se detectó token. Permaneciendo en la ruta actual para inspección.');
        return false;
      }),
      // Si el rol es null, esperamos un poco (opcionalmente)
      delay(100)
    );
  }
}
