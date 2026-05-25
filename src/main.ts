import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { rutas } from './app/app.rutas';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// Repositorios concretos e InjectionTokens
import { TICKET_REPOSITORY_TOKEN, CATALOGO_REPOSITORY_TOKEN } from './app/core/models/repositorios.tokens';
import { FirestoreTicketRepository } from './app/core/repositories/firestore-ticket.repository';
import { FirestoreCatalogoRepository } from './app/core/repositories/firestore-catalogo.repository';

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(rutas),
    importProvidersFrom(
      provideFirebaseApp(() => initializeApp(environment.firebase)),
      provideAuth(() => getAuth()),
      provideFirestore(() => getFirestore())
    ),
    // Fase 1: DI que une el contrato abstracto con la implementación Firestore.
    // Para migrar a API REST, reemplazar useClass aquí sin tocar servicios ni componentes.
    { provide: TICKET_REPOSITORY_TOKEN,   useClass: FirestoreTicketRepository },
    { provide: CATALOGO_REPOSITORY_TOKEN, useClass: FirestoreCatalogoRepository },
  ]
}).catch((err) => console.error(err));

