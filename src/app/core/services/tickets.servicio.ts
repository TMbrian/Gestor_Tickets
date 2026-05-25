import { Injectable, Inject } from '@angular/core';
import * as XLSX from 'xlsx';
import { Ticket, EstadisticasTicket, EstadoTicket } from '../models/ticket.modelo';
import { TICKET_REPOSITORY_TOKEN } from '../models/repositorios.tokens';
import { ServicioAutenticacion } from './autenticacion.service';
import { UtilidadesFecha } from '../utils/utilidades-fecha';
import { ExcelParser } from '../utils/excel-parser';
import { FirestoreTicketRepository } from '../repositories/firestore-ticket.repository';

/**
 * Servicio de dominio para la gestión de tickets de soporte técnico.
 *
 * RESPONSABILIDAD: Únicamente lógica de negocio — cálculo de tiempos, métricas,
 * orquestación de importación/exportación y gestión de estados.
 *
 * NO tiene dependencias directas de Firestore ni de ningún almacenamiento concreto.
 * Toda persistencia se delega al repositorio inyectado via TICKET_REPOSITORY_TOKEN.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioTickets {

  constructor(
    @Inject(TICKET_REPOSITORY_TOKEN) private readonly repo: FirestoreTicketRepository,
    private readonly servicioAutenticacion: ServicioAutenticacion
  ) {}

  // ---------------------------------------------------------------------------
  // Utilidades internas
  // ---------------------------------------------------------------------------

  private get idUsuarioActual(): string {
    return this.servicioAutenticacion.usuarioActual?.id || '';
  }

  // ---------------------------------------------------------------------------
  // CRUD — Delega al repositorio
  // ---------------------------------------------------------------------------

  async obtenerTickets(): Promise<Ticket[]> {
    return this.repo.obtenerTickets(this.idUsuarioActual);
  }

  async obtenerTicket(id: string): Promise<Ticket | undefined> {
    return this.repo.obtenerTicket(id);
  }

  async obtenerTicketPorNumero(numeroTicket: string): Promise<Ticket | undefined> {
    return this.repo.obtenerTicketPorNumero(this.idUsuarioActual, numeroTicket);
  }

  /**
   * Enriquece el ticket con metadatos calculados (usuario, tiempos ISO, timestamps)
   * y luego lo persiste vía repositorio.
   */
  async agregarTicket(ticket: Ticket): Promise<string> {
    ticket.idUsuario       = this.idUsuarioActual;
    ticket.tiempoSolucionMins = this.calcularTiempoSolucion(ticket);
    const fechaDate        = new Date(`${ticket.fechaAsignacion}T00:00:00`);
    ticket.anioISO         = ticket.anioISO || UtilidadesFecha.calcularAnioISO(fechaDate);
    ticket.semana          = ticket.semana  || UtilidadesFecha.calcularSemanaISO(fechaDate);
    ticket.creadoEn        = Date.now();
    ticket.actualizadoEn   = Date.now();
    return this.repo.agregarTicket(ticket);
  }

  /**
   * Aplica reglas de pausa, recalcula el tiempo de solución y persiste los cambios.
   */
  async actualizarTicket(id: string, cambios: Partial<Ticket>): Promise<void> {
    cambios.actualizadoEn = Date.now();

    const necesitaTicketActual = cambios.estado !== undefined
      || cambios.fechaAsignacion !== undefined
      || cambios.horaAsignacion !== undefined
      || cambios.fechaInicioSolucion !== undefined
      || cambios.horaInicioSolucion !== undefined
      || cambios.fechaCierre !== undefined
      || cambios.horaCierre !== undefined;

    if (necesitaTicketActual) {
      const ticketActual = await this.obtenerTicket(id);
      if (ticketActual) {
        // Regla de pausa (ADR-0001)
        if (cambios.estado !== undefined && cambios.estado !== ticketActual.estado) {
          if (cambios.estado === 'Pausado') {
            cambios.ultimaPausaInicio = Date.now();
          } else if (ticketActual.estado === 'Pausado' && ticketActual.ultimaPausaInicio) {
            const diffMins = Math.round((Date.now() - ticketActual.ultimaPausaInicio) / 60000);
            cambios.tiempoPausaMins  = (ticketActual.tiempoPausaMins || 0) + diffMins;
            cambios.ultimaPausaInicio = null;
          }
        }
        const ticketMergeado = { ...ticketActual, ...cambios } as Ticket;
        cambios.tiempoSolucionMins = this.calcularTiempoSolucion(ticketMergeado);
      }
    }

    return this.repo.actualizarTicket(id, cambios);
  }

  async eliminarTicket(id: string): Promise<void> {
    return this.repo.eliminarTicket(id);
  }

  // ---------------------------------------------------------------------------
  // Integridad referencial — Delega al repositorio
  // ---------------------------------------------------------------------------

  async contarTicketsPorSitio(nombreSitio: string): Promise<number> {
    return this.repo.contarTicketsPorSitio(this.idUsuarioActual, nombreSitio);
  }

  async contarTicketsPorArea(nombreArea: string): Promise<number> {
    return this.repo.contarTicketsPorArea(this.idUsuarioActual, nombreArea);
  }

  async actualizarNombreSitioEnMasa(nombreAnterior: string, nombreNuevo: string): Promise<void> {
    return this.repo.actualizarNombreSitioEnMasa(this.idUsuarioActual, nombreAnterior, nombreNuevo);
  }

  async actualizarNombreAreaEnMasa(nombreAnterior: string, nombreNuevo: string): Promise<void> {
    return this.repo.actualizarNombreAreaEnMasa(this.idUsuarioActual, nombreAnterior, nombreNuevo);
  }

  // ---------------------------------------------------------------------------
  // Lógica de Negocio — Pura, sin dependencias de almacenamiento
  // ---------------------------------------------------------------------------

  /** Calcula el tiempo de solución neto descontando pausas (ADR-0001). */
  calcularTiempoSolucion(ticket: Ticket): number | null {
    if (!ticket.fechaCierre || !ticket.horaCierre) return null;

    const fechaInicio = ticket.fechaInicioSolucion || ticket.fechaAsignacion;
    const horaInicio  = ticket.horaInicioSolucion  || ticket.horaAsignacion;
    if (!fechaInicio || !horaInicio) return null;

    const inicio = new Date(`${fechaInicio}T${horaInicio}`);
    const fin    = new Date(`${ticket.fechaCierre}T${ticket.horaCierre}`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null;

    const diferenciaTotalMins = Math.round((fin.getTime() - inicio.getTime()) / 60000);
    return Math.max(0, diferenciaTotalMins - (ticket.tiempoPausaMins || 0));
  }

  /** Calcula estadísticas agregadas. Filtra por semana y año ISO si se proporcionan. */
  async obtenerEstadisticas(semana?: number, anio?: number): Promise<EstadisticasTicket> {
    const todos = await this.obtenerTickets();
    let filtrados = todos;

    if (semana !== undefined && anio !== undefined) {
      filtrados = todos.filter(ticket => {
        if (!ticket.fechaAsignacion) return false;
        const fecha = new Date(ticket.fechaAsignacion);
        if (Number.isNaN(fecha.getTime())) return false;
        return UtilidadesFecha.calcularSemanaISO(fecha) === semana
            && UtilidadesFecha.calcularAnioISO(fecha)   === anio;
      });
    }

    const estadisticas: EstadisticasTicket = {
      total: filtrados.length,
      porEstado: { 'Abierto': 0, 'En Progreso': 0, 'Pausado': 0, 'Cerrado': 0 },
      promedioTiempoSolucionMins: 0
    };

    let totalMins = 0;
    let contadorCerrados = 0;

    filtrados.forEach(ticket => {
      estadisticas.porEstado[ticket.estado] = (estadisticas.porEstado[ticket.estado] ?? 0) + 1;
      if (ticket.estado === 'Cerrado' && ticket.tiempoSolucionMins != null) {
        totalMins += ticket.tiempoSolucionMins;
        contadorCerrados++;
      }
    });

    if (contadorCerrados > 0) {
      estadisticas.promedioTiempoSolucionMins = Math.round(totalMins / contadorCerrados);
    }

    return estadisticas;
  }

  // ---------------------------------------------------------------------------
  // Exportación e Importación
  // ---------------------------------------------------------------------------

  async exportarAExcel(filtroSemana?: number): Promise<void> {
    let tickets = await this.obtenerTickets();
    if (filtroSemana !== undefined) {
      tickets = tickets.filter(t => t.semana === filtroSemana);
    }

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
    hojaDatos['!cols'] = [
      { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
      { wch: 20 }, { wch: 22 }, { wch: 40 }, { wch: 14 },
      { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 14 }
    ];

    const libroDeTrabajo = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libroDeTrabajo, hojaDatos, 'Histórico');
    XLSX.writeFile(libroDeTrabajo, `Tickets_${filtroSemana ? `Semana_${filtroSemana}` : 'Historial_Completo'}.xlsx`);
  }

  async descargarPlantilla(): Promise<void> {
    const datosEjemplo = [
      { 'Número de Ticket': '12345', 'Semana': 19, 'Fecha Asignación': '2026-05-05', 'Hora Asignación': '08:00', 'Sitio/CEDI': 'CEDI Monterrey', 'Área Afectada': 'Redes / Conectividad', 'Descripción': 'Sin conexión a la red en el edificio A, planta baja', 'Estado': 'Abierto', 'Asignado Oficialmente': 'SI', 'Emergente RFC': 'NO', 'Número RFC': '', 'Fecha Cierre': '', 'Hora Cierre': '' },
      { 'Número de Ticket': '12346', 'Semana': 19, 'Fecha Asignación': '2026-05-05', 'Hora Asignación': '09:30', 'Sitio/CEDI': 'CEDI CDMX', 'Área Afectada': 'Hardware', 'Descripción': 'Pantalla del monitor con líneas verticales en estación de trabajo #15', 'Estado': 'Cerrado', 'Asignado Oficialmente': 'SI', 'Emergente RFC': 'NO', 'Número RFC': '', 'Fecha Cierre': '2026-05-06', 'Hora Cierre': '14:00' },
      { 'Número de Ticket': '12347', 'Semana': 19, 'Fecha Asignación': '2026-05-06', 'Hora Asignación': '11:15', 'Sitio/CEDI': 'CEDI Guadalajara', 'Área Afectada': 'Software / Aplicaciones', 'Descripción': 'Error al ejecutar el módulo de facturación electrónica', 'Estado': 'En Progreso', 'Asignado Oficialmente': 'NO', 'Emergente RFC': 'SI', 'Número RFC': 'RFC-EMR-0045', 'Fecha Cierre': '', 'Hora Cierre': '' }
    ];

    const hojaPlantilla: XLSX.WorkSheet = XLSX.utils.json_to_sheet(datosEjemplo);
    hojaPlantilla['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 24 }, { wch: 45 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];

    const instrucciones = [
      ['📋 INSTRUCCIONES DE USO - Plantilla de Importación de Tickets'], [''],
      ['1. Usa la hoja "Plantilla_Importacion" para llenar tus datos.'],
      ['2. NO modifiques los nombres de las columnas (encabezados).'],
      ['3. Elimina las filas de ejemplo antes de importar.'], [''],
      ['📌 CAMPOS OBLIGATORIOS:'], ['   • Número de Ticket (solo números)'], ['   • Semana (1-53)'],
      ['   • Fecha Asignación (formato: YYYY-MM-DD)'], ['   • Hora Asignación (formato: HH:MM)'],
      ['   • Sitio/CEDI'], ['   • Área Afectada'], ['   • Descripción'],
      ['   • Estado (Abierto, En Progreso, Cerrado)'], [''],
      ['📌 CAMPOS OPCIONALES:'], ['   • Asignado Oficialmente (SI / NO)'], ['   • Emergente RFC (SI / NO)'],
      ['   • Número RFC (texto libre)'], ['   • Fecha Cierre (formato: YYYY-MM-DD)'],
      ['   • Hora Cierre (formato: HH:MM)'], [''],
      ['⚠️ NOTAS IMPORTANTES:'],
      ['   • Los tickets con número duplicado serán OMITIDOS automáticamente.'],
      ['   • El tiempo de solución se calcula automáticamente si hay fecha/hora de cierre.'],
      ['   • Si un Sitio o Área no existe en los catálogos, se creará automáticamente.']
    ];

    const hojaInstrucciones: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(instrucciones);
    hojaInstrucciones['!cols'] = [{ wch: 75 }];

    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hojaInstrucciones, 'Instrucciones');
    XLSX.utils.book_append_sheet(libro, hojaPlantilla, 'Plantilla_Importacion');
    XLSX.writeFile(libro, 'Plantilla_Tickets.xlsx');
  }

  async importarDesdeExcel(archivo: File): Promise<{ agregados: number; omitidos: number }> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();

      lector.onload = async (evento) => {
        try {
          const bytesArchivo = new Uint8Array((evento.target as any).result);
          const ticketsParseados = ExcelParser.parsearBufferTickets(bytesArchivo, this.idUsuarioActual);

          let contadorAgregados = 0;
          let contadorOmitidos  = 0;

          for (const ticketImportado of ticketsParseados) {
            ticketImportado.tiempoSolucionMins = this.calcularTiempoSolucion(ticketImportado);
            try {
              const existe = await this.obtenerTicketPorNumero(ticketImportado.numeroTicket);
              if (existe) {
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
}