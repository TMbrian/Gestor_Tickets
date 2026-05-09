/** Roles disponibles dentro del sistema para controlar el nivel de acceso */
export type Rol = 'Admin';

/**
 * Representa un usuario registrado en el sistema.
 * Contiene la información de identidad, acceso y permisos
 * necesaria para la autenticación y autorización.
 */
export interface Usuario {
  /** Identificador único del usuario en la base de datos */
  id: string;

  /** Nombre de usuario utilizado para iniciar sesión */
  nombreUsuario: string;

  /**
   * Contraseña del usuario.
   * Opcional en lectura; nunca debe exponerse en respuestas del servidor.
   */
  contrasena?: string;

  /** Nombre completo o de visualización del usuario */
  nombre: string;

  /** Rol asignado que determina los permisos dentro de la aplicación */
  rol: Rol;
}