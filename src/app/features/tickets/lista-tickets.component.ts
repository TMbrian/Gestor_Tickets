import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ServicioTickets, ServicioExportacion, ServicioCatalogos,
  ServicioAutenticacion, ServicioDialogo
} from '../../core/services';
import { Ticket, Sitio, Area } from '../../core/models';
import { UtilidadesFecha } from '../../core/utils/utilidades-fecha';

declare var bootstrap: any;

/**
 * Componente que despliega el listado de tickets filtrado por semana ISO.
 *
 * Permite buscar, filtrar por estado, navegar entre semanas, crear y editar
 * tickets mediante un modal de Bootstrap, exportar a Excel (semana o histórico
 * completo), descargar la plantilla de importación y cargar tickets desde un
 * archivo Excel.
 */
@Component({
  selector: 'app-ticket-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './lista-tickets.component.html',
  styleUrls: ['./lista-tickets.component.scss']
})
export class ListaTicketsComponent implements OnInit {
  /** Listado completo de tickets del usuario autenticado */
  tickets: Ticket[] = [];

  /** Tickets que pasan los filtros activos (semana, estado y texto de búsqueda) */
  ticketsFiltrados: Ticket[] = [];

  /** Catálogo de sitios disponibles para el formulario */
  sitios: Sitio[] = [];

  /** Catálogo de áreas afectadas disponibles para el formulario */
  areas: Area[] = [];

  /** Texto que el usuario captura en el buscador de la tabla */
  textoBusqueda = '';

  /** Filtro activo por estado del ticket (vacío = todos los estados) */
  filtroEstado = '';

  /** Formulario reactivo utilizado tanto para crear como para editar tickets */
  formularioTicket!: FormGroup;

  /** Indica si el modal está abierto en modo edición (true) o creación (false) */
  modoEdicion = false;

  /** ID del ticket que se está editando actualmente (sólo en modo edición) */
  idEdicionActual?: string;

  /** Número de la semana ISO seleccionada en el filtro */
  semanaSeleccionada: number = 1;

  /** Número de la semana ISO real (la del día de hoy) */
  semanaActual: number = 1;

  /** Referencia al elemento HTML del modal de Bootstrap */
  @ViewChild('ticketModal') referenciaModalTicket!: ElementRef;

  /** Instancia del modal de Bootstrap creada al abrirlo por primera vez */
  instanciaModal: any;

  /**
   * Constructor del componente.
   *
   * @param servicioTickets       - Servicio para CRUD y consulta de tickets.
   * @param servicioExportacion   - Servicio de exportación a Excel (no usado directamente aquí; mantenido por compatibilidad).
   * @param servicioCatalogos     - Servicio que provee los catálogos de sitios y áreas.
   * @param servicioDialogo       - Servicio para mostrar alertas, confirmaciones y el cargador global.
   * @param fb                    - Constructor de formularios reactivos de Angular.
   * @param auth                  - Servicio de autenticación expuesto público para uso desde la plantilla.
   */
  constructor(
    private servicioTickets: ServicioTickets,
    private servicioExportacion: ServicioExportacion,
    private servicioCatalogos: ServicioCatalogos,
    private servicioDialogo: ServicioDialogo,
    private fb: FormBuilder,
    public auth: ServicioAutenticacion
  ) {
    this.inicializarFormulario();
  }

  /**
   * Hook del ciclo de vida que inicializa la semana actual y carga los datos
   * iniciales (tickets y catálogos).
   *
   * Si la semana actual no contiene tickets pero existen tickets en otras
   * semanas, salta automáticamente a la semana más reciente con datos.
   */
  async ngOnInit() {
    this.semanaActual = UtilidadesFecha.calcularSemanaISO(new Date());
    this.semanaSeleccionada = this.semanaActual;
    await this.cargarTickets();
    await this.cargarCatalogos();

    // Si no hay tickets en la semana actual pero hay tickets en general,
    // saltar automáticamente a la semana más reciente con datos.
    if (this.ticketsFiltrados.length === 0 && this.tickets.length > 0) {
      const semanaMaxima = Math.max(...this.tickets.map(t => t.semana));
      if (semanaMaxima > 0 && semanaMaxima !== this.semanaSeleccionada) {
        this.semanaSeleccionada = semanaMaxima;
        this.aplicarFiltros();
      }
    }
  }

