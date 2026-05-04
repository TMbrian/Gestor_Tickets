import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TicketService } from '../../core/services/ticket.service';
import { ExportService } from '../../core/services/export.service';
import { Ticket } from '../../core/models/ticket.model';
import { AuthService } from '../../core/services/auth.service';

declare var bootstrap: any;

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './ticket-list.component.html',
  styleUrls: ['./ticket-list.component.scss']
})
export class TicketListComponent implements OnInit {
  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  
  searchText = '';
  statusFilter = '';

  ticketForm!: FormGroup;
  isEditing = false;
  currentEditId?: string;

  selectedWeek: number = 1;
  currentWeek: number = 1;

  @ViewChild('ticketModal') ticketModalRef!: ElementRef;
  modalInstance: any;

  constructor(
    private ticketService: TicketService,
    private exportService: ExportService,
    private fb: FormBuilder,
    public auth: AuthService
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.currentWeek = this.calculateISOWeek(new Date());
    this.selectedWeek = this.currentWeek;
    this.loadTickets();
  }

  calculateISOWeek(d: Date): number {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  previousWeek() {
    if (this.selectedWeek > 1) {
      this.selectedWeek--;
      this.applyFilters();
    }
  }

  nextWeek() {
    if (this.selectedWeek < 53) {
      this.selectedWeek++;
      this.applyFilters();
    }
  }

  goToCurrentWeek() {
    this.selectedWeek = this.currentWeek;
    this.applyFilters();
  }

  initForm() {
    this.ticketForm = this.fb.group({
      ticketNumber: ['', [Validators.required, Validators.pattern('^[0-9]+$')]],
      week: [1, [Validators.required, Validators.min(1), Validators.max(53)]],
      assignmentDate: ['', Validators.required],
      assignmentTime: ['', Validators.required],
      closeDate: [''],
      closeTime: [''],
      isAssigned: [false],
      isRfc: [false],
      rfcNumber: [''],
      site: ['', Validators.required],
      affectedArea: ['', Validators.required],
      description: ['', Validators.required],
      status: ['Abierto', Validators.required]
    });

    this.ticketForm.get('assignmentDate')?.valueChanges.subscribe(val => {
      if (val) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const week = this.calculateISOWeek(d);
          this.ticketForm.patchValue({ week }, { emitEvent: false });
        }
      }
    });
  }

  async loadTickets() {
    this.tickets = await this.ticketService.getTickets();
    this.applyFilters();
  }

  applyFilters() {
    this.filteredTickets = this.tickets.filter(t => {
      const matchSearch = Object.values(t as any).some((val: any) => 
        val !== undefined && val !== null && String(val).toLowerCase().includes(this.searchText.toLowerCase())
      );
      const matchStatus = this.statusFilter ? t.status === this.statusFilter : true;
      const matchWeek = t.week === this.selectedWeek;
      return matchSearch && matchStatus && matchWeek;
    });
  }

  openModal(ticket?: Ticket) {
    if (!this.modalInstance) {
       this.modalInstance = new bootstrap.Modal(this.ticketModalRef.nativeElement);
    }
    if (ticket) {
      this.isEditing = true;
      this.currentEditId = ticket.id;
      this.ticketForm.patchValue(ticket);
    } else {
      this.isEditing = false;
      this.currentEditId = undefined;
      const todayDate = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('en-GB', { hour: "2-digit", minute: "2-digit" });
      this.ticketForm.reset({ 
        status: 'Abierto', 
        isAssigned: false, 
        isRfc: false,
        assignmentDate: todayDate,
        assignmentTime: timeStr
      });
    }
    this.modalInstance.show();
  }

  closeModal() {
    this.modalInstance?.hide();
  }

  async saveTicket() {
    if (this.ticketForm.invalid) return;
    const formValue = this.ticketForm.value;

    if (this.isEditing && this.currentEditId) {
      await this.ticketService.updateTicket(this.currentEditId, formValue);
    } else {
      await this.ticketService.addTicket(formValue as Ticket);
    }
    
    this.closeModal();
    this.loadTickets();
  }

  async deleteTicket(id?: string) {
    if (id && confirm('¿Estás seguro de eliminar este ticket?')) {
      await this.ticketService.deleteTicket(id);
      this.loadTickets();
    }
  }

  async downloadTemplate() {
    await this.ticketService.downloadTemplate();
  }

  exportExcel() {
    this.ticketService.exportToExcel();
  }

  exportCSV() {
    this.exportService.exportToCSV(this.filteredTickets, 'Historico_Tickets');
  }

  async onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      try {
        const addedCount = await this.ticketService.importFromExcel(file);
        this.loadTickets();
        alert(`Éxito: Se importaron ${addedCount} tickets desde Excel.`);
      } catch (e) {
         console.error('Error importing', e);
         alert('Error al importar el archivo Excel. Verifica el formato.');
      }
      // Reset input file
      event.target.value = null;
    }
  }
}
