import { Injectable, Inject } from '@angular/core';
import { Sitio, Area, Ticket } from '../models/ticket.modelo';
import { ICatalogoRepository } from '../models/catalogo.repository';
import { CATALOGO_REPOSITORY_TOKEN } from '../models/repositorios.tokens';
import { ServicioAutenticacion } from './autenticacion.service';

/**
 * Servicio de dominio para la gestión de catálogos (Sitios y Áreas).
 *
 * RESPONSABILIDAD: Orquestación de catálogos — no tiene lógica de acceso a datos.
 * Toda persistencia se delega al repositorio inyectado via CATALOGO_REPOSITORY_TOKEN.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioCatalogos {

  constructor(
    @Inject(CATALOGO_REPOSITORY_TOKEN) private readonly repo: ICatalogoRepository,
    private readonly servicioAutenticacion: ServicioAutenticacion
  ) {}

  private get idUsuarioActual(): string {
    return this.servicioAutenticacion.usuarioActual?.id || '';
  }

  // ---------------------------------------------------------------------------
  // Sitios
  // ---------------------------------------------------------------------------

  async obtenerSitios(): Promise<Sitio[]> {
    return this.repo.obtenerSitios(this.idUsuarioActual);
  }

  async agregarSitio(nombre: string): Promise<Sitio> {
    return this.repo.agregarSitio(this.idUsuarioActual, nombre);
  }

  async actualizarSitio(id: string, nombre: string): Promise<void> {
    return this.repo.actualizarSitio(id, nombre);
  }

  async eliminarSitio(id: string): Promise<void> {
    return this.repo.eliminarSitio(id);
  }

  // ---------------------------------------------------------------------------
  // Áreas
  // ---------------------------------------------------------------------------

  async obtenerAreas(): Promise<Area[]> {
    return this.repo.obtenerAreas(this.idUsuarioActual);
  }

  async agregarArea(nombre: string): Promise<Area> {
    return this.repo.agregarArea(this.idUsuarioActual, nombre);
  }

  async actualizarArea(id: string, nombre: string): Promise<void> {
    return this.repo.actualizarArea(id, nombre);
  }

  async eliminarArea(id: string): Promise<void> {
    return this.repo.eliminarArea(id);
  }

  // ---------------------------------------------------------------------------
  // Auto-población
  // ---------------------------------------------------------------------------

  async autoPopularDesdTickets(tickets: Ticket[]): Promise<{ sitiosAgregados: number; areasAgregadas: number }> {
    return this.repo.autoPopularDesdeTickets(this.idUsuarioActual, tickets);
  }
}