import { Injectable } from '@angular/core';
import { DbService } from './db.service';
import { Ticket, TicketStatistics, TicketStatus } from '../models/ticket.model';
import { AuthService } from './auth.service';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  constructor(private db: DbService, private auth: AuthService) { }

  private get userId(): string {
    return this.auth.currentUser?.id || '';
  }

  getTickets(): Promise<Ticket[]> {
    return this.db.tickets.where('userId').equals(this.userId).toArray();
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    return this.db.tickets.get(id);
  }

  async addTicket(ticket: Ticket): Promise<number> {
    ticket.userId = this.userId;
    ticket.solutionTimeMins = this.calculateSolutionTime(ticket);
    ticket.createdAt = Date.now();
    ticket.updatedAt = Date.now();
    return this.db.tickets.add(ticket);
  }

  async updateTicket(id: number, changes: Partial<Ticket>): Promise<number> {
    changes.updatedAt = Date.now();
    if (changes.assignmentDate !== undefined || changes.assignmentTime !== undefined || changes.closeDate !== undefined || changes.closeTime !== undefined) {
      const ticket = await this.db.tickets.get(id);
      if (ticket) {
        const merged = { ...ticket, ...changes } as Ticket;
        changes.solutionTimeMins = this.calculateSolutionTime(merged);
      }
    }
    return this.db.tickets.update(id, changes);
  }

  async deleteTicket(id: number): Promise<void> {
    return this.db.tickets.delete(id);
  }

  calculateSolutionTime(ticket: Ticket): number | undefined {
    if (!ticket.closeDate || !ticket.closeTime) {
      return undefined;
    }
    const startStr = `${ticket.assignmentDate}T${ticket.assignmentTime}`;
    const endStr = `${ticket.closeDate}T${ticket.closeTime}`;
    
    const start = new Date(startStr);
    const end = new Date(endStr);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return undefined;
    }
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  async getStatistics(): Promise<TicketStatistics> {
    const all = await this.getTickets();
    const stats: TicketStatistics = {
      total: all.length,
      byStatus: { 'Abierto': 0, 'En Progreso': 0, 'Cerrado': 0 },
      averageSolutionTimeMins: 0
    };

    let totalSolutionMins = 0;
    let closedCountWithTime = 0;

    all.forEach(t => {
      if (stats.byStatus[t.status] !== undefined) {
        stats.byStatus[t.status]! += 1;
      } else {
        stats.byStatus[t.status] = 1;
      }

      if (t.solutionTimeMins !== undefined) {
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

            const existingArr = await this.db.tickets
              .where({ ticketNumber: String(ticketNumber).trim(), userId: this.userId })
              .toArray();
            if (existingArr.length > 0) continue;

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
            await this.db.tickets.add(t);
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
