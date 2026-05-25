import { Ticket, EstadisticasTicket } from './ticket.modelo';

/**
 * Contrato base para el repositorio de datos de Tickets.
 * Separa la capa de presentación y lógica de negocio de la implementación
 * específica de almacenamiento (ej. Firebase, SQL, REST API local).
 */
export abstract class ITicketRepository {
  /** Obtiene todos los tickets gestionados por el usuario */
  abstract obtenerTickets(): Promise<Ticket[]>;

  /** Obtiene un ticket por su ID único interno */
  abstract obtenerTicket(id: string): Promise<Ticket | undefined>;

  /** Obtiene un ticket por su número visible (referencia) */
  abstract obtenerTicketPorNumero(numeroTicket: string): Promise<Ticket | undefined>;

  /** Guarda un nuevo ticket en el origen de datos */
  abstract agregarTicket(ticket: Ticket): Promise<string>;

  /** Actualiza parcialmente los campos de un ticket existente */
  abstract actualizarTicket(id: string, cambios: Partial<Ticket>): Promise<void>;

  /** Elimina definitivamente un ticket del origen de datos */
  abstract eliminarTicket(id: string): Promise<void>;

  /** Obtiene analíticas agrupadas, filtrables por semana ISO y año */
  abstract obtenerEstadisticas(semana?: number, anio?: number): Promise<EstadisticasTicket>;

  /** Integridad referencial: cuenta cuántos tickets usan este sitio */
  abstract contarTicketsPorSitio(nombreSitio: string): Promise<number>;

  /** Integridad referencial: cuenta cuántos tickets usan esta área */
  abstract contarTicketsPorArea(nombreArea: string): Promise<number>;

  /** Actualización en cascada del nombre de un sitio */
  abstract actualizarNombreSitioEnMasa(nombreAnterior: string, nombreNuevo: string): Promise<void>;

  /** Actualización en cascada del nombre de un área */
  abstract actualizarNombreAreaEnMasa(nombreAnterior: string, nombreNuevo: string): Promise<void>;
}
