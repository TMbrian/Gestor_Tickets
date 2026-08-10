import { importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { rutas } from './app/app.rutas';
import { AppComponent } from './app/app.component';

// Repositorios concretos e InjectionTokens
import { TICKET_REPOSITORY_TOKEN, CATALOGO_REPOSITORY_TOKEN } from './app/core/models/repositorios.tokens';
import { ApiTicketRepository } from './app/core/repositories/api-ticket.repository';
import { ApiCatalogoRepository } from './app/core/repositories/api-catalogo.repository';
import { ServicioAutenticacion } from './app/core/services/autenticacion.service';
import { InterceptorAutenticacion } from './app/core/interceptors/autenticacion.interceptor';

/** Silent refresh ANTES de que el guard evalúe cualquier ruta (ADR 0005). */
function inicializarSesion(servicioAuth: ServicioAutenticacion) {
  return () => servicioAuth.intentarRefrescoInicial();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(rutas),
    importProvidersFrom(
      HttpClientModule
    ),
    // Fase 5: retirado Firestore por completo — la API REST es la única
    // fuente de verdad. Ver ADR 0003 (ticket-manager-api, backend solo SQL)
    // y ADR 0005 (refresh token / auth propia) para el historial de la migración.
    { provide: TICKET_REPOSITORY_TOKEN, useClass: ApiTicketRepository },
    { provide: CATALOGO_REPOSITORY_TOKEN, useClass: ApiCatalogoRepository },
    { provide: HTTP_INTERCEPTORS, useClass: InterceptorAutenticacion, multi: true },
    { provide: APP_INITIALIZER, useFactory: inicializarSesion, deps: [ServicioAutenticacion], multi: true },
  ]
}).catch((err) => console.error(err));
