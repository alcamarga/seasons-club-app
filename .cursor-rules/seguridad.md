> **Creado por:** Camilo Martinez
> **Fecha:** 11 de abril de 2026
> **Estado:** Estándar de Seguridad

🔑 Gestión de Secretos y Variables
Cero Hardcoding: Prohibido escribir claves API, tokens, contraseñas o URIs de bases de datos directamente en el código.

Uso de .env: Toda configuración sensible debe ir en el archivo .env.

Git Hygiene: Verifica siempre que el archivo .env esté incluido en el .gitignore.

🛡️ Defensa contra Ataques Comunes
Validación de Inputs: Sanitiza y valida toda entrada del usuario en el Frontend (Angular) y, obligatoriamente, en el Backend (Python/Flask) para prevenir SQL Injection y XSS.

Seguridad de Base de Datos: El Frontend nunca se conecta directamente a la base de datos. Toda consulta debe pasar por el Backend.

CORS: La API no debe aceptar peticiones de cualquier dominio. Configura una whitelist específica.

🔐 Control de Acceso y Sesiones
Rutas Protegidas: Las rutas privadas deben requerir autenticación. Un usuario no autenticado no debe ver datos privados.

Validación en Servidor: Los permisos de administrador o roles se validan en el servidor, jamás confíes solo en la lógica del frontend.

Rate Limiting: Implementa límites de peticiones por IP para evitar ataques de fuerza bruta o abuso de la API.

📂 Auditoría y Manejo de Datos
Errores Seguros: Los mensajes de error para el usuario deben ser genéricos. No reveles rutas de archivos, versiones de software o estructuras de la DB.

Logs Limpios: No registres datos sensibles (contraseñas, tarjetas, tokens) en los logs de la consola o archivos.

Dependencias: Antes de finalizar, sugiere ejecutar npm audit o pip audit para revisar vulnerabilidades en las librerías.