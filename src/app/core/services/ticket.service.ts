import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, limit } from '@angular/fire/firestore';
import { Ticket, TicketStatistics, TicketStatus } from '../models/ticket.model';
import { AuthService } from './auth.service';
import { Observable, firstValueFrom, map } from 'rxjs';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  constructor(private firestore: Firestore, private auth: AuthService) { }

  private get userId(): string {
    return this.auth.currentUser?.id || '';
  }

  private get ticketsCollection() {
    return collection(this.firestore, 'tickets');
  }

  async getTickets(): Promise<Ticket[]> {
    if (!this.userId) return [];
    const q = query(this.ticketsCollection, where('userId', '==', this.userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
  }

  async getTicket(id: string): Promise<Ticket | undefined> {
    const docRef = doc(this.firestore, `tickets/${id}`);
    const docSnap = await firstValueFrom(docData(docRef, { idField: 'id' }));
    return docSnap as Ticket;
  }

  async addTicket(ticket: Ticket): Promise<string> {
    ticket.userId = this.userId;
    ticket.solutionTimeMins = this.calculateSolutionTime(ticket);
    ticket.createdAt = Date.now();
    ticket.updatedAt = Date.now();
    const docRef = await addDoc(this.ticketsCollection, ticket);
    return docRef.id;
  }

  async updateTicket(id: string, changes: Partial<Ticket>): Promise<void> {
    changes.updatedAt = Date.now();
    if (changes.assignmentDate !== undefined || changes.assignmentTime !== undefined || changes.closeDate !== undefined || changes.closeTime !== undefined) {
      const ticket = await this.getTicket(id);
      if (ticket) {
        const merged = { ...ticket, ...changes } as Ticket;
        changes.solutionTimeMins = this.calculateSolutionTime(merged);
      }
    }
    const docRef = doc(this.firestore, `tickets/${id}`);
    return updateDoc(docRef, changes as any);
  }

  async deleteTicket(id: string): Promise<void> {
    const docRef = doc(this.firestore, `tickets/${id}`);
    return deleteDoc(docRef);
  }

  calculateSolutionTime(ticket: Ticket): number | undefined {
    if (!ticket.closeDate || !ticket.closeTime || !ticket.assignmentDate || !ticket.assignmentTime) {
      return undefined;
    }
    const startStr = `${ticket.assignmentDate}T${ticket.assignmentTime}`;
    const endStr = `${ticket.closeDate}T${ticket.closeTime}`;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  async getStatistics(week?: number, year?: number): Promise<TicketStatistics> {
    const all = await this.getTickets();
    let filtered = all;

    if (week !== undefined && year !== undefined) {
      filtered = all.filter(t => {
        if (!t.assignmentDate) return false;
        const d = new Date(t.assignmentDate);
        if (isNaN(d.getTime())) return false;
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        const isoWeek = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        const isoYear = date.getFullYear();
        return isoWeek === week && isoYear === year;
      });
    }

    const stats: TicketStatistics = {
      total: filtered.length,
      byStatus: { 'Abierto': 0, 'En Progreso': 0, 'Cerrado': 0 },
      averageSolutionTimeMins: 0
    };

    let totalSolutionMins = 0;
    let closedCountWithTime = 0;

    filtered.forEach(t => {
      if (stats.byStatus[t.status] !== undefined) {
        stats.byStatus[t.status]! += 1;
      } else {
        stats.byStatus[t.status] = 1;
      }
      if (t.status === 'Cerrado' && t.solutionTimeMins !== undefined) {
        totalSolutionMins += t.solutionTimeMins;
        closedCountWithTime++;
      }
    });

    if (closedCountWithTime > 0) {
      stats.averageSolutionTimeMins = Math.round(totalSolutionMins / closedCountWithTime);
    }
    return stats;
  }

  async exportToExcel(): Promise<void> {
    const tickets = await this.getTickets();
    const mapped = tickets.map(t => ({
      'Número de Ticket': t.ticketNumber,
      'Semana': t.week,
      'Fecha Asignación': t.assignmentDate,
      'Hora Asignación': t.assignmentTime,
      'Sitio/CEDI': t.site,
      'Área Afectada': t.affectedArea,
      'Descripción': t.description,
      'Estado': t.status,
      'Asignado Oficialmente': t.isAssigned ? 'SI' : 'NO',
      'Emergente RFC': t.isRfc ? 'SI' : 'NO',
      'Número RFC': t.rfcNumber || '',
      'Fecha Cierre': t.closeDate || '',
      'Hora Cierre': t.closeTime || '',
      'Solución Mins (Calc)': t.solutionTimeMins || 0
    }));
    const worksheet = XLSX.utils.json_to_sheet(mapped);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Histórico');
    XLSX.writeFile(workbook, 'Historico_Tickets.xlsx');
  }

  async downloadTemplate(): Promise<void> {
    const templateData = [{
      'Número de Ticket': '12345',
      'Semana': 1,
      'Fecha Asignación': '2026-01-01',
      'Hora Asignación': '08:00',
      'Sitio/CEDI': 'CEDI Central',
      'Área Afectada': 'Sistemas',
      'Descripción': 'Descripción del problema aquí',
      'Estado': 'Abierto',
      'Asignado Oficialmente': 'SI',
      'Emergente RFC': 'NO',
      'Número RFC': '',
      'Fecha Cierre': '',
      'Hora Cierre': ''
    }];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Importacion');
    XLSX.writeFile(workbook, 'Plantilla_Tickets.xlsx');
  }

  async importFromExcel(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array((e.target as any).result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);

          let addedCount = 0;
          for (const row of jsonData) {
            const ticketNumber = row['Número de Ticket'] || row['NÚMERO DE TICKET'] || row['ticketNumber'];
            if (!ticketNumber) continue;

            const t: Ticket = {
              ticketNumber: String(ticketNumber).trim(),
              userId: this.userId,
              week: Number(row['Semana'] || row['SEMANA'] || row['week'] || 1),
              assignmentDate: row['Fecha Asignación'] || row['assignmentDate'] || new Date().toISOString().split('T')[0],
              assignmentTime: row['Hora Asignación'] || row['assignmentTime'] || '12:00',
              site: row['Sitio/CEDI'] || row['SITIO'] || row['site'] || 'N/A',
              affectedArea: row['Área Afectada'] || row['ÁREA AFECTADA'] || row['affectedArea'] || 'N/A',
              description: row['Descripción'] || row['DESCRIPCIÓN'] || row['description'] || '-',
              status: (row['Estado'] || row['ESTADO'] || row['status'] || 'Abierto') as TicketStatus,
              isAssigned: String(row['Asignado Oficialmente']).toUpperCase() === 'SI' || row['isAssigned'] === true,
              isRfc: String(row['Emergente RFC']).toUpperCase() === 'SI' || row['isRfc'] === true,
              rfcNumber: row['Número RFC'] || row['rfcNumber'],
              closeDate: row['Fecha Cierre'] || row['closeDate'],
              closeTime: row['Hora Cierre'] || row['closeTime'],
              createdAt: Date.now(),
              updatedAt: Date.now()
            };
            t.solutionTimeMins = this.calculateSolutionTime(t);
            await this.addTicket(t);
            addedCount++;
          }
          resolve(addedCount);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }
}
