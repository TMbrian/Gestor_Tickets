import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

/**
 * Configuración de rutas raíz de la aplicación.
 *
 * Actualmente vacío: las rutas se definen en `app.routes.ts` mediante el
 * enfoque de aplicación standalone. Este arreglo se conserva como placeholder
 * por compatibilidad con el módulo de enrutamiento clásico.
 */
const rutas: Routes = [];

/**
 * Módulo de enrutamiento principal de la aplicación.
 *
 * Registra el `RouterModule` con las rutas definidas en `rutas` y lo expone
 * para que pueda ser importado por el módulo raíz.
 */
@NgModule({
  imports: [RouterModule.forRoot(rutas)],
  exports: [RouterModule]
})
export class AppRoutingModule { }