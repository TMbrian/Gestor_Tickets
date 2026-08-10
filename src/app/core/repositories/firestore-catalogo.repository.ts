import { Injectable } from '@angular/core';
import {
  Firestore, collection, doc, addDoc, updateDoc,
  deleteDoc, query, where, getDocs
} from '@angular/fire/firestore';
import { Sitio, Area, Ticket } from '../models/ticket.modelo';
import { ICatalogoRepository } from '../models/catalogo.repository';

/**
 * Implementación concreta de ICatalogoRepository sobre Firestore.
 * Centraliza TODA la lógica de catálogos (sitios y áreas) que usaba @angular/fire.
 */
@Injectable()
export class FirestoreCatalogoRepository implements ICatalogoRepository {

  constructor(private readonly firestore: Firestore) {}

  private coleccionSitios() {
    return collection(this.firestore, 'sites');
  }

  private coleccionAreas() {
    return collection(this.firestore, 'areas');
  }

  // ---------------------------------------------------------------------------
  // Sitios
  // ---------------------------------------------------------------------------

  async obtenerSitios(idUsuario: string): Promise<Sitio[]> {
    if (!idUsuario) return [];
    const consulta = query(this.coleccionSitios(), where('idUsuario', '==', idUsuario));
    const resultado = await getDocs(consulta);
    return resultado.docs
      .map(d => ({ id: d.id, ...d.data() } as Sitio))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async agregarSitio(idUsuario: string, nombre: string): Promise<Sitio> {
    const nuevoSitio: Sitio = { nombre, idUsuario, creadoEn: Date.now() };
    const ref = await addDoc(this.coleccionSitios(), nuevoSitio);
    return { ...nuevoSitio, id: ref.id };
  }

  async actualizarSitio(id: string, nombre: string): Promise<void> {
    return updateDoc(doc(this.firestore, `sites/${id}`), { nombre });
  }

  async eliminarSitio(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, `sites/${id}`));
  }

  // ---------------------------------------------------------------------------
  // Áreas
  // ---------------------------------------------------------------------------

  async obtenerAreas(idUsuario: string): Promise<Area[]> {
    if (!idUsuario) return [];
    const consulta = query(this.coleccionAreas(), where('idUsuario', '==', idUsuario));
    const resultado = await getDocs(consulta);
    return resultado.docs
      .map(d => ({ id: d.id, ...d.data() } as Area))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  async agregarArea(idUsuario: string, nombre: string): Promise<Area> {
    const nuevaArea: Area = { nombre, idUsuario, creadoEn: Date.now() };
    const ref = await addDoc(this.coleccionAreas(), nuevaArea);
    return { ...nuevaArea, id: ref.id };
  }

  async actualizarArea(id: string, nombre: string): Promise<void> {
    return updateDoc(doc(this.firestore, `areas/${id}`), { nombre });
  }

  async eliminarArea(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, `areas/${id}`));
  }

  // ---------------------------------------------------------------------------
  // Auto-población
  // ---------------------------------------------------------------------------

  async autoPopularDesdeTickets(
    idUsuario: string,
    tickets: Ticket[]
  ): Promise<{ sitiosAgregados: number; areasAgregadas: number }> {
    try {
      const sitiosActuales = await this.obtenerSitios(idUsuario);
      const areasActuales = await this.obtenerAreas(idUsuario);

      const nombresSitios = new Set(sitiosActuales.map(s => s.nombre.toLowerCase().trim()));
      const nombresAreas  = new Set(areasActuales.map(a => a.nombre.toLowerCase().trim()));

      let sitiosAgregados = 0;
      let areasAgregadas  = 0;

      const sitiosUnicos = new Set<string>();
      const areasUnicas  = new Set<string>();

      tickets.forEach(t => {
        const sitio = (t.sitio || (t as any)['Sitio/CEDI'])?.trim();
        const area  = (t.areaAfectada || (t as any)['Área Afectada'])?.trim();
        if (sitio) sitiosUnicos.add(sitio);
        if (area)  areasUnicas.add(area);
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
