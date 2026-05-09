import { Routes } from '@angular/router';
import { guardAutenticacion } from './core/guards/autenticacion.guard';
import { ComponenteLogin } from './features/autenticacion/login.component';
import { ComponenteDiseno } from './diseno/diseno.component';
import { DashboardComponent } from './features/tablero/tablero.component';
import { ListaTicketsComponent } from './features/tickets/lista-tickets.component';
import { ComponenteConfiguracion } from './features/configuracion/configuracion.component';

/**
 * Definición central de rutas de la aplicación.
 *
 * Estructura:
 * - `/login`     — Página pública de inicio de sesión.
 * - `/`          — Raíz protegida que renderiza el layout principal;
 *                  redirige a `/tablero` por defecto.
 *   - `/tablero`      — Vista del tablero principal.
 *   - `/tickets`      — Listado y gestión de tickets.
 *   - `/configuracion`— Ajustes y preferencias del usuario.
 * - `**`         — Cualquier ruta desconocida redirige a la raíz.
 */
export const rutas: Routes = [
  /**
   * Ruta pública de autenticación.
   * Accesible sin sesión activa.
   */
  { path: 'login', component: ComponenteLogin },

  {
    /** Ruta raíz protegida por el guard de autenticación */
    path: '',
    component: ComponenteDiseno,
    canActivate: [guardAutenticacion],
    children: [
      /** Tablero principal con resumen general de la aplicación */
      { path: 'tablero', component: DashboardComponent },

      /** Listado de tickets: consulta, filtrado y gestión */
      { path: 'tickets', component: ListaTicketsComponent },

      /** Configuración de cuenta y preferencias del usuario */
      { path: 'configuracion', component: ComponenteConfiguracion },

      /** Redirección por defecto al tablero cuando la ruta hija está vacía */
      { path: '', redirectTo: 'tablero', pathMatch: 'full' }
    ]
  },

  /** Captura cualquier ruta no definida y redirige a la raíz */
  { path: '**', redirectTo: '' }
];