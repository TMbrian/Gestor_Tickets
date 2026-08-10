import { Sitio, Area, Ticket } from './ticket.modelo';

/**
 * Contrato base para el repositorio de catálogos (Sitios y Áreas).
 * Stateless: idUsuario se pasa explícitamente en cada operación.
 */
export abstract class ICatalogoRepository {
  abstract obtenerSitios(idUsuario: string): Promise<Sitio[]>;
  abstract agregarSitio(idUsuario: string, nombre: string): Promise<Sitio>;
  abstract actualizarSitio(id: string, nombre: string): Promise<void>;
  abstract eliminarSitio(id: string): Promise<void>;

  abstract obtenerAreas(idUsuario: string): Promise<Area[]>;
  abstract agregarArea(idUsuario: string, nombre: string): Promise<Area>;
  abstract actualizarArea(id: string, nombre: string): Promise<void>;
  abstract eliminarArea(id: string): Promise<void>;

  abstract autoPopularDesdeTickets(idUsuario: string, tickets: Ticket[]): Promise<{ sitiosAgregados: number; areasAgregadas: number }>;
}
