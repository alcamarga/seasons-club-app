// Interfaces para el modelo Usuario y autenticación JWT.
// Autor: Camilo Martinez | Fecha: 23/03/2026 | Versión: 4.1

export type RolUsuario = 'cliente' | 'admin' | 'cocinero' | 'domiciliario' | 'mesero';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: RolUsuario;
  fecha_registro?: string;
}

// Datos necesarios para el formulario de registro | Data needed for registration form
export interface RegistroCargaUtil {
  nombre: string;
  email: string;
  contrasena: string;
}

// Datos necesarios para el inicio de sesión | Data needed for login
export interface LoginCargaUtil {
  email: string;
  contrasena: string;
}

// Estructura de la respuesta del servidor al autenticar | Server response structure on authentication
export interface RespuestaAutenticacion {
  access_token: string;
  usuario: Usuario;
  rol: string;
  email: string;
}

// Representación de la sesión activa en el estado de la aplicación | Active session representation in app state
export interface SesionActiva {
  usuario: Usuario;
  accessToken: string;
}
