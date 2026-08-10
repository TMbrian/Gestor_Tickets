/** Roles disponibles dentro del sistema para controlar el nivel de acceso.
 *  Ensanchado en Fase 4: el backend ya emite el claim `Role` con "Admin" o
 *  "Agente" (ver ADR 0005 de ticket-manager-api). El front todavía no tiene
 *  UI para 'Agente' (queda pendiente el rename a 'Personal', ya anotado en
 *  el CLAUDE.md del proyecto) pero el tipo debe aceptar el valor real que
 *  llega en `UsuarioDto.Rol` para no forzar un cast inseguro en el servicio
 *  de autenticación. */
export type Rol = 'Admin' | 'Agente';

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
