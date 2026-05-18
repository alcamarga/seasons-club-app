// Servicio de autenticación JWT con persistencia en localStorage.
// Autor: Camilo Martinez | Fecha: 23/03/2026 | Versión: 4.1

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
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
const URL_API_AUTENTICACION: string = `${environment.apiUrl}/auth`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  // Estado reactivo de la sesión | Reactive session state
  private _sesion$: BehaviorSubject<SesionActiva | null> =
    new BehaviorSubject<SesionActiva | null>(this.cargarSesionGuardada());

  readonly sesionActiva$: Observable<SesionActiva | null> = this._sesion$.asObservable();

  estaAutenticado(): boolean {
    return this._sesion$.getValue() !== null;
  }

  obtenerUsuarioActual(): Usuario | null {
    const usuario = this._sesion$.getValue()?.usuario ?? null;
    if (usuario) {
      console.log('[AuthService] Usuario actual:', usuario.email, 'Rol:', usuario.rol);
    } else {
      console.warn('[AuthService] No hay usuario en sesión actual');
    }
    return usuario;
  }

  obtenerTokenAcceso(): string | null {
    const token = localStorage.getItem(CLAVE_TOKEN);
    if (!token) console.warn('[AuthService] No se encontró token en localStorage');
    return token;
  }

  iniciarSesion(credenciales: LoginCargaUtil): Observable<RespuestaAutenticacion> {
    return this.http.post<RespuestaAutenticacion>(`${URL_API_AUTENTICACION}/login`, credenciales).pipe(
      tap((respuesta: RespuestaAutenticacion) => this.registrarSesionLocal(respuesta))
    );
  }

  registrarUsuario(datos: RegistroCargaUtil): Observable<RespuestaAutenticacion> {
    return this.http.post<RespuestaAutenticacion>(`${URL_API_AUTENTICACION}/registro`, datos).pipe(
      tap((respuesta: RespuestaAutenticacion) => this.registrarSesionLocal(respuesta))
    );
  }

  limpiarSesion(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    localStorage.removeItem('user_role');
    this._sesion$.next(null);
    console.log('[AuthService] Sesión limpiada localmente y localStorage depurado');
  }

  cerrarSesion(): void {
    this.limpiarSesion();
    location.reload();
  }

  // Método para manejar fallos críticos de autenticación (401)
  expulsarUsuario(): void {
    console.error('[AuthService] Expulsando usuario por falta de autenticación');
    this.limpiarSesion();
    this.router.navigate(['/login']);
  }

  private registrarSesionLocal(respuesta: RespuestaAutenticacion): void {
    // Sincronización Atómica de Carga: Token y Rol primero
    console.log('[AuthService] Guardando Token en storage:', respuesta.access_token.substring(0, 20) + '...');
    localStorage.setItem(CLAVE_TOKEN, respuesta.access_token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(respuesta.usuario));
    if (respuesta.usuario.rol) {
      localStorage.setItem('user_role', respuesta.usuario.rol.toLowerCase());
    }
    
    // Forzar guardado inmediato en BehaviorSubject
    const nuevaSesion: SesionActiva = {
      usuario: respuesta.usuario,
      accessToken: respuesta.access_token
    };
    this._sesion$.next(nuevaSesion);
    
    console.log('[AuthService] Sesión registrada y persistida:', nuevaSesion.usuario.email, 'Rol:', nuevaSesion.usuario.rol);
  }

  private cargarSesionGuardada(): SesionActiva | null {
    const token: string | null = localStorage.getItem(CLAVE_TOKEN);
    const usuarioCrudo: string | null = localStorage.getItem(CLAVE_USUARIO);

    if (!token || !usuarioCrudo) return null;

    try {
      const usuario: Usuario = JSON.parse(usuarioCrudo) as Usuario;
      return { usuario, accessToken: token };
    } catch {
      this.limpiarSesion();
      return null;
    }
  }

  // Verifica si el usuario actual tiene rol de administrador
  isAdmin(): boolean {
    const usuario = this.obtenerUsuarioActual();
    return !!(usuario && usuario.rol === 'admin');
  }
}
