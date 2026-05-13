import { Injectable } from '@angular/core';
import {
  Firestore, collection, doc, docData, addDoc, updateDoc,
  deleteDoc, query, where, getDocs, limit
} from '@angular/fire/firestore';
import { Ticket, EstadisticasTicket, EstadoTicket } from '../models';
import { ServicioAutenticacion } from './autenticacion.service';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';

/**
 * Servicio principal para la gestión de tickets de soporte técnico.
 *
 * Centraliza todas las operaciones CRUD sobre Firestore, el cálculo de métricas,
 * la exportación a Excel y la importación masiva desde archivos de hoja de cálculo.
 * Todos los datos se filtran por el usuario autenticado para garantizar el aislamiento.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioTickets {

  /**
   * @param firestore              - Instancia de Firestore inyectada por AngularFire.
   * @param servicioAutenticacion  - Servicio de autenticación para obtener el usuario activo.
   */
  constructor(
    private readonly firestore: Firestore,
    private readonly servicioAutenticacion: ServicioAutenticacion
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

  /** Referencia a la colección de tickets en Firestore */
  private get coleccionTickets() {
    return collection(this.firestore, 'tickets');
  }

  // ---------------------------------------------------------------------------
  // Operaciones CRUD
  // ---------------------------------------------------------------------------

  /**
   * Obtiene todos los tickets pertenecientes al usuario autenticado.
   *
   * @returns Lista de tickets o arreglo vacío si no hay sesión activa.
   */
  async obtenerTickets(): Promise<Ticket[]> {
    if (!this.idUsuarioActual) return [];
    const consulta = query(
      this.coleccionTickets,
      where('idUsuario', '==', this.idUsuarioActual)
    );
    const resultado = await getDocs(consulta);
    return resultado.docs.map(documento => {
      const data = documento.data() as any;
      // Normalización de datos antiguos (Inglés -> Español)
      return {
        id: documento.id,
        numeroTicket: data.numeroTicket || data.ticketNumber || '',
        semana: data.semana ?? data.week ?? 1,
        fechaAsignacion: data.fechaAsignacion || data.assignmentDate || '',
        horaAsignacion: data.horaAsignacion || data.assignmentTime || '',
        fechaCierre: data.fechaCierre || data.closeDate || null,
        horaCierre: data.horaCierre || data.closeTime || null,
        semanaCierre: data.semanaCierre ?? null,
        fechaInicioSolucion: data.fechaInicioSolucion ?? null,
        horaInicioSolucion: data.horaInicioSolucion ?? null,
        semanaInicioSolucion: data.semanaInicioSolucion ?? null,
        tiempoSolucionMins: data.tiempoSolucionMins ?? data.solutionTimeMins ?? null,
        estaAsignado: data.estaAsignado ?? data.isAssigned ?? false,
        esRfc: data.esRfc ?? data.isRfc ?? false,
        numeroRfc: data.numeroRfc || data.rfcNumber || null,
        sitio: data.sitio || data.site || '',
        areaAfectada: data.areaAfectada || data.affectedArea || '',
        descripcion: data.descripcion || data.description || '',
        estado: data.estado || data.status || 'Abierto',

        tiempoPausaMins: data.tiempoPausaMins ?? 0,
        ultimaPausaInicio: data.ultimaPausaInicio || null,
        idUsuario: data.idUsuario || '',
        creadoEn: data.creadoEn ?? data.createdAt ?? Date.now(),
        actualizadoEn: data.actualizadoEn ?? data.updatedAt ?? Date.now()
      } as Ticket;
    });
  }

  /**
   * Obtiene un ticket específico por su ID de documento en Firestore.
   *
   * @param id - Identificador del documento en Firestore.
   * @returns El ticket encontrado o `undefined` si no existe.
   */
  async obtenerTicket(id: string): Promise<Ticket | undefined> {
    const referenciaDoc = doc(this.firestore, `tickets/${id}`);
    const datos = await firstValueFrom(docData(referenciaDoc, { idField: 'id' }));
    return datos as Ticket;
  }

  /**
   * Busca un ticket por su número de ticket visible (referencia humana).
   * Retorna el primero encontrado si existe más de uno con el mismo número.
   *
   * @param numeroTicket - Número de ticket a buscar.
   * @returns El ticket encontrado o `undefined` si no existe.
   */
  async obtenerTicketPorNumero(numeroTicket: string): Promise<Ticket | undefined> {
    if (!this.idUsuarioActual) return undefined;

    const consulta = query(
      this.coleccionTickets,
      where('idUsuario', '==', this.idUsuarioActual),
      where('numeroTicket', '==', numeroTicket),
      limit(1)
    );
    const resultado = await getDocs(consulta);
    if (resultado.empty) return undefined;

    const documento = resultado.docs[0];
    return { id: documento.id, ...documento.data() } as any;
  }

  /**
   * Agrega un nuevo ticket a Firestore.
   * Asigna automáticamente el usuario, marca de tiempo y tiempo de solución.
   * Los valores `undefined` se convierten a `null` para compatibilidad con Firestore.
   *
   * @param ticket - Datos del ticket a crear.
   * @returns ID del documento creado en Firestore.
   */
  async agregarTicket(ticket: Ticket): Promise<string> {
    ticket.idUsuario = this.idUsuarioActual;
    ticket.tiempoSolucionMins = this.calcularTiempoSolucion(ticket);
    ticket.creadoEn = Date.now();
    ticket.actualizadoEn = Date.now();

    // Limpieza de valores `undefined` para compatibilidad con Firestore
    const datos = JSON.parse(JSON.stringify(ticket, (_, valor) => valor === undefined ? null : valor));
    const referenciaDoc = await addDoc(this.coleccionTickets, datos);
    return referenciaDoc.id;
  }

  /**
   * Actualiza campos específicos de un ticket existente.
   * Recalcula el tiempo de solución si se modifican fechas u horas relevantes.
   *
   * @param id      - Identificador del documento en Firestore.
   * @param cambios - Objeto parcial con los campos a actualizar.
   */
  async actualizarTicket(id: string, cambios: Partial<Ticket>): Promise<void> {
    cambios.actualizadoEn = Date.now();

    // Recalcula el tiempo de solución si se modificó alguna fecha u hora
    const afectaFechas = cambios.fechaAsignacion !== undefined
      || cambios.horaAsignacion !== undefined
      || cambios.fechaCierre !== undefined
      || cambios.horaCierre !== undefined;

    if (afectaFechas || cambios.estado === 'Cerrado') {
      const ticketActual = await this.obtenerTicket(id);
      if (ticketActual) {
        let ticketMergeado = { ...ticketActual, ...cambios } as Ticket;

        // Gestión de la lógica de pausa al cambiar de estado
        if (cambios.estado !== undefined && cambios.estado !== ticketActual.estado) {
          // Si entra en pausa
          if (cambios.estado === 'Pausado') {
            cambios.ultimaPausaInicio = Date.now();
          }
          // Si sale de pausa (a cualquier otro estado)
          else if (ticketActual.estado === 'Pausado' && ticketActual.ultimaPausaInicio) {
            const diffMins = Math.round((Date.now() - ticketActual.ultimaPausaInicio) / 60000);
            cambios.tiempoPausaMins = (ticketActual.tiempoPausaMins || 0) + diffMins;
            cambios.ultimaPausaInicio = null;
            // Actualizar el mergeado para que el cálculo de solución use el tiempo de pausa acumulado
            ticketMergeado.tiempoPausaMins = cambios.tiempoPausaMins;
            ticketMergeado.ultimaPausaInicio = null;
          }
        }

        cambios.tiempoSolucionMins = this.calcularTiempoSolucion(ticketMergeado);
      }
    }

    const referenciaDoc = doc(this.firestore, `tickets/${id}`);
    const datos = JSON.parse(JSON.stringify(cambios, (_, valor) => valor === undefined ? null : valor));
    return updateDoc(referenciaDoc, datos);
  }

  /**
   * Elimina un ticket de Firestore de forma permanente.
   *
   * @param id - Identificador del documento a eliminar.
   */
  async eliminarTicket(id: string): Promise<void> {
    const referenciaDoc = doc(this.firestore, `tickets/${id}`);
    return deleteDoc(referenciaDoc);
  }

  // ---------------------------------------------------------------------------
  // Cálculo de métricas
  // ---------------------------------------------------------------------------

  /**
   * Calcula el tiempo de solución de un ticket en minutos.
   * Retorna `null` si faltan la fecha o la hora de asignación o cierre.
   *
   * @param ticket - Ticket del que se calcula el tiempo de solución.
   * @returns Minutos de resolución (mínimo 0) o `null` si los datos son incompletos.
   */
  calcularTiempoSolucion(ticket: Ticket): number | null {
    if (!ticket.fechaCierre || !ticket.horaCierre || !ticket.fechaAsignacion || !ticket.horaAsignacion) {
      return null;
    }

    const inicio = new Date(`${ticket.fechaAsignacion}T${ticket.horaAsignacion}`);
    const fin = new Date(`${ticket.fechaCierre}T${ticket.horaCierre}`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null;

    const diferenciaTotalMins = Math.round((fin.getTime() - inicio.getTime()) / 60000);
    const tiempoPausa = ticket.tiempoPausaMins || 0;

    return Math.max(0, diferenciaTotalMins - tiempoPausa);
  }

  /**
   * Calcula estadísticas agregadas de los tickets del usuario.
   * Opcionalmente filtra por semana ISO y año.
   *
   * @param semana - Número de semana ISO (1-53) para filtrar (opcional).
   * @param anio   - Año correspondiente a la semana (opcional).
   * @returns Estadísticas con total, conteo por estado y promedio de solución.
   */
  async obtenerEstadisticas(semana?: number, anio?: number): Promise<EstadisticasTicket> {
    const todos = await this.obtenerTickets();
    let filtrados = todos;

    if (semana !== undefined && anio !== undefined) {
      filtrados = todos.filter(ticket => {
        if (!ticket.fechaAsignacion) return false;
        const fecha = new Date(ticket.fechaAsignacion);
        if (Number.isNaN(fecha.getTime())) return false;

        // Cálculo de semana ISO 8601
        const fechaNormalizada = new Date(fecha);
        fechaNormalizada.setHours(0, 0, 0, 0);
        fechaNormalizada.setDate(fechaNormalizada.getDate() + 3 - (fechaNormalizada.getDay() + 6) % 7);
        const primeraSemana = new Date(fechaNormalizada.getFullYear(), 0, 4);
        const semanaISO = 1 + Math.round(
          ((fechaNormalizada.getTime() - primeraSemana.getTime()) / 86400000
            - 3 + (primeraSemana.getDay() + 6) % 7) / 7
        );
        const anioISO = fechaNormalizada.getFullYear();
        return semanaISO === semana && anioISO === anio;
      });
    }

    const estadisticas: EstadisticasTicket = {
      total: filtrados.length,
      porEstado: { 'Abierto': 0, 'En Progreso': 0, 'Pausado': 0, 'Cerrado': 0 },
      promedioTiempoSolucionMins: 0
    };

    let totalMinutosSolucion = 0;
    let contadorCerradosConTiempo = 0;

    filtrados.forEach(ticket => {
      if (estadisticas.porEstado[ticket.estado] !== undefined) {
        estadisticas.porEstado[ticket.estado]! += 1;
      } else {
        estadisticas.porEstado[ticket.estado] = 1;
      }

      if (ticket.estado === 'Cerrado'
        && ticket.tiempoSolucionMins !== null
        && ticket.tiempoSolucionMins !== undefined) {
        totalMinutosSolucion += ticket.tiempoSolucionMins;
        contadorCerradosConTiempo++;
      }
    });

    if (contadorCerradosConTiempo > 0) {
      estadisticas.promedioTiempoSolucionMins = Math.round(
        totalMinutosSolucion / contadorCerradosConTiempo
      );
    }

    return estadisticas;
  }

  // ---------------------------------------------------------------------------
  // Exportación e importación
  // ---------------------------------------------------------------------------

  /**
   * Exporta los tickets del usuario a un archivo Excel (.xlsx) y lo descarga.
   * Opcionalmente filtra por número de semana antes de exportar.
   *
   * @param filtroSemana - Número de semana para filtrar la exportación (opcional).
   */
  async exportarAExcel(filtroSemana?: number): Promise<void> {
    let tickets = await this.obtenerTickets();

    if (filtroSemana !== undefined) {
      tickets = tickets.filter(t => t.semana === filtroSemana);
    }

    // Mapeo a columnas con nombres legibles en español para el archivo Excel
    const filas = tickets.map(t => ({
      'Número de Ticket': t.numeroTicket,
      'Semana': t.semana,
      'Fecha Asignación': t.fechaAsignacion,
      'Hora Asignación': t.horaAsignacion,
      'Sitio/CEDI': t.sitio,
      'Área Afectada': t.areaAfectada,
      'Descripción': t.descripcion,
      'Estado': t.estado,
      'Asignado Oficialmente': t.estaAsignado ? 'SI' : 'NO',
      'Emergente RFC': t.esRfc ? 'SI' : 'NO',
      'Número RFC': t.numeroRfc || '',
      'Fecha Cierre': t.fechaCierre || '',
      'Hora Cierre': t.horaCierre || '',
      'Solución Hrs': t.tiempoSolucionMins ? (t.tiempoSolucionMins / 60).toFixed(1) : '0'
    }));

    const hojaDatos: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filas);

    // Anchos de columna para mejorar la legibilidad del archivo
    hojaDatos['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      { wch: 20 }, { wch: 22 }, { wch: 40 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 14 }
    ];

    const libroDeTrabajo = XLSX.utils.book_new();
    const etiquetaSemana = filtroSemana ? `Semana_${filtroSemana}` : 'Historial_Completo';
    XLSX.utils.book_append_sheet(libroDeTrabajo, hojaDatos, 'Histórico');
    XLSX.writeFile(libroDeTrabajo, `Tickets_${etiquetaSemana}.xlsx`);
  }

  /**
   * Genera y descarga una plantilla Excel de importación con datos de ejemplo
   * e instrucciones de uso en una hoja separada.
   */
  async descargarPlantilla(): Promise<void> {
    const datosEjemplo = [
      {
        'Número de Ticket': '12345',
        'Semana': 19,
        'Fecha Asignación': '2026-05-05',
        'Hora Asignación': '08:00',
        'Sitio/CEDI': 'CEDI Monterrey',
        'Área Afectada': 'Redes / Conectividad',
        'Descripción': 'Sin conexión a la red en el edificio A, planta baja',
        'Estado': 'Abierto',
        'Asignado Oficialmente': 'SI',
        'Emergente RFC': 'NO',
        'Número RFC': '',
        'Fecha Cierre': '',
        'Hora Cierre': ''
      },
      {
        'Número de Ticket': '12346',
        'Semana': 19,
        'Fecha Asignación': '2026-05-05',
        'Hora Asignación': '09:30',
        'Sitio/CEDI': 'CEDI CDMX',
        'Área Afectada': 'Hardware',
        'Descripción': 'Pantalla del monitor con líneas verticales en estación de trabajo #15',
        'Estado': 'Cerrado',
        'Asignado Oficialmente': 'SI',
        'Emergente RFC': 'NO',
        'Número RFC': '',
        'Fecha Cierre': '2026-05-06',
        'Hora Cierre': '14:00'
      },
      {
        'Número de Ticket': '12347',
        'Semana': 19,
        'Fecha Asignación': '2026-05-06',
        'Hora Asignación': '11:15',
        'Sitio/CEDI': 'CEDI Guadalajara',
        'Área Afectada': 'Software / Aplicaciones',
        'Descripción': 'Error al ejecutar el módulo de facturación electrónica',
        'Estado': 'En Progreso',
        'Asignado Oficialmente': 'NO',
        'Emergente RFC': 'SI',
        'Número RFC': 'RFC-EMR-0045',
        'Fecha Cierre': '',
        'Hora Cierre': ''
      }
    ];

    const hojaPlantilla: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosEjemplo);
    hojaPlantilla['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      { wch: 22 }, { wch: 24 }, { wch: 45 }, { wch: 14 },
      { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }
    ];

    // Hoja de instrucciones para guiar al usuario durante la importación
    const instrucciones = [
      ['📋 INSTRUCCIONES DE USO - Plantilla de Importación de Tickets'],
      [''],
      ['1. Usa la hoja "Plantilla_Importacion" para llenar tus datos.'],
      ['2. NO modifiques los nombres de las columnas (encabezados).'],
      ['3. Elimina las filas de ejemplo antes de importar.'],
      [''],
      ['📌 CAMPOS OBLIGATORIOS:'],
      ['   • Número de Ticket (solo números)'],
      ['   • Semana (1-53)'],
      ['   • Fecha Asignación (formato: YYYY-MM-DD)'],
      ['   • Hora Asignación (formato: HH:MM)'],
      ['   • Sitio/CEDI'],
      ['   • Área Afectada'],
      ['   • Descripción'],
      ['   • Estado (Abierto, En Progreso, Cerrado)'],
      [''],
      ['📌 CAMPOS OPCIONALES:'],
      ['   • Asignado Oficialmente (SI / NO)'],
      ['   • Emergente RFC (SI / NO)'],
      ['   • Número RFC (texto libre)'],
      ['   • Fecha Cierre (formato: YYYY-MM-DD)'],
      ['   • Hora Cierre (formato: HH:MM)'],
      [''],
      ['⚠️ NOTAS IMPORTANTES:'],
      ['   • Los tickets con número duplicado serán OMITIDOS automáticamente.'],
      ['   • El tiempo de solución se calcula automáticamente si hay fecha/hora de cierre.'],
      ['   • Si un Sitio o Área no existe en los catálogos, se creará automáticamente.']
    ];

    const hojaInstrucciones: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(instrucciones);
    hojaInstrucciones['!cols'] = [{ wch: 75 }];

    const libroDeTrabajo = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libroDeTrabajo, hojaInstrucciones, 'Instrucciones');
    XLSX.utils.book_append_sheet(libroDeTrabajo, hojaPlantilla, 'Plantilla_Importacion');
    XLSX.writeFile(libroDeTrabajo, 'Plantilla_Tickets.xlsx');
  }

  /**
   * Importa tickets masivamente desde un archivo Excel (.xlsx o .xls).
   *
   * Detecta los encabezados de forma flexible (con o sin acentos, variantes comunes).
   * Los tickets con número duplicado se omiten sin lanzar error.
   * El tiempo de solución se recalcula automáticamente si hay fechas de cierre.
   *
   * @param archivo - Objeto `File` del Excel seleccionado por el usuario.
   * @returns Objeto con el conteo de tickets agregados y omitidos.
   */
  async importarDesdeExcel(archivo: File): Promise<{ agregados: number; omitidos: number }> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();

      lector.onload = async (evento) => {
        try {
          const bytesArchivo = new Uint8Array((evento.target as any).result);
          const libroDeTrabajo = XLSX.read(bytesArchivo, {
            type: 'array',
            cellDates: true,
            dateNF: 'yyyy-mm-dd'
          });

          const nombrePrimeraHoja = libroDeTrabajo.SheetNames[0];
          const primeraHoja = libroDeTrabajo.Sheets[nombrePrimeraHoja];
          const filas: any[] = XLSX.utils.sheet_to_json(primeraHoja, { raw: false });

          let contadorAgregados = 0;
          let contadorOmitidos = 0;

          for (const fila of filas) {
            /**
             * Búsqueda flexible de columnas: normaliza los encabezados del archivo
             * para soportar variantes con o sin acentos y distintos formatos.
             */
            const obtenerValor = (claves: string[]) => {
              const claveEncontrada = Object.keys(fila).find(k =>
                claves.includes(k.trim().toLowerCase()) || claves.includes(k.trim())
              );
              return claveEncontrada ? fila[claveEncontrada] : null;
            };

            const numeroTicket = obtenerValor([
              'número de ticket', 'numero de ticket', 'ticket', 'id', 'ticketnumber'
            ]);
            if (!numeroTicket) continue;

            // Mapeo de la fila del Excel al modelo interno de Ticket
            const ticketImportado: Ticket = {
              numeroTicket: String(numeroTicket).trim(),
              idUsuario: this.idUsuarioActual,
              semana: Number(obtenerValor(['semana', 'week']) || 1),
              fechaAsignacion: obtenerValor(['fecha asignación', 'fecha asignacion', 'fecha', 'assignmentdate'])
                || new Date().toISOString().split('T')[0],
              horaAsignacion: obtenerValor(['hora asignación', 'hora asignacion', 'hora', 'assignmenttime'])
                || '08:00',
              sitio: obtenerValor(['sitio/cedi', 'sitio', 'cedi', 'site']) || 'N/A',
              areaAfectada: obtenerValor(['área afectada', 'area afectada', 'área', 'area', 'affectedarea']) || 'N/A',
              descripcion: obtenerValor(['descripción', 'descripcion', 'description']) || '-',
              estado: (obtenerValor(['estado', 'status']) || 'Abierto') as EstadoTicket,
              estaAsignado: String(obtenerValor(['asignado oficialmente', 'asignado', 'isassigned']))
                .toUpperCase().includes('SI')
                || obtenerValor(['isassigned']) === true,
              esRfc: String(obtenerValor(['emergente rfc', 'rfc', 'isrfc']))
                .toUpperCase().includes('SI')
                || obtenerValor(['isrfc']) === true,
              numeroRfc: obtenerValor(['número rfc', 'numero rfc', 'rfcnumber']) || null,
              fechaCierre: obtenerValor(['fecha cierre', 'closedate']) || null,
              horaCierre: obtenerValor(['hora cierre', 'closetime']) || null,
              tiempoSolucionMins: null,
              creadoEn: Date.now(),
              actualizadoEn: Date.now()
            };

            ticketImportado.tiempoSolucionMins = this.calcularTiempoSolucion(ticketImportado);

            try {
              const ticketExistente = await this.obtenerTicketPorNumero(ticketImportado.numeroTicket);
              if (ticketExistente) {
                contadorOmitidos++;
              } else {
                await this.agregarTicket(ticketImportado);
                contadorAgregados++;
              }
            } catch (errorTicket: any) {
              throw new Error(`Error en el ticket #${ticketImportado.numeroTicket}: ${errorTicket.message}`);
            }
          }

          resolver({ agregados: contadorAgregados, omitidos: contadorOmitidos });
        } catch (error: any) {
          rechazar(error);
        }
      };

      lector.onerror = (error) => rechazar(error);
      lector.readAsArrayBuffer(archivo);
    });
  }

  // ---------------------------------------------------------------------------
  // Integridad referencial
  // ---------------------------------------------------------------------------

  /**
   * Cuenta cuántos tickets del usuario están asociados a un sitio específico.
   * Usado para validar si un sitio puede eliminarse sin dejar tickets huérfanos.
   *
   * @param nombreSitio - Nombre del sitio a consultar.
   * @returns Número de tickets que referencian ese sitio.
   */
  async contarTicketsPorSitio(nombreSitio: string): Promise<number> {
    const consulta = query(
      this.coleccionTickets,
      where('idUsuario', '==', this.idUsuarioActual),
      where('sitio', '==', nombreSitio)
    );
    const resultado = await getDocs(consulta);
    return resultado.size;
  }

  /**
   * Cuenta cuántos tickets del usuario están asociados a un área específica.
   * Usado para validar si un área puede eliminarse sin dejar tickets huérfanos.
   *
   * @param nombreArea - Nombre del área a consultar.
   * @returns Número de tickets que referencian esa área.
   */
  async contarTicketsPorArea(nombreArea: string): Promise<number> {
    const consulta = query(
      this.coleccionTickets,
      where('idUsuario', '==', this.idUsuarioActual),
      where('areaAfectada', '==', nombreArea)
    );
    const resultado = await getDocs(consulta);
    return resultado.size;
  }

  /**
   * Actualiza masivamente el nombre de sitio en todos los tickets que lo referencian.
   * Llamado al renombrar un sitio para mantener la integridad referencial.
   *
   * @param nombreAnterior - Nombre actual del sitio en los tickets.
   * @param nombreNuevo    - Nuevo nombre que reemplazará al anterior.
   */
  async actualizarNombreSitioEnMasa(nombreAnterior: string, nombreNuevo: string): Promise<void> {
    const consulta = query(
      this.coleccionTickets,
      where('idUsuario', '==', this.idUsuarioActual),
      where('sitio', '==', nombreAnterior)
    );
    const resultado = await getDocs(consulta);
    const actualizaciones = resultado.docs.map(documento =>
      updateDoc(doc(this.firestore, `tickets/${documento.id}`), {
        sitio: nombreNuevo,
        actualizadoEn: Date.now()
      })
    );
    await Promise.all(actualizaciones);
  }

  /**
   * Actualiza masivamente el nombre de área en todos los tickets que la referencian.
   * Llamado al renombrar un área para mantener la integridad referencial.
   *
   * @param nombreAnterior - Nombre actual del área en los tickets.
   * @param nombreNuevo    - Nuevo nombre que reemplazará al anterior.
   */
  async actualizarNombreAreaEnMasa(nombreAnterior: string, nombreNuevo: string): Promise<void> {
    const consulta = query(
      this.coleccionTickets,
      where('idUsuario', '==', this.idUsuarioActual),
      where('areaAfectada', '==', nombreAnterior)
    );
    const resultado = await getDocs(consulta);
    const actualizaciones = resultado.docs.map(documento =>
      updateDoc(doc(this.firestore, `tickets/${documento.id}`), {
        areaAfectada: nombreNuevo,
        actualizadoEn: Date.now()
      })
    );
    await Promise.all(actualizaciones);
  }
}