  /**
   * Carga los catálogos de sitios y áreas desde el servicio correspondiente.
   *
   * @returns Promise<void> que se resuelve cuando ambos catálogos están listos.
   */
  async cargarCatalogos() {
    this.sitios = await this.servicioCatalogos.obtenerSitios();
    this.areas = await this.servicioCatalogos.obtenerAreas();
  }

  /**
   * Calcula el número de semana ISO 8601 de una fecha dada.
   *
   * Wrapper que delega en `UtilidadesFecha` para mantener la lógica centralizada.
   *
   * @param fecha - Fecha de la cual se desea calcular la semana ISO.
   * @returns Número de semana ISO (1-53).
   */
  calcularSemanaIso(fecha: Date): number {
    return UtilidadesFecha.calcularSemanaISO(fecha);
  }

  /**
   * Retrocede una semana en el filtro y vuelve a aplicar los filtros.
   * No permite ir por debajo de la semana 1.
   */
  semanaAnterior() {
    if (this.semanaSeleccionada > 1) {
      this.semanaSeleccionada--;
      this.aplicarFiltros();
    }
  }

  /**
   * Avanza una semana en el filtro y vuelve a aplicar los filtros.
   * No permite ir más allá de la semana 53.
   */
  semanaSiguiente() {
    if (this.semanaSeleccionada < 53) {
      this.semanaSeleccionada++;
      this.aplicarFiltros();
    }
  }

  /**
   * Reposiciona el filtro en la semana ISO actual y refresca el listado.
   */
  irASemanaActual() {
    this.semanaSeleccionada = this.semanaActual;
    this.aplicarFiltros();
  }

  /**
   * Construye el formulario reactivo de tickets con sus validadores.
   *
   * Además, suscribe el campo `fechaAsignacion` para recalcular automáticamente
   * la semana ISO cada vez que el usuario cambia la fecha de asignación.
   */
  inicializarFormulario() {
    this.formularioTicket = this.fb.group({
      numeroTicket: ['', [Validators.required, Validators.pattern('^[0-9]+$'), Validators.maxLength(15)]],
      semana: [1, [Validators.required, Validators.min(1), Validators.max(53)]],
      fechaAsignacion: ['', Validators.required],
      horaAsignacion: ['', Validators.required],
      fechaCierre: [''],
      horaCierre: [''],
      estaAsignado: [false],
      esRfc: [false],
      numeroRfc: ['', Validators.maxLength(30)],
      sitio: ['', Validators.required],
      areaAfectada: ['', Validators.required],
      descripcion: ['', [Validators.required, Validators.maxLength(1000)]],
      estado: ['Abierto', Validators.required]
    });

    // Recalcular automáticamente la semana ISO al cambiar la fecha de asignación
    this.formularioTicket.get('fechaAsignacion')?.valueChanges.subscribe(valor => {
      if (valor) {
        const [anio, mes, dia] = valor.split('-').map(Number);
        const fechaLocal = new Date(anio, mes - 1, dia); // Fecha LOCAL (no UTC)

        const semana = this.calcularSemanaIso(fechaLocal);
        this.formularioTicket.patchValue({ semana: semana }, { emitEvent: false });
      }
    });
  }

  /**
   * Carga todos los tickets del usuario y dispara el auto-poblado de catálogos
   * a partir de los datos de los tickets cuando es necesario.
   *
   * Si se agregaron sitios o áreas nuevas durante el auto-poblado, recarga
   * los catálogos para reflejarlos en el formulario.
   */
  async cargarTickets() {
    this.tickets = await this.servicioTickets.obtenerTickets();
    if (this.tickets.length > 0) {
      const resultado = await this.servicioCatalogos.autoPopularDesdTickets(this.tickets);
      if (resultado.sitiosAgregados > 0 || resultado.areasAgregadas > 0) {
        await this.cargarCatalogos();
      }
    }
    this.aplicarFiltros();
  }

