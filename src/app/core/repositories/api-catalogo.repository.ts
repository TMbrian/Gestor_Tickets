import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Sitio, Area, Ticket } from '../models/ticket.modelo';
import { ICatalogoRepository } from '../models/catalogo.repository';
import { environment } from '../../../environments/environment';

/** `SitioDto`/`AreaDto` (backend) son idénticos entre sí y al modelo `Sitio`/`Area`
 *  del front: `{ id, nombre, idUsuario, creadoEn }`. Un solo mapeo genérico basta. */
interface CatalogoApiDto {
  id: string | null;
  nombre: string;
  idUsuario: string;
  creadoEn: number;
}

function aCatalogo<T extends { id?: string }>(dto: CatalogoApiDto): T {
  return { ...dto, id: dto.id ?? undefined } as unknown as T;
}

/**
 * Implementación de `ICatalogoRepository` sobre la API REST
 * (`/api/v1/catalogos/sitios` y `/api/v1/catalogos/areas`).
 *
 * `agregarSitio`/`actualizarSitio`/`eliminarSitio` (y su equivalente de áreas)
 * exigen rol Admin en el backend (`RequireAuthorization("SoloAdmin")`). Con
 * el `Rol` actual del front (login solo emite `'Admin'` hoy) no cambia nada,
 * pero cuando se habilite login como `'Agente'` estas llamadas devolverán
 * 403 para esos usuarios — a tener en cuenta en ese momento.
 */
@Injectable()
export class ApiCatalogoRepository implements ICatalogoRepository {

  private readonly urlSitios = `${environment.apiBaseUrl}/catalogos/sitios`;
  private readonly urlAreas = `${environment.apiBaseUrl}/catalogos/areas`;

  constructor(private readonly http: HttpClient) {}

  // ── Sitios ──────────────────────────────────────────────────────────────

  async obtenerSitios(_idUsuario: string): Promise<Sitio[]> {
    const dtos = await firstValueFrom(this.http.get<CatalogoApiDto[]>(this.urlSitios));
    return dtos.map(d => aCatalogo<Sitio>(d)).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async agregarSitio(_idUsuario: string, nombre: string): Promise<Sitio> {
    const dto = await firstValueFrom(this.http.post<CatalogoApiDto>(this.urlSitios, { nombre }));
    return aCatalogo<Sitio>(dto);
  }

  async actualizarSitio(id: string, nombre: string): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.urlSitios}/${id}`, { nombre }));
  }

  async eliminarSitio(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.urlSitios}/${id}`));
  }

  // ── Áreas ───────────────────────────────────────────────────────────────

  async obtenerAreas(_idUsuario: string): Promise<Area[]> {
    const dtos = await firstValueFrom(this.http.get<CatalogoApiDto[]>(this.urlAreas));
    return dtos.map(d => aCatalogo<Area>(d)).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async agregarArea(_idUsuario: string, nombre: string): Promise<Area> {
    const dto = await firstValueFrom(this.http.post<CatalogoApiDto>(this.urlAreas, { nombre }));
    return aCatalogo<Area>(dto);
  }

  async actualizarArea(id: string, nombre: string): Promise<void> {
    await firstValueFrom(this.http.put<void>(`${this.urlAreas}/${id}`, { nombre }));
  }

  async eliminarArea(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.urlAreas}/${id}`));
  }

  // ── Auto-población ────────────────────────────────────────────────────
  // Duplicado deliberado de la lógica ya presente en FirestoreCatalogoRepository:
  // ambas implementaciones son composiciones puras sobre los métodos de la
  // propia interfaz (no tocan el almacenamiento concreto), pero no se extrajo
  // a una base común para no tocar el archivo Firestore protegido en esta
  // fase. Candidato a extraer a una clase base o a `ServicioCatalogo` en la
  // limpieza de Fase 5/6.

  async autoPopularDesdeTickets(
    idUsuario: string,
    tickets: Ticket[]
  ): Promise<{ sitiosAgregados: number; areasAgregadas: number }> {
    try {
      const sitiosActuales = await this.obtenerSitios(idUsuario);
      const areasActuales = await this.obtenerAreas(idUsuario);

      const nombresSitios = new Set(sitiosActuales.map(s => s.nombre.toLowerCase().trim()));
      const nombresAreas = new Set(areasActuales.map(a => a.nombre.toLowerCase().trim()));

      let sitiosAgregados = 0;
      let areasAgregadas = 0;

      const sitiosUnicos = new Set<string>();
      const areasUnicas = new Set<string>();

      tickets.forEach(t => {
        const sitio = t.sitio?.trim();
        const area = t.areaAfectada?.trim();
        if (sitio) sitiosUnicos.add(sitio);
        if (area) areasUnicas.add(area);
      });

      for (const nombre of sitiosUnicos) {
        if (!nombresSitios.has(nombre.toLowerCase())) {
          await this.agregarSitio(idUsuario, nombre);
          nombresSitios.add(nombre.toLowerCase());
          sitiosAgregados++;
        }
      }

      for (const nombre of areasUnicas) {
        if (!nombresAreas.has(nombre.toLowerCase())) {
          await this.agregarArea(idUsuario, nombre);
          nombresAreas.add(nombre.toLowerCase());
          areasAgregadas++;
        }
      }

      return { sitiosAgregados, areasAgregadas };
    } catch (error) {
      console.error('Error en autoPopularDesdeTickets:', error);
      return { sitiosAgregados: 0, areasAgregadas: 0 };
    }
  }
}
