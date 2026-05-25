// Servicio de autenticación JWT con persistencia en localStorage.
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import {
  Usuario,
  LoginCargaUtil,
  RegistroCargaUtil,
  RespuestaAutenticacion,
  SesionActiva
} from '../models/usuario.model';
import { environment } from '../../environments/environment';

const CLAVE_TOKEN: string = 'access_token';
const CLAVE_USUARIO: string = 'usuario';

// Ajustamos la URL base. Si tu backend es http://localhost:5000, 
// environment.apiUrl debe ser exactamente esa dirección.
const API_URL: string = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  public _sesion$: BehaviorSubject<SesionActiva | null> =
    new BehaviorSubject<SesionActiva | null>(this.cargarSesionGuardada());

  readonly sesionActiva$: Observable<SesionActiva | null> = this._sesion$.asObservable();

  estaAutenticado(): boolean {
    return this._sesion$.getValue() !== null;
  }

  obtenerUsuarioActual(): Usuario | null {
    return this._sesion$.getValue()?.usuario ?? null;
  }

  // --- MÉTODOS DE AUTENTICACIÓN ---

  iniciarSesion(credenciales: LoginCargaUtil): Observable<RespuestaAutenticacion> {
    // Si tu backend tiene ruta /api/login, usa: `${API_URL}/api/login`
    // Si tu backend es directo, usa: `${API_URL}/login`
    return this.http.post<RespuestaAutenticacion>(`${API_URL}/login`, credenciales).pipe(
      tap((resp) => this.registrarSesionLocal(resp))
    );
  }

  registrarUsuario(datos: RegistroCargaUtil): Observable<RespuestaAutenticacion> {
    return this.http.post<RespuestaAutenticacion>(`${API_URL}/registro`, datos).pipe(
      tap((resp) => this.registrarSesionLocal(resp))
    );
  }

  cerrarSesion(): void {
    this.http.post(`${API_URL}/logout`, {}).subscribe({
      complete: () => this.limpiarSesion(),
      error: () => this.limpiarSesion()
    });
  }

  public limpiarSesion(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    localStorage.removeItem('user_role');
    localStorage.removeItem('role_user');
    localStorage.removeItem('email_user');
    this._sesion$.next(null);
  }

  private registrarSesionLocal(respuesta: RespuestaAutenticacion): void {
    const usuario = respuesta.usuario;
    localStorage.setItem(CLAVE_TOKEN, respuesta.access_token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    if (usuario.rol) {
      const rol = usuario.rol.toLowerCase();
      localStorage.setItem('user_role', rol);
      localStorage.setItem('role_user', rol);
    }
    if (usuario.email) {
      localStorage.setItem('email_user', usuario.email);
    }
    this._sesion$.next({ usuario, accessToken: respuesta.access_token });
  }

  private cargarSesionGuardada(): SesionActiva | null {
    const token = localStorage.getItem(CLAVE_TOKEN);
    const usuarioCrudo = localStorage.getItem(CLAVE_USUARIO);
    if (!token || !usuarioCrudo) return null;
    try {
      return { usuario: JSON.parse(usuarioCrudo), accessToken: token };
    } catch {
      return null;
    }
  }

  private obtenerRolActual(): string | null {
    return (
      this.obtenerUsuarioActual()?.rol?.toLowerCase() ??
      localStorage.getItem('role_user')?.toLowerCase() ??
      null
    );
  }

  isAdmin(): boolean {
    return this.obtenerRolActual() === 'admin';
  }

  isMesero(): boolean {
    return this.obtenerRolActual() === 'mesero';
  }
}