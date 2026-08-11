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
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ComponenteConfiguracion implements OnInit {

  /** Lista de sitios disponibles en el catálogo del usuario */
  sitios: Sitio[] = [];

  /** Lista de áreas afectadas disponibles en el catálogo del usuario */
  areas: Area[] = [];

  /** Indica si hay una sincronización en curso para deshabilitar el botón */
  estaSincronizando = false;

  /**
 * @param servicioCatalogos - Servicio para gestionar el catálogo de sitios y áreas.
 * @param servicioTickets   - Servicio de tickets para validar integridad referencial.
 * @param servicioDialogo   - Servicio para mostrar alertas, confirmaciones y prompts.
 */
  constructor(
    private readonly servicioCatalogos: ServicioCatalogos,
    private readonly servicioTickets: ServicioTickets,
    private readonly servicioDialogo: ServicioDialogo
  ) { }

  /** Carga los catálogos al inicializar el componente */
  ngOnInit(): void {
    void this.cargarDatos();
  }

  /**
   * Carga o recarga los sitios y áreas del catálogo.
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
      maxLength: 50,
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
      maxLength: 50,
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
        // El backend actualiza el sitio Y renombra los tickets asociados de
        // forma atómica dentro de una sola transacción (PUT /catalogos/sitios/{id}) —
        // ya no hace falta un segundo paso desde acá.
        await this.servicioCatalogos.actualizarSitio(sitio.id!, nombreNuevo.trim());
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
      maxLength: 50,
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
      maxLength: 50,
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
        // Ver comentario de editarSitio: el backend hace el rename atómico.
        await this.servicioCatalogos.actualizarArea(area.id!, nombreNuevo.trim());
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