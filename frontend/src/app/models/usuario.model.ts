// Interfaces para el modelo Usuario y autenticación JWT.
// Ajustado para: Seasons Club
// Autor: Camilo Martinez | Fecha: 24/05/2026

// Definimos los roles reales que usaremos en el Club
export type RolUsuario = 'admin' | 'mesero';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  fecha_registro?: string;
}

// Datos para registro: Ajustado a lo que pide tu tabla en Postgres
export interface RegistroCargaUtil {
  nombre: string;
  email: string;
  contrasena: string; // El backend luego lo convertirá a contrasena_hash
}

// Datos para inicio de sesión: Debe coincidir con lo que envías en el body de la petición
export interface LoginCargaUtil {
  email: string; // Asegúrate de que esto coincida con el campo que espera app.py
  contrasena: string;
}

// Estructura de la respuesta del servidor al autenticar
export interface RespuestaAutenticacion {
  access_token: string;
  usuario: Usuario;
  rol: string;
  email: string;
}

// Sesión activa
export interface SesionActiva {
  usuario: Usuario;
  accessToken: string;
}