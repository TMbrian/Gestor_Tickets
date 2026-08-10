import { ITicketRepository } from '../models/ticket.repository';
import { Ticket, EstadisticasTicket } from '../models/ticket.modelo';

export class MockTicketRepository implements ITicketRepository {
  private tickets: Ticket[] = [];

  constructor(datosIniciales: Ticket[] = []) {
    this.tickets = [...datosIniciales];
  }

  async obtenerTickets(): Promise<Ticket[]> {
    return [...this.tickets];
  }

  async obtenerTicket(id: string): Promise<Ticket | undefined> {
    return this.tickets.find(t => t.id === id);
  }

  async obtenerTicketPorNumero(numeroTicket: string): Promise<Ticket | undefined> {
    return this.tickets.find(t => t.numeroTicket === numeroTicket);
  }

  async agregarTicket(ticket: Ticket): Promise<Ticket> {
    const id = Date.now().toString();
    const nuevoTicket = { ...ticket, id };
    this.tickets.push(nuevoTicket);
    return nuevoTicket;
  }

  async actualizarTicket(id: string, cambios: Partial<Ticket>): Promise<void> {
    const index = this.tickets.findIndex(t => t.id === id);
    if (index !== -1) {
      this.tickets[index] = { ...this.tickets[index], ...cambios };
    }
  }

  async eliminarTicket(id: string): Promise<void> {
    this.tickets = this.tickets.filter(t => t.id !== id);
  }

  async obtenerEstadisticas(semana?: number, anio?: number): Promise<EstadisticasTicket> {
    let filtrados = this.tickets;
    if (semana !== undefined && anio !== undefined) {
      filtrados = this.tickets.filter(t => t.semana === semana && t.anioISO === anio);
    }
    const porEstado: any = { 'Abierto': 0, 'En Progreso': 0, 'Pausado': 0, 'Cerrado': 0 };
    filtrados.forEach(t => porEstado[t.estado] = (porEstado[t.estado] || 0) + 1);
    
    return {
      total: filtrados.length,
      porEstado,
      promedioTiempoSolucionMins: 0 // Mock omitido para simplicidad temporal
    };
  }

  async contarTicketsPorSitio(nombreSitio: string): Promise<number> {
    return this.tickets.filter(t => t.sitio === nombreSitio).length;
  }

  async contarTicketsPorArea(nombreArea: string): Promise<number> {
    return this.tickets.filter(t => t.areaAfectada === nombreArea).length;
  }

  async actualizarNombreSitioEnMasa(nombre: string, nuevo: string): Promise<void> {
    this.tickets.forEach(t => { if (t.sitio === nombre) t.sitio = nuevo; });
  }

  async actualizarNombreAreaEnMasa(nombre: string, nuevo: string): Promise<void> {
    this.tickets.forEach(t => { if (t.areaAfectada === nombre) t.areaAfectada = nuevo; });
  }
}