  /**
   * Aplica los filtros activos (texto, estado y semana) sobre la lista
   * completa de tickets y actualiza `ticketsFiltrados`.
   */
  aplicarFiltros() {
    this.ticketsFiltrados = this.tickets.filter(ticket => {
      // Coincidencia por texto: busca el término en cualquier propiedad del ticket
      const coincideTexto = Object.values(ticket as any).some((valor: any) =>
        valor !== undefined && valor !== null &&
        String(valor).toLowerCase().includes(this.textoBusqueda.toLowerCase())
      );
      // Coincidencia por estado: si no hay filtro, todos pasan
      const coincideEstado = this.filtroEstado ? ticket.estado === this.filtroEstado : true;
      // Coincidencia por semana ISO seleccionada
      const coincideSemana = ticket.semana === this.semanaSeleccionada;
      return coincideTexto && coincideEstado && coincideSemana;
    });
  }

  /**
   * Abre el modal en modo creación (sin parámetro) o edición (con ticket).
   *
   * Antes de abrir valida que existan sitios y áreas registrados; si no,
   * muestra una alerta y aborta la apertura. En modo edición pide confirmación
   * al usuario y recalcula la semana del ticket por si vino mal almacenada.
   *
   * @param ticket - Ticket a editar. Si se omite, abre el modal en modo creación.
   */
  async abrirModal(ticket?: Ticket) {
    if (this.sitios.length === 0 || this.areas.length === 0) {
      await this.servicioDialogo.alerta({
        titulo: 'Configuración Requerida',
        mensaje: 'Atención: Debes registrar al menos un Sitio y un Área en la sección de Configuración antes de crear tickets.',
        tipo: 'warning'
      });
      return;
    }

    if (ticket) {
      const confirmado = await this.servicioDialogo.confirmar({
        titulo: 'Editar Ticket',
        mensaje: `¿Deseas editar la información del ticket #${ticket.numeroTicket}?`,
        tipo: 'primary',
        textoConfirmar: 'Editar'
      });
      if (!confirmado) return;
    }

    // Lazy-init del modal de Bootstrap la primera vez que se abre
    if (!this.instanciaModal) {
      this.instanciaModal = new bootstrap.Modal(this.referenciaModalTicket.nativeElement);
    }

    if (ticket) {
      this.modoEdicion = true;
      this.idEdicionActual = ticket.id;

      // ⚠️ IMPORTANTE: recalcular semana por si viene mal guardada
      let semana = ticket.semana;

      if (ticket.fechaAsignacion) {
        const [anio, mes, dia] = ticket.fechaAsignacion.split('-').map(Number);
        const fechaSegura = new Date(anio, mes - 1, dia);
        semana = this.calcularSemanaIso(fechaSegura);
      }

      this.formularioTicket.patchValue({
        ...ticket,
        semana: semana
      });

    } else {
      this.modoEdicion = false;
      this.idEdicionActual = undefined;

      const hoy = new Date();

      // ✅ Fecha LOCAL (NO UTC)
      const fechaHoy = `${hoy.getFullYear()}-${(hoy.getMonth() + 1)
        .toString().padStart(2, '0')}-${hoy.getDate()
          .toString().padStart(2, '0')}`;

      // ✅ Hora limpia en formato HH:mm
      const horaTexto = hoy.toTimeString().slice(0, 5);

      // ✅ Semana correcta según fecha de hoy
      const semana = this.calcularSemanaIso(hoy);

      this.formularioTicket.reset({
        status: 'Abierto',
        isAssigned: false,
        esRfc: false,
        fechaAsignacion: fechaHoy,
        horaAsignacion: horaTexto,
        week: semana
      });
    }

    this.instanciaModal.show();
  }

  /**
   * Cierra el modal de tickets si existe la instancia.
   */
  cerrarModal() {
    this.instanciaModal?.hide();
  }

