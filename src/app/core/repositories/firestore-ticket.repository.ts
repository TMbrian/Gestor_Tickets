import { Injectable } from '@angular/core';
import {
  Firestore, collection, doc, docData, addDoc, updateDoc,
  deleteDoc, query, where, getDocs, limit
} from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';
import { Ticket } from '../models/ticket.modelo';
import { ITicketRepository } from '../models/ticket.repository';
import { UtilidadesFecha } from '../utils/utilidades-fecha';

/**
 * Implementación concreta de ITicketRepository sobre Firestore.
 * Centraliza TODA la lógica de acceso a @angular/fire en un único lugar.
 * Para migrar a REST, basta crear ApiTicketRepository e intercambiar el token DI.
 */
@Injectable()
export class FirestoreTicketRepository implements ITicketRepository {

  constructor(
    private readonly firestore: Firestore
  ) {}

  private readonly coleccionNombre = 'tickets';

  private coleccion() {
    return collection(this.firestore, this.coleccionNombre);
  }

  // ---------------------------------------------------------------------------
  // Normalización de datos legacy (Fase de transición)
  // ---------------------------------------------------------------------------

  private normalizarTicket(id: string, data: any): Ticket {
    const fechaRef = data.fechaAsignacion || data.assignmentDate || new Date().toISOString().split('T')[0];
    const fechaDate = new Date(`${fechaRef}T00:00:00`);

    return {
      id,
      numeroTicket:        data.numeroTicket || data.ticketNumber || '',
      semana:              data.semana ?? data.week ?? UtilidadesFecha.calcularSemanaISO(fechaDate),
      anioISO:             data.anioISO ?? UtilidadesFecha.calcularAnioISO(fechaDate),
      fechaAsignacion:     fechaRef,
      horaAsignacion:      data.horaAsignacion || data.assignmentTime || '',
      fechaCierre:         data.fechaCierre || data.closeDate || null,
      horaCierre:          data.horaCierre || data.closeTime || null,
      semanaCierre:        data.semanaCierre ?? null,
      fechaInicioSolucion: data.fechaInicioSolucion ?? null,
      horaInicioSolucion:  data.horaInicioSolucion ?? null,
      semanaInicioSolucion: data.semanaInicioSolucion ?? null,
      tiempoSolucionMins:  data.tiempoSolucionMins ?? data.solutionTimeMins ?? null,
      tiempoPausaMins:     data.tiempoPausaMins ?? 0,
      ultimaPausaInicio:   data.ultimaPausaInicio || null,
      estaAsignado:        data.estaAsignado ?? data.isAssigned ?? false,
      esRfc:               data.esRfc ?? data.isRfc ?? false,
      numeroRfc:           data.numeroRfc || data.rfcNumber || null,
      sitio:               data.sitio || data.site || '',
      areaAfectada:        data.areaAfectada || data.affectedArea || '',
      descripcion:         data.descripcion || data.description || '',
      estado:              data.estado || data.status || 'Abierto',
      idUsuario:           data.idUsuario || '',
      creadoEn:            data.creadoEn ?? data.createdAt ?? Date.now(),
      actualizadoEn:       data.actualizadoEn ?? data.updatedAt ?? Date.now(),
    };
  }

  private limpiarUndefined(obj: any): any {
    return JSON.parse(JSON.stringify(obj, (_, v) => v === undefined ? null : v));
  }

  // ---------------------------------------------------------------------------
  // Operaciones CRUD
  // ---------------------------------------------------------------------------

  async obtenerTickets(idUsuario: string): Promise<Ticket[]> {
    if (!idUsuario) return [];
    const consulta = query(this.coleccion(), where('idUsuario', '==', idUsuario));
    const resultado = await getDocs(consulta);
    return resultado.docs.map(d => this.normalizarTicket(d.id, d.data()));
  }

  async obtenerTicket(id: string): Promise<Ticket | undefined> {
    const referenciaDoc = doc(this.firestore, `${this.coleccionNombre}/${id}`);
    const datos = await firstValueFrom(docData(referenciaDoc, { idField: 'id' }));
    return datos as Ticket;
  }

  async obtenerTicketPorNumero(idUsuario: string, numeroTicket: string): Promise<Ticket | undefined> {
    if (!idUsuario) return undefined;
    const consulta = query(
      this.coleccion(),
      where('idUsuario', '==', idUsuario),
      where('numeroTicket', '==', numeroTicket),
      limit(1)
    );
    const resultado = await getDocs(consulta);
    if (resultado.empty) return undefined;
    const d = resultado.docs[0];
    return this.normalizarTicket(d.id, d.data());
  }

  async agregarTicket(ticket: Ticket): Promise<Ticket> {
    const datos = this.limpiarUndefined(ticket);
    const ref = await addDoc(this.coleccion(), datos);
    return { ...ticket, id: ref.id };
  }

  async actualizarTicket(id: string, cambios: Partial<Ticket>): Promise<void> {
    const referenciaDoc = doc(this.firestore, `${this.coleccionNombre}/${id}`);
    const datos = this.limpiarUndefined(cambios);
    return updateDoc(referenciaDoc, datos);
  }

  async eliminarTicket(id: string): Promise<void> {
    const referenciaDoc = doc(this.firestore, `${this.coleccionNombre}/${id}`);
    return deleteDoc(referenciaDoc);
  }

  // ---------------------------------------------------------------------------
  // Integridad referencial
  // ---------------------------------------------------------------------------

  async contarTicketsPorSitio(idUsuario: string, nombreSitio: string): Promise<number> {
    const consulta = query(
      this.coleccion(),
      where('idUsuario', '==', idUsuario),
      where('sitio', '==', nombreSitio)
    );
    return (await getDocs(consulta)).size;
  }

  async contarTicketsPorArea(idUsuario: string, nombreArea: string): Promise<number> {
    const consulta = query(
      this.coleccion(),
      where('idUsuario', '==', idUsuario),
      where('areaAfectada', '==', nombreArea)
    );
    return (await getDocs(consulta)).size;
  }

  async actualizarNombreSitioEnMasa(idUsuario: string, nombreAnterior: string, nombreNuevo: string): Promise<void> {
    const consulta = query(
      this.coleccion(),
      where('idUsuario', '==', idUsuario),
      where('sitio', '==', nombreAnterior)
    );
    const resultado = await getDocs(consulta);
    await Promise.all(resultado.docs.map(d =>
      updateDoc(doc(this.firestore, `${this.coleccionNombre}/${d.id}`), { sitio: nombreNuevo, actualizadoEn: Date.now() })
    ));
  }

  async actualizarNombreAreaEnMasa(idUsuario: string, nombreAnterior: string, nombreNuevo: string): Promise<void> {
    const consulta = query(
      this.coleccion(),
      where('idUsuario', '==', idUsuario),
      where('areaAfectada', '==', nombreAnterior)
    );
    const resultado = await getDocs(consulta);
    await Promise.all(resultado.docs.map(d =>
      updateDoc(doc(this.firestore, `${this.coleccionNombre}/${d.id}`), { areaAfectada: nombreNuevo, actualizadoEn: Date.now() })
    ));
  }
}
