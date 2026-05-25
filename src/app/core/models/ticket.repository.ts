import { Ticket } from './ticket.modelo';

/**
 * Contrato base para el repositorio de datos de Tickets.
 * Las implementaciones concretas reciben `idUsuario` explícitamente para ser
 * completamente stateless (sin depender de ServicioAutenticacion).
 */
export abstract class ITicketRepository {
  abstract obtenerTickets(idUsuario: string): Promise<Ticket[]>;
  abstract obtenerTicket(id: string): Promise<Ticket | undefined>;
  abstract obtenerTicketPorNumero(idUsuario: string, numeroTicket: string): Promise<Ticket | undefined>;
  abstract agregarTicket(ticket: Ticket): Promise<string>;
  abstract actualizarTicket(id: string, cambios: Partial<Ticket>): Promise<void>;
  abstract eliminarTicket(id: string): Promise<void>;
  abstract contarTicketsPorSitio(idUsuario: string, nombreSitio: string): Promise<number>;
  abstract contarTicketsPorArea(idUsuario: string, nombreArea: string): Promise<number>;
  abstract actualizarNombreSitioEnMasa(idUsuario: string, nombreAnterior: string, nombreNuevo: string): Promise<void>;
  abstract actualizarNombreAreaEnMasa(idUsuario: string, nombreAnterior: string, nombreNuevo: string): Promise<void>;
}
