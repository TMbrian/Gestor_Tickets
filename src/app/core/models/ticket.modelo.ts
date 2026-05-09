export type TicketStatus = 'Abierto' | 'En Progreso' | 'Cerrado';

export interface Ticket {
  id?: string;
  ticketNumber: string;
  week: number;
  assignmentDate: string; // YYYY-MM-DD
  assignmentTime: string; // HH:mm
  closeDate: string | null; // YYYY-MM-DD
  closeTime: string | null; // HH:mm
  solutionTimeMins: number | null; // Calculated automatically
  isAssigned: boolean;
  isRfc: boolean;
  rfcNumber: string | null;
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

export interface Site {
  id?: string;
  name: string;
  userId: string;
  createdAt: number;
}

export interface Area {
  id?: string;
  name: string;
  userId: string;
  createdAt: number;
}
