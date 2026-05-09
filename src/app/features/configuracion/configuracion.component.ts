import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CatalogService } from '../../core/services/catalogo.service';
import { TicketService } from '../../core/services/ticket.service';
import { Site, Area } from '../../core/models/ticket.modelo';
import { DialogService } from '../../core/services/dialogo.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4 pb-3 border-bottom border-secondary-subtle d-flex justify-content-between align-items-center">
      <div>
        <h2 class="fw-bold mb-1 text-body-emphasis">Configuración de Catálogos</h2>
        <p class="text-muted mb-0">Administra los Sitios y Áreas disponibles para los tickets.</p>
      </div>
      <button class="btn btn-primary px-4 py-2 fw-semibold rounded-pill shadow-sm" (click)="syncFromTickets()" [disabled]="isSyncing">
        <i class="bi bi-arrow-clockwise me-2"></i> Sincronizar desde Tickets
      </button>
    </div>

    <div class="row g-4">
      <!-- SITES SECTION -->
      <div class="col-md-6">
        <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold mb-0 text-primary"><i class="bi bi-geo-alt-fill me-2"></i>Sitios (CEDIs)</h5>
            <button class="btn btn-primary btn-sm rounded-pill px-3" (click)="addSite()">
              <i class="bi bi-plus-lg me-1"></i> Agregar
            </button>
          </div>
          
          <div class="list-group list-group-flush custom-scrollbar overflow-auto" style="max-height: 400px;">
            <div *ngIf="sites.length === 0" class="text-center py-5 opacity-50">
               <i class="bi bi-inbox fs-1 d-block mb-2"></i>
               <span>No hay sitios registrados</span>
            </div>
            
            <div *ngFor="let site of sites" class="list-group-item border-0 bg-transparent px-0 py-3 d-flex justify-content-between align-items-center hover-bg rounded-3 transition px-2 mb-1">
              <span class="fw-medium text-body-emphasis">{{ site.name }}</span>
              <div class="btn-group">
                <button class="btn btn-sm btn-link text-secondary p-1 me-2" (click)="editSite(site)" title="Editar">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" title="Eliminar" (click)="deleteSite(site)">
                <i class="bi bi-trash"></i>
              </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AREAS SECTION -->
      <div class="col-md-6">
        <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold mb-0 text-success"><i class="bi bi-diagram-3-fill me-2"></i>Áreas Afectadas</h5>
            <button class="btn btn-success btn-sm rounded-pill px-3" (click)="addArea()">
              <i class="bi bi-plus-lg me-1"></i> Agregar
            </button>
          </div>
          
          <div class="list-group list-group-flush custom-scrollbar overflow-auto" style="max-height: 400px;">
            <div *ngIf="areas.length === 0" class="text-center py-5 opacity-50">
               <i class="bi bi-inbox fs-1 d-block mb-2"></i>
               <span>No hay áreas registradas</span>
            </div>
            
            <div *ngFor="let area of areas" class="list-group-item border-0 bg-transparent px-0 py-3 d-flex justify-content-between align-items-center hover-bg rounded-3 transition px-2 mb-1">
              <span class="fw-medium text-body-emphasis">{{ area.name }}</span>
              <div class="btn-group">
                <button class="btn btn-sm btn-link text-secondary p-1 me-2" (click)="editArea(area)" title="Editar">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-link text-danger p-1" (click)="deleteArea(area)" title="Eliminar">
                  <i class="bi bi-trash3-fill"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals or Prompts for Add/Edit -->
  `,
  styles: [`
    .hover-bg:hover { background-color: var(--bs-tertiary-bg); }
    .transition { transition: all 0.2s ease-in-out; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class SettingsComponent implements OnInit {
  sites: Site[] = [];
  areas: Area[] = [];
  isSyncing = false;

  constructor(
    private catalogService: CatalogService,
    private ticketService: TicketService,
    private dialogService: DialogService
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.sites = await this.catalogService.getSites();
    this.areas = await this.catalogService.getAreas();
  }

  async syncFromTickets() {
    this.isSyncing = true;
    this.dialogService.showLoader('Sincronizando catálogos desde tickets...');
    const start = Date.now();
    try {
      const tickets = await this.ticketService.getTickets();
      if (tickets.length === 0) {
        // Esperar mínimo 3 segundos
        const elapsed = Date.now() - start;
        if (elapsed < 3000) await new Promise(r => setTimeout(r, 3000 - elapsed));
        this.dialogService.hideLoader();
        await this.dialogService.alert({
          title: 'Sin Datos',
          message: 'No se encontraron tickets previos para sincronizar.',
          type: 'warning'
        });
      } else {
        const result = await this.catalogService.autoPopulateFromTickets(tickets);
        await this.loadData();
        // Esperar mínimo 3 segundos
        const elapsed = Date.now() - start;
        if (elapsed < 3000) await new Promise(r => setTimeout(r, 3000 - elapsed));
        this.dialogService.hideLoader();
        await this.dialogService.alert({
          title: 'Sincronización Exitosa',
          message: `Proceso completado.\n- Nuevos Sitios: ${result.sitesAdded}\n- Nuevas Áreas: ${result.areasAdded}`,
          type: 'success'
        });
      }
    } catch (err) {
      console.error(err);
      this.dialogService.hideLoader();
      await this.dialogService.alert({
        title: 'Error',
        message: 'Ocurrió un fallo durante la sincronización.',
        type: 'danger'
      });
    } finally {
      this.isSyncing = false;
    }
  }

  async addSite() {
    const name = await this.dialogService.prompt({
      title: 'Nuevo Sitio (CEDI)',
      message: 'Ingresa el nombre del nuevo sitio para el catálogo:',
      placeholder: 'Ej: CEDI Monterrey',
      type: 'primary',
      confirmText: 'Registrar'
    });
    
    if (name && name.trim()) {
      await this.catalogService.addSite(name.trim());
      this.loadData();
    }
  }

  async editSite(site: Site) {
    const oldName = site.name;
    const newName = await this.dialogService.prompt({
      title: 'Editar Sitio',
      message: `Modifica el nombre del sitio "${oldName}":`,
      defaultValue: oldName,
      type: 'primary',
      confirmText: 'Actualizar'
    });

    if (newName && newName.trim() && newName !== oldName) {
      const confirmed = await this.dialogService.confirm({
        title: 'Confirmar Cambio',
        message: `¿Deseas actualizar el nombre a "${newName}"? Todos los tickets existentes asociados a "${oldName}" también serán actualizados automáticamente.`,
        type: 'warning',
        confirmText: 'Actualizar Todo'
      });
      if (confirmed) {
        await this.catalogService.updateSite(site.id!, newName.trim());
        await this.ticketService.bulkUpdateSiteName(oldName, newName.trim());
        this.loadData();
      }
    }
  }

  async deleteSite(site: Site) {
    const count = await this.ticketService.countTicketsBySite(site.name);
    if (count > 0) {
      await this.dialogService.alert({
        title: 'Acción Bloqueada',
        message: `No se puede eliminar el sitio "${site.name}" porque está asociado a ${count} ticket(s). Favor de validar.`,
        type: 'danger'
      });
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Eliminar Sitio',
      message: `¿Estás seguro de eliminar el sitio "${site.name}"?`,
      type: 'danger',
      confirmText: 'Eliminar'
    });
    if (confirmed) {
      await this.catalogService.deleteSite(site.id!);
      this.loadData();
    }
  }

  async addArea() {
    const name = await this.dialogService.prompt({
      title: 'Nueva Área Afectada',
      message: 'Ingresa el nombre de la nueva área para el catálogo:',
      placeholder: 'Ej: Redes / Conectividad',
      type: 'success',
      confirmText: 'Registrar'
    });

    if (name && name.trim()) {
      await this.catalogService.addArea(name.trim());
      this.loadData();
    }
  }

  async editArea(area: Area) {
    const oldName = area.name;
    const newName = await this.dialogService.prompt({
      title: 'Editar Área',
      message: `Modifica el nombre de la categoría "${oldName}":`,
      defaultValue: oldName,
      type: 'success',
      confirmText: 'Actualizar'
    });

    if (newName && newName.trim() && newName !== oldName) {
      const confirmed = await this.dialogService.confirm({
        title: 'Confirmar Cambio',
        message: `¿Deseas actualizar el nombre a "${newName}"? Todos los tickets existentes asociados a "${oldName}" también serán actualizados automáticamente.`,
        type: 'warning',
        confirmText: 'Actualizar Todo'
      });
      if (confirmed) {
        await this.catalogService.updateArea(area.id!, newName.trim());
        await this.ticketService.bulkUpdateAreaName(oldName, newName.trim());
        this.loadData();
      }
    }
  }

  async deleteArea(area: Area) {
    const count = await this.ticketService.countTicketsByArea(area.name);
    if (count > 0) {
      await this.dialogService.alert({
        title: 'Acción Bloqueada',
        message: `No se puede eliminar el área "${area.name}" porque está asociada a ${count} ticket(s). Favor de validar.`,
        type: 'danger'
      });
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Eliminar Área',
      message: `¿Estás seguro de eliminar el área "${area.name}"?`,
      type: 'danger',
      confirmText: 'Eliminar'
    });
    if (confirmed) {
      await this.catalogService.deleteArea(area.id!);
      this.loadData();
    }
  }
}
