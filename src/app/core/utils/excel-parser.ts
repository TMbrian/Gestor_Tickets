import { Ticket } from '../models/ticket.modelo';
import { UtilidadesFecha } from './utilidades-fecha';
import * as XLSX from 'xlsx';

/**
 * Entidad encargada de procesar el contenido binario/Buffer de un archivo Excel,
 * mapearlo contra las cabeceras flexibles del sistema y emitir una lista de objetos Ticket.
 * 
 * Este enfoque lo aísla del DOM (FileReader) permitiendo testearlo nativamente en NodeJS.
 */
export class ExcelParser {
  
  /**
   * Procesa un buffer binario importado de Excel y retorna la matriz de tickets normalizada.
   *
   * @param buffer           - Equivalente a la matriz leída de un `ArrayBuffer` o NodeJS `Buffer`.
   * @param idUsuarioActual  - ID del usuario que solicita la importación (dueño de los tickets).
   * @returns Un array de objetos `Ticket` completamente mapeados al modelo del sistema.
   */
  static parsearBufferTickets(buffer: ArrayBuffer | Uint8Array, idUsuarioActual: string): Ticket[] {
    const libroDeTrabajo = XLSX.read(buffer, {
      type: 'array',
      cellDates: true,
      dateNF: 'yyyy-mm-dd'
    });

    const nombrePrimeraHoja = libroDeTrabajo.SheetNames[0];
    const primeraHoja = libroDeTrabajo.Sheets[nombrePrimeraHoja];
    const filas: any[] = XLSX.utils.sheet_to_json(primeraHoja, { raw: false });

    return filas.map(fila => this.mapearFilaATicket(fila, idUsuarioActual)).filter(t => t !== null) as Ticket[];
  }

  private static mapearFilaATicket(fila: any, idUsuarioActual: string): Ticket | null {
    const obtenerValor = (claves: string[]) => {
      const claveEncontrada = Object.keys(fila).find(k =>
        claves.includes(k.trim().toLowerCase()) || claves.includes(k.trim())
      );
      return claveEncontrada ? fila[claveEncontrada] : null;
    };

    const numeroTicket = obtenerValor(['número de ticket', 'numero de ticket', 'ticket', 'id', 'ticketnumber']);
    if (!numeroTicket) return null;

    const asignacionStr = obtenerValor(['fecha asignación', 'fecha asignacion', 'fecha', 'assignmentdate']) || new Date().toISOString().split('T')[0];
    const asignacionDate = new Date(`${asignacionStr}T00:00:00`);

    const inicioSolucionStr = obtenerValor(['fecha inicio solución', 'fecha inicio solucion', 'startsolutiondate']) || null;
    const cierreStr = obtenerValor(['fecha cierre', 'closedate']) || null;

    return {
      numeroTicket: String(numeroTicket).trim(),
      idUsuario: idUsuarioActual,
      fechaAsignacion: asignacionStr,
      semana: Number(obtenerValor(['semana', 'week'])) || UtilidadesFecha.calcularSemanaISO(asignacionDate),
      anioISO: Number(obtenerValor(['año iso', 'ano iso', 'isoyear'])) || UtilidadesFecha.calcularAnioISO(asignacionDate),
      horaAsignacion: obtenerValor(['hora asignación', 'hora asignacion', 'hora', 'assignmenttime']) || '08:00',
      sitio: obtenerValor(['sitio/cedi', 'sitio', 'cedi', 'site']) || 'N/A',
      areaAfectada: obtenerValor(['área afectada', 'area afectada', 'área', 'area', 'affectedarea']) || 'N/A',
      descripcion: obtenerValor(['descripción', 'descripcion', 'description']) || '-',
      estado: (obtenerValor(['estado', 'status']) || 'Abierto') as any,
      estaAsignado: String(obtenerValor(['asignado oficialmente', 'asignado', 'isassigned'])).toUpperCase().includes('SI') || obtenerValor(['isassigned']) === true,
      esRfc: String(obtenerValor(['emergente rfc', 'rfc', 'isrfc'])).toUpperCase().includes('SI') || obtenerValor(['isrfc']) === true,
      numeroRfc: obtenerValor(['número rfc', 'numero rfc', 'rfcnumber']) || null,
      fechaInicioSolucion: inicioSolucionStr,
      horaInicioSolucion: obtenerValor(['hora inicio solución', 'hora inicio solucion', 'starttime']) || null,
      semanaInicioSolucion: inicioSolucionStr
        ? (Number(obtenerValor(['semana inicio solución', 'semana inicio solucion']))
          || UtilidadesFecha.calcularSemanaISO(new Date(`${inicioSolucionStr}T00:00:00`)))
        : null,
      fechaCierre: cierreStr,
      horaCierre: obtenerValor(['hora cierre', 'closetime']) || null,
      semanaCierre: cierreStr
        ? (Number(obtenerValor(['semana cierre']))
          || UtilidadesFecha.calcularSemanaISO(new Date(`${cierreStr}T00:00:00`)))
        : null,
      tiempoSolucionMins: null, // Será recalculado en el Servicio/Repositorio
      creadoEn: Date.now(),
      actualizadoEn: Date.now()
    };
  }
}
