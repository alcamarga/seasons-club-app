// Servicio de autenticación JWT con persistencia en localStorage.
// Autor: Camilo Martinez | Fecha: 23/03/2026 | Versión: 4.1

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
const URL_API_AUTENTICACION: string = `${environment.apiUrl}/auth`;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  // Estado reactivo de la sesión | Reactive session state
  private _sesion$: BehaviorSubject<SesionActiva | null> =
    new BehaviorSubject<SesionActiva | null>(this.cargarSesionGuardada());

  readonly sesionActiva$: Observable<SesionActiva | null> = this._sesion$.asObservable();

  estaAutenticado(): boolean {
    return this._sesion$.getValue() !== null;
  }

  obtenerUsuarioActual(): Usuario | null {
    return this._sesion$.getValue()?.usuario ?? null;
  }

  obtenerTokenAcceso(): string | null {
    return localStorage.getItem(CLAVE_TOKEN);
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

  cerrarSesion(): void {
    localStorage.removeItem(CLAVE_TOKEN);
    localStorage.removeItem(CLAVE_USUARIO);
    this._sesion$.next(null);
    window.location.reload();
  }

  private registrarSesionLocal(respuesta: RespuestaAutenticacion): void {
    localStorage.setItem(CLAVE_TOKEN, respuesta.access_token);
    localStorage.setItem(CLAVE_USUARIO, JSON.stringify(respuesta.usuario));

    const nuevaSesion: SesionActiva = {
      usuario: respuesta.usuario,
      accessToken: respuesta.access_token
    };
    this._sesion$.next(nuevaSesion);
  }

  private cargarSesionGuardada(): SesionActiva | null {
    const token: string | null = localStorage.getItem(CLAVE_TOKEN);
    const usuarioCrudo: string | null = localStorage.getItem(CLAVE_USUARIO);

    if (!token || !usuarioCrudo) return null;

    try {
      const usuario: Usuario = JSON.parse(usuarioCrudo) as Usuario;
      return { usuario, accessToken: token };
    } catch {
      this.cerrarSesion();
      return null;
    }
  }

  // Verifica si el usuario actual tiene rol de administrador
  isAdmin(): boolean {
    const usuario = this.obtenerUsuarioActual();
    return !!(usuario && usuario.rol === 'admin');
  }
}
