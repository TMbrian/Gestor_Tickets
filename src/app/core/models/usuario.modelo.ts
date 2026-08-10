/** Roles disponibles dentro del sistema para controlar el nivel de acceso.
 *  `Admin` ve los tickets de todo el equipo (bypass de solo lectura);
 *  `PersonalTI` ve únicamente los propios — decisión D1, ver el análisis de
 *  arquitectura de la sesión. Antes se llamaba `Agente`; renombrado en el
 *  backend vía migración (`RenombrarRolAgenteAPersonalTI`, ticket-manager-api). */
export type Rol = 'Admin' | 'PersonalTI';

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

  /** Nombre completo o de visualización del usuario */
  nombre: string;

  /** Rol asignado que determina los permisos dentro de la aplicación */
  rol: Rol;
}
