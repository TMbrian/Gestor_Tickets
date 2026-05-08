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
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

    // ISO: semana empieza lunes, jueves define el año
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);

    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));

    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
        const [year, month, day] = val.split('-').map(Number);
        const d = new Date(year, month - 1, day); // ✅ LOCAL

        const week = this.calculateISOWeek(d);
        this.ticketForm.patchValue({ week }, { emitEvent: false });
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

      // ⚠️ IMPORTANTE: recalcular semana por si viene mal guardada
      let week = ticket.week;

      if (ticket.assignmentDate) {
        const [year, month, day] = ticket.assignmentDate.split('-').map(Number);
        const safeDate = new Date(year, month - 1, day);
        week = this.calculateISOWeek(safeDate);
      }

      this.ticketForm.patchValue({
        ...ticket,
        week
      });

    } else {
      this.isEditing = false;
      this.currentEditId = undefined;

      const today = new Date();

      // ✅ Fecha LOCAL (NO UTC)
      const todayDate = `${today.getFullYear()}-${(today.getMonth() + 1)
        .toString().padStart(2, '0')}-${today.getDate()
          .toString().padStart(2, '0')}`;

      // ✅ Hora limpia
      const timeStr = today.toTimeString().slice(0, 5);

      // ✅ Semana correcta
      const week = this.calculateISOWeek(today);

      this.ticketForm.reset({
        status: 'Abierto',
        isAssigned: false,
        isRfc: false,
        assignmentDate: todayDate,
        assignmentTime: timeStr,
        week // 🔥 AQUÍ estaba faltando
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
      // 🚨 Check if ticket number already exists for this user
      const existing = await this.ticketService.getTicketByNumber(formValue.ticketNumber);
      if (existing) {
        alert(`Atención: Ya existe un ticket con el número ${formValue.ticketNumber}. Si deseas modificarlo, búscalo en la lista y selecciona editar.`);
        return;
      }
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
        const result = await this.ticketService.importFromExcel(file);
        this.loadTickets();
        
        let message = `Proceso finalizado.\n- Nuevos: ${result.added}`;
        if (result.skipped > 0) {
          message += `\n- Omitidos (ya existen): ${result.skipped}`;
        }
        alert(message);
      } catch (e: any) {
        console.error('Error importing', e);
        alert(`Error al importar: ${e.message || 'Error desconocido'}`);
      }
      // Reset input file
      event.target.value = null;
    }
  }
}
