import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ServicioAutenticacion } from '../services';
import { filter, map, take } from 'rxjs/operators';

/**
 * Guard de autenticación para proteger rutas privadas de la aplicación.
 *
 * Espera a que el servicio de autenticación esté completamente inicializado
 * antes de evaluar si el usuario tiene acceso a la ruta solicitada.
 * Si el usuario no está autenticado, redirige al inicio de sesión.
 *
 * @param rutaActiva - Información de la ruta que se intenta activar.
 * @param estadoRuta - Estado del enrutador con la URL destino.
 * @returns Observable<boolean> que emite `true` si el acceso está permitido,
 *          o `false` si el usuario es redirigido al login.
 */
export const guardAutenticacion: CanActivateFn = (rutaActiva, estadoRuta) => {
  /** Servicio de autenticación que gestiona el estado de sesión del usuario */
  const servicioAutenticacion = inject(ServicioAutenticacion);

  /** Servicio de enrutamiento para redirigir al login si es necesario */
  const enrutador = inject(Router);

  return servicioAutenticacion.estaInicializado$.pipe(
    // Espera hasta que la inicialización del servicio esté completa
    filter(estaInicializado => estaInicializado),

    // Solo se evalúa una vez para evitar suscripciones persistentes
    take(1),

    map(() => {
      if (servicioAutenticacion.usuarioActual) {
        // El usuario tiene sesión activa, se permite el acceso a la ruta
        return true;
      }

      // No hay sesión activa: se redirige al login, pasando la URL originalmente
      // pedida como returnUrl para poder volver ahí tras autenticarse.
      enrutador.navigate(['/login'], { queryParams: { returnUrl: estadoRuta.url } });
      return false;
    })
  );
};