  /**
   * Guarda el ticket actual: crea uno nuevo o actualiza el existente según
   * el modo en que se abrió el modal.
   *
   * En creación valida que el número de ticket no esté duplicado para el
   * usuario; si lo está, muestra una alerta y aborta el guardado.
   */
  async guardarTicket() {
    if (this.formularioTicket.invalid) return;
    const valoresFormulario = this.formularioTicket.value;

    if (this.modoEdicion && this.idEdicionActual) {
      await this.servicioTickets.actualizarTicket(this.idEdicionActual, valoresFormulario);
    } else {
      // 🚨 Validar que el número de ticket no exista para este usuario
      const ticketExistente = await this.servicioTickets.obtenerTicketPorNumero(valoresFormulario.numeroTicket);
      if (ticketExistente) {
        await this.servicioDialogo.alerta({
          titulo: 'Ticket Duplicado',
          mensaje: `Atención: Ya existe un ticket con el número ${valoresFormulario.numeroTicket}. Si deseas modificarlo, búscalo en la lista y selecciona editar.`,
          tipo: 'danger'
        });
        return;
      }
      await this.servicioTickets.agregarTicket(valoresFormulario as Ticket);
    }

    this.cerrarModal();
    this.cargarTickets();
  }

  /**
   * Elimina un ticket previa confirmación del usuario.
   *
   * @param id - Identificador del ticket a eliminar.
   */
  async eliminarTicket(id?: string) {
    if (id) {
      const confirmado = await this.servicioDialogo.confirmar({
        titulo: 'Eliminar Ticket',
        mensaje: '¿Estás seguro de eliminar este ticket?',
        tipo: 'danger',
        textoConfirmar: 'Eliminar'
      });
      if (confirmado) {
        await this.servicioTickets.eliminarTicket(id);
        this.cargarTickets();
      }
    }
  }

  /**
   * Descarga la plantilla de importación de tickets mostrando el cargador
   * global durante el proceso. Aplica un pequeño retardo para que el cargador
   * sea visible incluso si la generación es instantánea.
   */
  async descargarPlantillaConCargador() {
    this.servicioDialogo.mostrarCargador('Generando plantilla de importación...');
    try {
      await this.servicioTickets.descargarPlantilla();
      // Pequeño retardo para que el cargador alcance a verse
      await new Promise(resolver => setTimeout(resolver, 800));
    } finally {
      this.servicioDialogo.ocultarCargador();
    }
  }

  /**
   * Exporta a Excel únicamente los tickets de la semana actualmente seleccionada.
   */
  async exportarSemanaActual() {
    this.servicioDialogo.mostrarCargador(`Exportando tickets de la Semana ${this.semanaSeleccionada}...`);
    try {
      await this.servicioTickets.exportarAExcel(this.semanaSeleccionada);
      await new Promise(resolver => setTimeout(resolver, 800));
    } finally {
      this.servicioDialogo.ocultarCargador();
    }
  }

  /**
   * Exporta a Excel el historial completo de tickets sin filtro de semana.
   */
  async exportarTodo() {
    this.servicioDialogo.mostrarCargador('Exportando todo el historial de tickets...');
    try {
      await this.servicioTickets.exportarAExcel();
      await new Promise(resolver => setTimeout(resolver, 800));
    } finally {
      this.servicioDialogo.ocultarCargador();
    }
  }

  /**
   * Maneja la selección de un archivo Excel para importación masiva de tickets.
   *
   * Procesa el archivo, recarga los tickets y muestra un resumen con la
   * cantidad de tickets agregados y omitidos (duplicados). Si ocurre un
   * error durante la importación, lo muestra en un diálogo de error.
   *
   * @param evento - Evento `change` del input file con el archivo seleccionado.
   */
  async alCambiarArchivo(evento: any) {
    const archivo = evento.target.files[0];
    if (archivo) {
      this.servicioDialogo.mostrarCargador('Importando tickets desde Excel...');
      try {
        const resultado = await this.servicioTickets.importarDesdeExcel(archivo);
        this.servicioDialogo.ocultarCargador();
        this.cargarTickets();

        let mensaje = `Proceso finalizado.\n- Nuevos: ${resultado.agregados}`;
        if (resultado.omitidos > 0) {
          mensaje += `\n- Omitidos (ya existen): ${resultado.omitidos}`;
        }

        await this.servicioDialogo.alerta({
          titulo: 'Resumen de Importación',
          mensaje: mensaje,
          tipo: 'success'
        });
      } catch (error: any) {
        this.servicioDialogo.ocultarCargador();
        await this.servicioDialogo.alerta({
          titulo: 'Error de Importación',
          mensaje: error.message || 'Error desconocido',
          tipo: 'danger'
        });
      }
      // Reiniciar el input para permitir volver a seleccionar el mismo archivo
      evento.target.value = null;
    }
  }
}