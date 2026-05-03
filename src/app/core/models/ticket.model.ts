export type TicketStatus = 'Abierto' | 'En Progreso' | 'Cerrado';

export interface Ticket {
  id?: number;
  ticketNumber: string;
  week: number;
  assignmentDate: string; // YYYY-MM-DD
  assignmentTime: string; // HH:mm
  closeDate?: string; // YYYY-MM-DD
  closeTime?: string; // HH:mm
  solutionTimeMins?: number; // Calculated automatically
  isAssigned: boolean;
  isRfc: boolean;
  rfcNumber?: string;
  site: string;
  affectedArea: string;
  description: string;
  status: TicketStatus;
  userId: string;
  createdAt: number;
  updatedAt: number;
}

export interface TicketStatistics {
  total: number;
  byStatus: { [key in TicketStatus]?: number };
  averageSolutionTimeMins: number;
}
