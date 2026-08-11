import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Ticket, EstadoTicket } from '../models/ticket.modelo';
import { ITicketRepository } from '../models/ticket.repository';
import { environment } from '../../../environments/environment';

/**
 * Forma exacta de `TicketDto` (backend, `TicketManager.Application.Dtos`)
 * serializada en camelCase por el `System.Text.Json` default de ASP.NET Core
 * (no hay `JsonNamingPolicy` configurada — confirmado leyendo el `Program.cs`
 * y el propio comentario de `TicketDto.cs`: "Propiedades en camelCase vía
 * System.Text.Json para compatibilidad directa").
 *
 * Es estructuralmente idéntico al modelo `Ticket` del front, campo por
 * campo y en el mismo orden — no hace falta traducir nombres, solo tipos
 * (`estado` llega como `string`, no como el union `EstadoTicket`) y
 * normalizar `null` (JSON) → `undefined` (opcionales de `Ticket`).
 */
interface TicketApiDto {
  id: string | null;
  numeroTicket: string;
  semana: number;
  anioISO: number | null;
  fechaAsignacion: string;
  horaAsignacion: string;
  fechaCierre: string | null;
  horaCierre: string | null;
  semanaCierre: number | null;
  fechaInicioSolucion: string | null;
  horaInicioSolucion: string | null;
  semanaInicioSolucion: number | null;
  tiempoSolucionMins: number | null;
  tiempoPausaMins: number;
  ultimaPausaInicio: number | null;
  estaAsignado: boolean;
  esRfc: boolean;
  numeroRfc: string | null;
  sitio: string;
  areaAfectada: string;
  descripcion: string;
  estado: string;
  idUsuario: string;
  creadoEn: number;
  actualizadoEn: number;
  rowVersion: string | null;
}

/** DTO → modelo de dominio. Cast explícito de `estado`: el backend garantiza
 *  solo los 4 valores de `EstadoTicket` vía `EstadoTicketExtensions.ToDisplayString()`,
 *  pero eso no es verificable por el compilador desde JSON — el cast documenta
 *  el límite de confianza, no lo esconde. */
function aTicket(dto: TicketApiDto): Ticket {
  return {
    ...dto,
    id: dto.id ?? undefined,
    anioISO: dto.anioISO ?? undefined,
    semanaCierre: dto.semanaCierre ?? undefined,
    rowVersion: dto.rowVersion ?? undefined,
    estado: dto.estado as EstadoTicket
  };
}

/** modelo de dominio → `CrearTicketRequest`. `idUsuario` se omite a propósito:
 *  el backend siempre lo deriva del claim `NameIdentifier` del JWT
 *  (`GetUserId(ctx)` en `Program.cs`), nunca del cuerpo — cualquier valor que
 *  `ServicioTickets.agregarTicket()` haya puesto en `ticket.idUsuario` antes
 *  de llegar acá queda sin efecto contra la API (no es un bug: es la garantía
 *  de que un cliente no puede falsificar el dueño del ticket). */
function aCrearTicketRequest(ticket: Ticket): Record<string, unknown> {
  return {
    numeroTicket: ticket.numeroTicket,
    semana: ticket.semana,
    anioISO: ticket.anioISO ?? null,
    fechaAsignacion: ticket.fechaAsignacion,
    horaAsignacion: ticket.horaAsignacion,
    fechaCierre: ticket.fechaCierre,
    horaCierre: ticket.horaCierre,
    semanaCierre: ticket.semanaCierre ?? null,
    fechaInicioSolucion: ticket.fechaInicioSolucion ?? null,
    horaInicioSolucion: ticket.horaInicioSolucion ?? null,
    semanaInicioSolucion: ticket.semanaInicioSolucion ?? null,
    tiempoSolucionMins: ticket.tiempoSolucionMins,
    tiempoPausaMins: ticket.tiempoPausaMins ?? 0,
    ultimaPausaInicio: ticket.ultimaPausaInicio ?? null,
    estaAsignado: ticket.estaAsignado,
    esRfc: ticket.esRfc,
    numeroRfc: ticket.numeroRfc,
    sitio: ticket.sitio,
    areaAfectada: ticket.areaAfectada,
    descripcion: ticket.descripcion,
    estado: ticket.estado
  };
}

