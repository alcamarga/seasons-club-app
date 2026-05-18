// Servicio para gestión de usuarios y personal.
// Autor: Camilo Martinez | Fecha: 01/05/2026 | Versión: 2.0

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Usuario, RolUsuario } from '../models/usuario.model';

/** Payload para crear o editar un empleado */
export interface PersonalPayload {
  nombre: string;
  email: string;
  rol: RolUsuario;
  /** Contraseña en texto plano — solo se envía al crear o al hacer reset */
  password?: string;
}

/** Respuesta del backend al listar usuarios */
export interface RespuestaUsuarios {
  usuarios: Usuario[];
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/usuarios`;

  /** Lista todos los usuarios (requiere token admin) */
  obtenerPersonal(): Observable<RespuestaUsuarios> {
    return this.http.get<RespuestaUsuarios>(this.apiUrl);
  }

  /** Crea un nuevo empleado */
  crearPersonal(payload: PersonalPayload): Observable<Usuario> {
    return this.http.post<Usuario>(this.apiUrl, payload);
  }

  /** Actualiza nombre, email o rol de un empleado */
  actualizarPersonal(id: number, payload: PersonalPayload): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.apiUrl}/${id}`, payload);
  }

  /** Elimina un empleado */
  eliminarPersonal(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}`);
  }

  /** Resetea la contraseña de un empleado (solo admin) */
  resetPassword(id: number, nuevaContrasena: string): Observable<{ mensaje: string }> {
    return this.http.post<{ mensaje: string }>(
      `${this.apiUrl}/${id}/reset-password`,
      { nueva_contrasena: nuevaContrasena }
    );
  }

  /** Cambia el rol de un usuario (solo admin) */
  cambiarRol(id: number, rol: RolUsuario): Observable<{ mensaje: string; usuario: Usuario }> {
    return this.http.patch<{ mensaje: string; usuario: Usuario }>(
      `${this.apiUrl}/${id}/rol`,
      { rol }
    );
  }
}
