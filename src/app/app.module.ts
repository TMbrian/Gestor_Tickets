import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

/**
 * Módulo raíz de la aplicación (legado).
 *
 * Conserva la configuración tradicional basada en `NgModule` para
 * compatibilidad con código existente. Sin embargo, el proyecto utiliza
 * componentes standalone y arranca mediante `bootstrapApplication(AppComponent)`
 * desde `main.ts`, por lo que este módulo puede no estar en uso real.
 *
 * Nota: `AppComponent` está marcado como standalone, por lo que no debería
 * declararse aquí. Esta declaración se conserva tal cual existía en el
 * proyecto para no introducir cambios funcionales no solicitados.
 */
@NgModule({
  declarations: [],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
})
export class AppModule { }