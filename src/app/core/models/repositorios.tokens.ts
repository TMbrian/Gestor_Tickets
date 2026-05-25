import { InjectionToken } from '@angular/core';
import { ITicketRepository } from './ticket.repository';
import { ICatalogoRepository } from './catalogo.repository';

/** Token DI para el repositorio de tickets. Permite swap sin tocar componentes. */
export const TICKET_REPOSITORY_TOKEN = new InjectionToken<ITicketRepository>('ITicketRepository');

/** Token DI para el repositorio de catálogos (sitios y áreas). */
export const CATALOGO_REPOSITORY_TOKEN = new InjectionToken<ICatalogoRepository>('ICatalogoRepository');
