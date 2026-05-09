import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicioCatalogos, ServicioTickets, ServicioDialogo } from '../../core/services';
import { Sitio, Area } from '../../core/models';

/**
 * Componente de configuración de catálogos del sistema.
 *
 * Permite al usuario administrar los sitios (CEDIs) y áreas afectadas
 * disponibles para clasificar los tickets. Incluye operaciones de alta,
 * edición, eliminación y sincronización automática desde tickets existentes.
 */
@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mb-4 pb-3 border-bottom border-secondary-subtle d-flex justify-content-between align-items-center">
      <div>
        <h2 class="fw-bold mb-1 text-body-emphasis d-flex align-items-center">
          <i class="bi bi-sliders2 text-primary me-2"></i>
          Configuración de Catálogos
        </h2>
        <p class="text-muted mb-0">Administra los Sitios y Áreas disponibles para los tickets.</p>
      </div>
      <!-- Botón para poblar catálogos desde tickets históricos -->
      <button class="btn btn-primary px-4 py-2 fw-semibold rounded-pill shadow-sm" 
              (click)="sincronizarDesdeTickets()" 
              [disabled]="estaSincronizando">
        <i class="bi bi-arrow-clockwise me-2"></i> Sincronizar desde Tickets
      </button>
    </div>

    <div class="row g-4">

      <!-- Sección de Sitios -->
      <div class="col-md-6">
        <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold mb-0 text-primary">
              <i class="bi bi-geo-alt-fill me-2"></i>Sitios (CEDIs)
            </h5>
            <button class="btn btn-primary btn-sm rounded-pill px-3" (click)="agregarSitio()">
              <i class="bi bi-plus-lg me-1"></i> Agregar
            </button>
          </div>
          
          <div class="list-group list-group-flush custom-scrollbar overflow-auto" style="max-height: 400px;">
            <div *ngIf="sitios.length === 0" class="text-center py-5 opacity-50">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              <span>No hay sitios registrados</span>
            </div>
            
            <div *ngFor="let sitio of sitios" 
                 class="list-group-item border-0 bg-transparent px-0 py-3 d-flex justify-content-between align-items-center hover-bg rounded-3 transition px-2 mb-1">
              <span class="fw-medium text-body-emphasis">{{ sitio.nombre }}</span>
              <div class="btn-group">
                <button class="btn btn-sm btn-link text-secondary p-1 me-2" 
                        (click)="editarSitio(sitio)" 
                        title="Editar">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger border-0 rounded-circle" 
                        (click)="eliminarSitio(sitio)" 
                        title="Eliminar">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sección de Áreas -->
      <div class="col-md-6">
        <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold mb-0 text-success">
              <i class="bi bi-diagram-3-fill me-2"></i>Áreas Afectadas
            </h5>
            <button class="btn btn-success btn-sm rounded-pill px-3" (click)="agregarArea()">
              <i class="bi bi-plus-lg me-1"></i> Agregar
            </button>
          </div>
          
          <div class="list-group list-group-flush custom-scrollbar overflow-auto" style="max-height: 400px;">
            <div *ngIf="areas.length === 0" class="text-center py-5 opacity-50">
              <i class="bi bi-inbox fs-1 d-block mb-2"></i>
              <span>No hay áreas registradas</span>
            </div>
            
            <div *ngFor="let area of areas" 
                 class="list-group-item border-0 bg-transparent px-0 py-3 d-flex justify-content-between align-items-center hover-bg rounded-3 transition px-2 mb-1">
              <span class="fw-medium text-body-emphasis">{{ area.nombre }}</span>
              <div class="btn-group">
                <button class="btn btn-sm btn-link text-secondary p-1 me-2" 
                        (click)="editarArea(area)" 
                        title="Editar">
                  <i class="bi bi-pencil-square"></i>
                </button>
                <button class="btn btn-sm btn-link text-danger p-1" 
                        (click)="eliminarArea(area)" 
                        title="Eliminar">
                  <i class="bi bi-trash3-fill"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .hover-bg:hover { background-color: var(--bs-tertiary-bg); }
    .transition { transition: all 0.2s ease-in-out; }
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class ComponenteConfiguracion implements OnInit {

  /** Lista de sitios disponibles en el catálogo del usuario */
  sitios: Sitio[] = [];

  /** Lista de áreas afectadas disponibles en el catálogo del usuario */
  areas: Area[] = [];

  /** Indica si hay una sincronización en curso para deshabilitar el botón */
  estaSincronizando = false;

  /**
   * @param servicioCatalogos - Servicio para gestionar sitios y áreas en Firestore.
   * @param servicioTickets   - Servicio de tickets para validar integridad referencial.
   * @param servicioDialogo   - Servicio para mostrar alertas, confirmaciones y prompts.
   */
  constructor(
    private servicioCatalogos: ServicioCatalogos,
    private servicioTickets: ServicioTickets,
    private servicioDialogo: ServicioDialogo
  ) { }

  /** Carga los catálogos al inicializar el componente */
  async ngOnInit(): Promise<void> {
    await this.cargarDatos();
  }

  /**
   * Carga o recarga los sitios y áreas desde Firestore.
   * Se llama al iniciar y tras cada operación de escritura.
   */
  async cargarDatos(): Promise<void> {
    this.sitios = await this.servicioCatalogos.obtenerSitios();
    this.areas = await this.servicioCatalogos.obtenerAreas();
  }

  // ---------------------------------------------------------------------------
  // Sincronización
  // ---------------------------------------------------------------------------

  /**
   * Extrae sitios y áreas únicos de los tickets existentes y los agrega
   * al catálogo si aún no están registrados. Muestra un cargador durante
   * el proceso y garantiza un tiempo mínimo de visualización de 3 segundos.
   */
  async sincronizarDesdeTickets(): Promise<void> {
    this.estaSincronizando = true;
    this.servicioDialogo.mostrarCargador('Sincronizando catálogos desde tickets...');
    const tiempoInicio = Date.now();

    try {
      const tickets = await this.servicioTickets.obtenerTickets();

      // Tiempo mínimo de 3 segundos para el cargador aunque la operación sea rápida
      const esperarMinimo = async () => {
        const transcurrido = Date.now() - tiempoInicio;
        if (transcurrido < 3000) await new Promise(r => setTimeout(r, 3000 - transcurrido));
      };

      if (tickets.length === 0) {
        await esperarMinimo();
        this.servicioDialogo.ocultarCargador();
        await this.servicioDialogo.alerta({
          titulo: 'Sin Datos',
          mensaje: 'No se encontraron tickets previos para sincronizar.',
          tipo: 'warning'
        });
      } else {
        const resultado = await this.servicioCatalogos.autoPopularDesdTickets(tickets);
        await this.cargarDatos();
        await esperarMinimo();
        this.servicioDialogo.ocultarCargador();
        await this.servicioDialogo.alerta({
          titulo: 'Sincronización Exitosa',
          mensaje: `Proceso completado.\n- Nuevos Sitios: ${resultado.sitiosAgregados}\n- Nuevas Áreas: ${resultado.areasAgregadas}`,
          tipo: 'success'
        });
      }
    } catch (error) {
      console.error('Error durante la sincronización:', error);
      this.servicioDialogo.ocultarCargador();
      await this.servicioDialogo.alerta({
        titulo: 'Error',
        mensaje: 'Ocurrió un fallo durante la sincronización.',
        tipo: 'danger'
      });
    } finally {
      this.estaSincronizando = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Gestión de Sitios
  // ---------------------------------------------------------------------------

  /**
   * Solicita al usuario el nombre de un nuevo sitio mediante un prompt
   * y lo registra en el catálogo si el valor es válido.
   */
  async agregarSitio(): Promise<void> {
    const nombre = await this.servicioDialogo.prompt({
      titulo: 'Nuevo Sitio (CEDI)',
      mensaje: 'Ingresa el nombre del nuevo sitio para el catálogo:',
      placeholder: 'Ej: CEDI Monterrey',
      tipo: 'primary',
      textoConfirmar: 'Registrar'
    });

    if (nombre?.trim()) {
      await this.servicioCatalogos.agregarSitio(nombre.trim());
      this.cargarDatos();
    }
  }

  /**
   * Permite al usuario modificar el nombre de un sitio existente.
   * Si el nombre cambia, solicita confirmación y actualiza también
   * todos los tickets que referencian el nombre anterior.
   *
   * @param sitio - Sitio seleccionado para editar.
   */
  async editarSitio(sitio: Sitio): Promise<void> {
    const nombreAnterior = sitio.nombre;
    const nombreNuevo = await this.servicioDialogo.prompt({
      titulo: 'Editar Sitio',
      mensaje: `Modifica el nombre del sitio "${nombreAnterior}":`,
      valorPorDefecto: nombreAnterior,
      tipo: 'primary',
      textoConfirmar: 'Actualizar'
    });

    if (nombreNuevo?.trim() && nombreNuevo !== nombreAnterior) {
      const confirmado = await this.servicioDialogo.confirmar({
        titulo: 'Confirmar Cambio',
        mensaje: `¿Deseas actualizar el nombre a "${nombreNuevo}"? Todos los tickets asociados a "${nombreAnterior}" también serán actualizados automáticamente.`,
        tipo: 'warning',
        textoConfirmar: 'Actualizar Todo'
      });
      if (confirmado) {
        await this.servicioCatalogos.actualizarSitio(sitio.id!, nombreNuevo.trim());
        await this.servicioTickets.actualizarNombreSitioEnMasa(nombreAnterior, nombreNuevo.trim());
        this.cargarDatos();
      }
    }
  }

  /**
   * Verifica si el sitio está referenciado por algún ticket antes de eliminarlo.
   * Si tiene tickets asociados, bloquea la eliminación con una alerta.
   * De lo contrario, solicita confirmación al usuario.
   *
   * @param sitio - Sitio seleccionado para eliminar.
   */
  async eliminarSitio(sitio: Sitio): Promise<void> {
    const totalTickets = await this.servicioTickets.contarTicketsPorSitio(sitio.nombre);

    if (totalTickets > 0) {
      await this.servicioDialogo.alerta({
        titulo: 'Acción Bloqueada',
        mensaje: `No se puede eliminar el sitio "${sitio.nombre}" porque está asociado a ${totalTickets} ticket(s). Favor de validar.`,
        tipo: 'danger'
      });
      return;
    }

    const confirmado = await this.servicioDialogo.confirmar({
      titulo: 'Eliminar Sitio',
      mensaje: `¿Estás seguro de eliminar el sitio "${sitio.nombre}"?`,
      tipo: 'danger',
      textoConfirmar: 'Eliminar'
    });
    if (confirmado) {
      await this.servicioCatalogos.eliminarSitio(sitio.id!);
      this.cargarDatos();
    }
  }

  // ---------------------------------------------------------------------------
  // Gestión de Áreas
  // ---------------------------------------------------------------------------

  /**
   * Solicita al usuario el nombre de una nueva área mediante un prompt
   * y la registra en el catálogo si el valor es válido.
   */
  async agregarArea(): Promise<void> {
    const nombre = await this.servicioDialogo.prompt({
      titulo: 'Nueva Área Afectada',
      mensaje: 'Ingresa el nombre de la nueva área para el catálogo:',
      placeholder: 'Ej: Redes / Conectividad',
      tipo: 'success',
      textoConfirmar: 'Registrar'
    });

    if (nombre?.trim()) {
      await this.servicioCatalogos.agregarArea(nombre.trim());
      this.cargarDatos();
    }
  }

  /**
   * Permite al usuario modificar el nombre de un área existente.
   * Si el nombre cambia, solicita confirmación y actualiza también
   * todos los tickets que referencian el nombre anterior.
   *
   * @param area - Área seleccionada para editar.
   */
  async editarArea(area: Area): Promise<void> {
    const nombreAnterior = area.nombre;
    const nombreNuevo = await this.servicioDialogo.prompt({
      titulo: 'Editar Área',
      mensaje: `Modifica el nombre de la categoría "${nombreAnterior}":`,
      valorPorDefecto: nombreAnterior,
      tipo: 'success',
      textoConfirmar: 'Actualizar'
    });

    if (nombreNuevo?.trim() && nombreNuevo !== nombreAnterior) {
      const confirmado = await this.servicioDialogo.confirmar({
        titulo: 'Confirmar Cambio',
        mensaje: `¿Deseas actualizar el nombre a "${nombreNuevo}"? Todos los tickets asociados a "${nombreAnterior}" también serán actualizados automáticamente.`,
        tipo: 'warning',
        textoConfirmar: 'Actualizar Todo'
      });
      if (confirmado) {
        await this.servicioCatalogos.actualizarArea(area.id!, nombreNuevo.trim());
        await this.servicioTickets.actualizarNombreAreaEnMasa(nombreAnterior, nombreNuevo.trim());
        this.cargarDatos();
      }
    }
  }

  /**
   * Verifica si el área está referenciada por algún ticket antes de eliminarla.
   * Si tiene tickets asociados, bloquea la eliminación con una alerta.
   * De lo contrario, solicita confirmación al usuario.
   *
   * @param area - Área seleccionada para eliminar.
   */
  async eliminarArea(area: Area): Promise<void> {
    const totalTickets = await this.servicioTickets.contarTicketsPorArea(area.nombre);

    if (totalTickets > 0) {
      await this.servicioDialogo.alerta({
        titulo: 'Acción Bloqueada',
        mensaje: `No se puede eliminar el área "${area.nombre}" porque está asociada a ${totalTickets} ticket(s). Favor de validar.`,
        tipo: 'danger'
      });
      return;
    }

    const confirmado = await this.servicioDialogo.confirmar({
      titulo: 'Eliminar Área',
      mensaje: `¿Estás seguro de eliminar el área "${area.nombre}"?`,
      tipo: 'danger',
      textoConfirmar: 'Eliminar'
    });
    if (confirmado) {
      await this.servicioCatalogos.eliminarArea(area.id!);
      this.cargarDatos();
    }
  }
}