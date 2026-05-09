import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TicketService } from '../../core/services/ticket.service';
import { ExportService } from '../../core/services/exportacion.service';
import { CatalogService } from '../../core/services/catalogo.service';
import { Ticket, Site, Area } from '../../core/models/ticket.modelo';
import { AuthService } from '../../core/services/autenticacion.service';

declare var bootstrap: any;

import { DateUtils } from '../../core/utils/utilidades-fecha';
import { DialogService } from '../../core/services/dialogo.service';

@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './lista-tickets.component.html',
  styleUrls: ['./lista-tickets.component.scss']
})
export class TicketListComponent implements OnInit {
  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  sites: Site[] = [];
  areas: Area[] = [];

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
    private catalogService: CatalogService,
    private dialogService: DialogService,
    private fb: FormBuilder,
    public auth: AuthService
  ) {
    this.initForm();
  }

  async ngOnInit() {
    this.currentWeek = DateUtils.calculateISOWeek(new Date());
    this.selectedWeek = this.currentWeek;
    await this.loadTickets();
    await this.loadCatalogs();

    // Si no hay tickets en la semana actual pero hay tickets en general, 
    // sugerir o saltar a la semana más reciente con datos.
    if (this.filteredTickets.length === 0 && this.tickets.length > 0) {
      const maxWeek = Math.max(...this.tickets.map(t => t.week));
      if (maxWeek > 0 && maxWeek !== this.selectedWeek) {
        this.selectedWeek = maxWeek;
        this.applyFilters();
      }
    }
  }

  async loadCatalogs() {
    this.sites = await this.catalogService.getSites();
    this.areas = await this.catalogService.getAreas();
  }

  calculateISOWeek(d: Date): number {
    return DateUtils.calculateISOWeek(d);
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
    if (this.tickets.length > 0) {
      const result = await this.catalogService.autoPopulateFromTickets(this.tickets);
      if (result.sitesAdded > 0 || result.areasAdded > 0) {
        await this.loadCatalogs();
      }
    }
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

  async openModal(ticket?: Ticket) {
    if (this.sites.length === 0 || this.areas.length === 0) {
      await this.dialogService.alert({
        title: 'Configuración Requerida',
        message: 'Atención: Debes registrar al menos un Sitio y un Área en la sección de Configuración antes de crear tickets.',
        type: 'warning'
      });
      return;
    }

    if (ticket) {
      const confirmed = await this.dialogService.confirm({
        title: 'Editar Ticket',
        message: `¿Deseas editar la información del ticket #${ticket.ticketNumber}?`,
        type: 'primary',
        confirmText: 'Editar'
      });
      if (!confirmed) return;
    }

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
        await this.dialogService.alert({
          title: 'Ticket Duplicado',
          message: `Atención: Ya existe un ticket con el número ${formValue.ticketNumber}. Si deseas modificarlo, búscalo en la lista y selecciona editar.`,
          type: 'danger'
        });
        return;
      }
      await this.ticketService.addTicket(formValue as Ticket);
    }

    this.closeModal();
    this.loadTickets();
  }

  async deleteTicket(id?: string) {
    if (id) {
      const confirmed = await this.dialogService.confirm({
        title: 'Eliminar Ticket',
        message: '¿Estás seguro de eliminar este ticket?',
        type: 'danger',
        confirmText: 'Eliminar'
      });
      if (confirmed) {
        await this.ticketService.deleteTicket(id);
        this.loadTickets();
      }
    }
  }

  async downloadTemplateWithLoader() {
    this.dialogService.showLoader('Generando plantilla de importación...');
    try {
      await this.ticketService.downloadTemplate();
      // Small delay to show the loader
      await new Promise(r => setTimeout(r, 800));
    } finally {
      this.dialogService.hideLoader();
    }
  }

  async exportCurrentWeek() {
    this.dialogService.showLoader(`Exportando tickets de la Semana ${this.selectedWeek}...`);
    try {
      await this.ticketService.exportToExcel(this.selectedWeek);
      await new Promise(r => setTimeout(r, 800));
    } finally {
      this.dialogService.hideLoader();
    }
  }

  async exportAll() {
    this.dialogService.showLoader('Exportando todo el historial de tickets...');
    try {
      await this.ticketService.exportToExcel();
      await new Promise(r => setTimeout(r, 800));
    } finally {
      this.dialogService.hideLoader();
    }
  }

  async onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.dialogService.showLoader('Importando tickets desde Excel...');
      try {
        const result = await this.ticketService.importFromExcel(file);
        this.dialogService.hideLoader();
        this.loadTickets();
        
        let message = `Proceso finalizado.\n- Nuevos: ${result.added}`;
        if (result.skipped > 0) {
          message += `\n- Omitidos (ya existen): ${result.skipped}`;
        }

        await this.dialogService.alert({
          title: 'Resumen de Importación',
          message: message,
          type: 'success'
        });
      } catch (err: any) {
        this.dialogService.hideLoader();
        await this.dialogService.alert({
          title: 'Error de Importación',
          message: err.message || 'Error desconocido',
          type: 'danger'
        });
      }
      // Reset input file
      event.target.value = null;
    }
  }
}