/**
 * `Partial<Ticket>` → `ActualizarTicketRequest`. Se excluyen `id`,
 * `idUsuario`, `creadoEn` y `actualizadoEn`: el backend no los declara en
 * `ActualizarTicketRequest` y los ignoraría igual, pero excluirlos acá deja
 * documentado en código el gap real: `actualizadoEn` que `ServicioTickets`
 * calcula en cada `actualizarTicket()` NUNCA se persiste vía este endpoint
 * (`TicketMapper.ApplyPatch`, backend, no lo aplica). Señalado para
 * corregirse en el backend, no oculto acá.
 */
function aPatchTicket(cambios: Partial<Ticket>): Record<string, unknown> {
  const { id, idUsuario, creadoEn, actualizadoEn, ...patch } = cambios;
  return patch as Record<string, unknown>;
}

/**
 * Implementación de `ITicketRepository` sobre la API REST (`/api/v1/tickets`).
 *
 * Limitación conocida: la API no expone endpoints de conteo por sitio/área ni
 * de rename en masa (a diferencia de Firestore, que resolvía esto con una
 * query indexada). Las cuatro operaciones de integridad referencial se
 * implementan acá client-side sobre `obtenerTickets` + `actualizarTicket`:
 * funcionalmente correctas, pero O(N) llamadas HTTP en vez de una query.
 * Aceptable a la escala actual (~10 usuarios internos); si el volumen de
 * tickets crece, esto debería moverse a un endpoint dedicado en el backend.
 */
@Injectable()
export class ApiTicketRepository implements ITicketRepository {

  private readonly baseUrl = `${environment.apiBaseUrl}/tickets`;

  constructor(private readonly http: HttpClient) {}

  async obtenerTickets(_idUsuario: string): Promise<Ticket[]> {
    // idUsuario no viaja: el backend filtra por el usuario del JWT (GetUserId).
    // Se mantiene el parámetro por compatibilidad con la interfaz stateless.
    const dtos = await firstValueFrom(this.http.get<TicketApiDto[]>(this.baseUrl));
    return dtos.map(aTicket);
  }

  async obtenerTicket(id: string): Promise<Ticket | undefined> {
    return this.obtenerOUndefined(`${this.baseUrl}/${id}`);
  }

  async obtenerTicketPorNumero(_idUsuario: string, numeroTicket: string): Promise<Ticket | undefined> {
    return this.obtenerOUndefined(`${this.baseUrl}/por-numero/${encodeURIComponent(numeroTicket)}`);
  }

  private async obtenerOUndefined(url: string): Promise<Ticket | undefined> {
    try {
      const dto = await firstValueFrom(this.http.get<TicketApiDto>(url));
      return aTicket(dto);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) return undefined;
      throw error;
    }
  }

  async agregarTicket(ticket: Ticket): Promise<Ticket> {
    const dto = await firstValueFrom(
      this.http.post<TicketApiDto>(this.baseUrl, aCrearTicketRequest(ticket))
    );
    return aTicket(dto);
  }

  async actualizarTicket(id: string, cambios: Partial<Ticket>): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.baseUrl}/${id}`, aPatchTicket(cambios)));
  }

  async eliminarTicket(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }

  // ── Integridad referencial ──────────────────────────────────────────────
  // Antes descargaban el historial COMPLETO de tickets solo para contar
  // cuántos tenían un sitio/área dado. El backend ya tiene la query
  // (un solo CountAsync con índice) — GET /tickets/conteo.
  //
  // El rename en masa (actualizarNombreSitioEnMasa/AreaEnMasa) se retiró de
  // acá: ahora es responsabilidad del backend, ejecutado atómicamente dentro
  // de PUT /catalogos/sitios|areas/{id} junto con el cambio del catálogo
  // (antes eran dos pasos separados desde el front — catálogo primero,
  // N PATCH de tickets después — que podían quedar a mitad de camino si algo
  // fallaba entre medio).

  async contarTicketsPorSitio(_idUsuario: string, nombreSitio: string): Promise<number> {
    const { total } = await firstValueFrom(
      this.http.get<{ total: number }>(`${this.baseUrl}/conteo`, { params: { sitio: nombreSitio } })
    );
    return total;
  }

  async contarTicketsPorArea(_idUsuario: string, nombreArea: string): Promise<number> {
    const { total } = await firstValueFrom(
      this.http.get<{ total: number }>(`${this.baseUrl}/conteo`, { params: { area: nombreArea } })
    );
    return total;
  }
}
