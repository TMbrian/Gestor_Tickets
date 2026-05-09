import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Ticket } from '../models/ticket.modelo';

@Injectable({
  providedIn: 'root'
})
export class DbService extends Dexie {
  tickets!: Table<Ticket, number>;
  users!: Table<any, string>;

  constructor() {
    super('TicketManagerDB');
    this.version(3).stores({
      tickets: '++id, ticketNumber, week, status, site, affectedArea, isAssigned, isRfc, assignmentDate, userId',
      users: 'id, &username, password, name, role'
    });
  }
}
