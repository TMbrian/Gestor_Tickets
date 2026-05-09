import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { ServicioAutenticacion } from './autenticacion.service';
import { Sitio, Area, Ticket } from '../models';

/**
 * Servicio de catálogos para la gestión de sitios y áreas del sistema.
 *
 * Provee operaciones CRUD sobre las colecciones de Firestore `sites` y `areas`,
 * filtrando siempre por el usuario autenticado para garantizar el aislamiento de datos.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioCatalogos {

  /**
   * @param firestore              - Instancia de Firestore inyectada por AngularFire.
   * @param servicioAutenticacion  - Servicio de autenticación para obtener el usuario activo.
   */
  constructor(
    private firestore: Firestore,
    private servicioAutenticacion: ServicioAutenticacion
  ) { }

  // ---------------------------------------------------------------------------
  // Utilidades internas
  // ---------------------------------------------------------------------------

  /**
   * Obtiene el ID del usuario actualmente autenticado.
   * Retorna cadena vacía si no hay sesión activa.
   */
  private get idUsuarioActual(): string {
    return this.servicioAutenticacion.usuarioActual?.id || '';
  }

  // ---------------------------------------------------------------------------
  // Sitios
  // ---------------------------------------------------------------------------

  /** Referencia a la colección de sitios en Firestore */
  private get coleccionSitios() {
    return collection(this.firestore, 'sites');
  }

  /**
   * Obtiene todos los sitios pertenecientes al usuario autenticado,
   * ordenados alfabéticamente por nombre.
   *
   * @returns Lista de sitios del usuario o arreglo vacío si no hay sesión.
   */
  async obtenerSitios(): Promise<Sitio[]> {
    if (!this.idUsuarioActual) return [];

    const consulta = query(
      this.coleccionSitios,
      where('idUsuario', '==', this.idUsuarioActual)
    );
    const resultado = await getDocs(consulta);

    return resultado.docs
      .map(documento => ({ id: documento.id, ...documento.data() } as Sitio))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /**
   * Agrega un nuevo sitio asociado al usuario autenticado.
   *
   * @param nombre - Nombre descriptivo del sitio o sucursal.
   * @returns ID del documento creado en Firestore.
   */
  async agregarSitio(nombre: string): Promise<string> {
    const nuevoSitio: Sitio = {
      nombre,
      idUsuario: this.idUsuarioActual,
      creadoEn: Date.now()
    };
    const referenciaDoc = await addDoc(this.coleccionSitios, nuevoSitio);
    return referenciaDoc.id;
  }

  /**
   * Actualiza el nombre de un sitio existente.
   *
   * @param id     - Identificador del documento en Firestore.
   * @param nombre - Nuevo nombre para el sitio.
   */
  async actualizarSitio(id: string, nombre: string): Promise<void> {
    const referenciaDoc = doc(this.firestore, `sites/${id}`);
    return updateDoc(referenciaDoc, { nombre });
  }

  /**
   * Elimina un sitio de Firestore de forma permanente.
   *
   * @param id - Identificador del documento a eliminar.
   */
  async eliminarSitio(id: string): Promise<void> {
    const referenciaDoc = doc(this.firestore, `sites/${id}`);
    return deleteDoc(referenciaDoc);
  }

  // ---------------------------------------------------------------------------
  // Áreas
  // ---------------------------------------------------------------------------

  /** Referencia a la colección de áreas en Firestore */
  private get coleccionAreas() {
    return collection(this.firestore, 'areas');
  }

  /**
   * Obtiene todas las áreas pertenecientes al usuario autenticado,
   * ordenadas alfabéticamente por nombre.
   *
   * @returns Lista de áreas del usuario o arreglo vacío si no hay sesión.
   */
  async obtenerAreas(): Promise<Area[]> {
    if (!this.idUsuarioActual) return [];

    const consulta = query(
      this.coleccionAreas,
      where('idUsuario', '==', this.idUsuarioActual)
    );
    const resultado = await getDocs(consulta);

    return resultado.docs
      .map(documento => ({ id: documento.id, ...documento.data() } as Area))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  /**
   * Agrega una nueva área asociada al usuario autenticado.
   *
   * @param nombre - Nombre descriptivo del área o departamento.
   * @returns ID del documento creado en Firestore.
   */
  async agregarArea(nombre: string): Promise<string> {
    const nuevaArea: Area = {
      nombre,
      idUsuario: this.idUsuarioActual,
      creadoEn: Date.now()
    };
    const referenciaDoc = await addDoc(this.coleccionAreas, nuevaArea);
    return referenciaDoc.id;
  }

  /**
   * Actualiza el nombre de un área existente.
   *
   * @param id     - Identificador del documento en Firestore.
   * @param nombre - Nuevo nombre para el área.
   */
  async actualizarArea(id: string, nombre: string): Promise<void> {
    const referenciaDoc = doc(this.firestore, `areas/${id}`);
    return updateDoc(referenciaDoc, { nombre });
  }

  /**
   * Elimina un área de Firestore de forma permanente.
   *
   * @param id - Identificador del documento a eliminar.
   */
  async eliminarArea(id: string): Promise<void> {
    const referenciaDoc = doc(this.firestore, `areas/${id}`);
    return deleteDoc(referenciaDoc);
  }

  // ---------------------------------------------------------------------------
  // Auto-población desde tickets
  // ---------------------------------------------------------------------------

  /**
   * Extrae sitios y áreas únicas de un listado de tickets e inserta en Firestore
   * aquellos que aún no existan en los catálogos del usuario.
   *
   * Útil para poblar los catálogos automáticamente al importar tickets masivamente.
   * Evita llamadas redundantes a Firestore agrupando los nombres únicos antes de escribir.
   *
   * @param tickets - Lista de tickets de los que extraer sitios y áreas.
   * @returns Objeto con el conteo de sitios y áreas nuevos agregados.
   */
  async autoPopularDesdTickets(
    tickets: Ticket[]
  ): Promise<{ sitiosAgregados: number; areasAgregadas: number }> {
    try {
      const sitiosActuales = await this.obtenerSitios();
      const areasActuales = await this.obtenerAreas();

      // Conjuntos de nombres ya existentes en minúsculas para comparación insensible a mayúsculas
      const nombresSitios = new Set(sitiosActuales.map(s => s.nombre.toLowerCase().trim()));
      const nombresAreas = new Set(areasActuales.map(a => a.nombre.toLowerCase().trim()));

      let sitiosAgregados = 0;
      let areasAgregadas = 0;

      // Extracción de nombres únicos para minimizar escrituras a Firestore
      const sitiosUnicos = new Set<string>();
      const areasUnicas = new Set<string>();

      tickets.forEach(ticket => {
        // Compatibilidad con nombres de campos anteriores en caso de datos heredados
        const sitio = (ticket.sitio || (ticket as any)['Sitio/CEDI'])?.trim();
        const area = (ticket.areaAfectada || (ticket as any)['Área Afectada'])?.trim();

        if (sitio) sitiosUnicos.add(sitio);
        if (area) areasUnicas.add(area);
      });

      // Inserción de sitios nuevos
      for (const nombreSitio of sitiosUnicos) {
        if (!nombresSitios.has(nombreSitio.toLowerCase())) {
          await this.agregarSitio(nombreSitio);
          nombresSitios.add(nombreSitio.toLowerCase());
          sitiosAgregados++;
        }
      }

      // Inserción de áreas nuevas
      for (const nombreArea of areasUnicas) {
        if (!nombresAreas.has(nombreArea.toLowerCase())) {
          await this.agregarArea(nombreArea);
          nombresAreas.add(nombreArea.toLowerCase());
          areasAgregadas++;
        }
      }

      console.log(`Auto-población finalizada: ${sitiosAgregados} sitios, ${areasAgregadas} áreas.`);
      return { sitiosAgregados, areasAgregadas };

    } catch (error) {
      console.error('Error en autoPopularDesdeTickets:', error);
      return { sitiosAgregados: 0, areasAgregadas: 0 };
    }
  }
}