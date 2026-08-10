import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ServicioTickets, ServicioCatalogos,
  ServicioAutenticacion, ServicioDialogo
} from '../../core/services';
import { Ticket, Sitio, Area } from '../../core/models';
import { UtilidadesFecha } from '../../core/utils/utilidades-fecha';



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

  /** Mensaje de error a mostrar DENTRO del modal de ticket (evita el problema
   *  de apilamiento: un <dialog> nativo abierto (top layer) tapa cualquier
   *  modal de Bootstrap externo, incluida ServicioDialogo.alerta()). */
  mensajeErrorModal = '';

  /** Número de la semana ISO seleccionada en el filtro */
  semanaSeleccionada: number = 1;

  /** Año ISO correspondiente a la semana seleccionada en el filtro */
  anioSeleccionado: number = new Date().getFullYear();

  /** Número de la semana ISO real (la del día de hoy) */
  semanaActual: number = 1;

  /** Año ISO real (el del día de hoy) */
  anioActual: number = new Date().getFullYear();

  /** Referencia al elemento HTML del modal nativo */
  @ViewChild('ticketModal') referenciaModalTicket!: ElementRef<HTMLDialogElement>;

  /**
   * Constructor del componente.
   *
   * @param servicioTickets       - Servicio para CRUD y consulta de tickets.
   * @param servicioCatalogos     - Servicio que provee los catálogos de sitios y áreas.
   * @param servicioDialogo       - Servicio para mostrar alertas, confirmaciones y el cargador global.
   * @param fb                    - Constructor de formularios reactivos de Angular.
   * @param auth                  - Servicio de autenticación expuesto público para uso desde la plantilla.
   */
  constructor(
    private readonly servicioTickets: ServicioTickets,
    private readonly servicioCatalogos: ServicioCatalogos,
    private readonly servicioDialogo: ServicioDialogo,
    private readonly fb: FormBuilder,
    public readonly auth: ServicioAutenticacion
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
  ngOnInit() {
    this.inicializarDatos();
  }

  /**
   * Inicialización asíncrona de los datos.
   */
  private async inicializarDatos() {
    const hoy = new Date();
    this.semanaActual = UtilidadesFecha.calcularSemanaISO(hoy);
    this.anioActual = UtilidadesFecha.calcularAnioISO(hoy);
    this.semanaSeleccionada = this.semanaActual;
    this.anioSeleccionado = this.anioActual;
    await this.cargarTickets();
    await this.cargarCatalogos();

    // Si no hay tickets en la semana+año actual pero hay tickets en general,
    // saltar automáticamente a la semana del ticket más reciente (por
    // fechaAsignacion). Antes tomaba el `semana` máximo de TODOS los tickets
    // sin mirar el año — con datos de varios años migrados desde Firebase,
    // eso podía mezclar "semana 50 de 2023" con "semana 5 de 2026" y saltar
    // a una combinación semana/año que no corresponde a ningún dato real.
    if (this.ticketsFiltrados.length === 0 && this.tickets.length > 0) {
      const masReciente = [...this.tickets].sort((a, b) =>
        (b.fechaAsignacion || '').localeCompare(a.fechaAsignacion || '')
      )[0];
      if (masReciente.semana !== this.semanaSeleccionada || masReciente.anioISO !== this.anioSeleccionado) {
        this.semanaSeleccionada = masReciente.semana;
        this.anioSeleccionado = masReciente.anioISO ?? this.anioSeleccionado;
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
   * Retrocede una semana en el filtro (cruza al año anterior si corresponde)
   * y vuelve a aplicar los filtros.
   */
  semanaAnterior() {
    this.cambiarSemana(-1);
  }

  /**
   * Avanza una semana en el filtro (cruza al año siguiente si corresponde)
   * y vuelve a aplicar los filtros.
   */
  semanaSiguiente() {
    this.cambiarSemana(1);
  }

  /**
   * Reposiciona el filtro en la semana+año ISO actual y refresca el listado.
   */
  irASemanaActual() {
    this.semanaSeleccionada = this.semanaActual;
    this.anioSeleccionado = this.anioActual;
    this.aplicarFiltros();
  }

  /**
   * Desplaza la semana+año seleccionados sumando/restando semanas completas
   * sobre una fecha real, en vez de incrementar el número de semana a secas
   * (que no puede cruzar el borde de fin/inicio de año correctamente). Mismo
   * patrón que `TableroComponent.cambiarSemana`.
   *
   * @param desplazamiento - Número de semanas a sumar (positivo) o restar (negativo).
   */
  private cambiarSemana(desplazamiento: number) {
    const fecha = this.obtenerFechaDesdeSemana(this.semanaSeleccionada, this.anioSeleccionado);
    fecha.setDate(fecha.getDate() + (desplazamiento * 7));
    const semanaIso = this.calcularSemanaYAnio(fecha);
    this.semanaSeleccionada = semanaIso.week;
    this.anioSeleccionado = semanaIso.year;
    this.aplicarFiltros();
  }

  /**
   * Calcula semana Y año ISO de una fecha (a diferencia de `calcularSemanaIso`,
   * que solo devuelve el número de semana — usado en el resto del componente
   * para autocompletar el formulario, donde el año no hace falta).
   */
  private calcularSemanaYAnio(fecha: Date): { week: number, year: number } {
    return {
      week: UtilidadesFecha.calcularSemanaISO(fecha),
      year: UtilidadesFecha.calcularAnioISO(fecha)
    };
  }

  /**
   * Obtiene la fecha del lunes correspondiente al inicio de una semana ISO.
   * Copiado de `TableroComponent` para mantener la navegación semana/año
   * consistente entre ambas pantallas.
   */
  private obtenerFechaDesdeSemana(semana: number, anio: number): Date {
    const fechaSimple = new Date(anio, 0, 1 + (semana - 1) * 7);
    const diaDeLaSemana = fechaSimple.getDay();
    const inicioSemanaIso = fechaSimple;
    if (diaDeLaSemana <= 4) {
      inicioSemanaIso.setDate(fechaSimple.getDate() - fechaSimple.getDay() + 1);
    } else {
      inicioSemanaIso.setDate(fechaSimple.getDate() + 8 - fechaSimple.getDay());
    }
    return inicioSemanaIso;
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
      fechaInicioSolucion: [''],
      horaInicioSolucion: [''],
      semanaInicioSolucion: [{ value: '', disabled: true }],
      fechaCierre: [''],
      horaCierre: [''],
      semanaCierre: [{ value: '', disabled: true }],
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
        const fechaLocal = new Date(anio, mes - 1, dia);
        this.formularioTicket.patchValue({ semana: this.calcularSemanaIso(fechaLocal) }, { emitEvent: false });
      }
    });

    // Auto-calcular semana de inicio de solución
    this.formularioTicket.get('fechaInicioSolucion')?.valueChanges.subscribe(valor => {
      if (valor) {
        const [anio, mes, dia] = valor.split('-').map(Number);
        const fechaLocal = new Date(anio, mes - 1, dia);
        this.formularioTicket.patchValue({ semanaInicioSolucion: this.calcularSemanaIso(fechaLocal) }, { emitEvent: false });
      } else {
        this.formularioTicket.patchValue({ semanaInicioSolucion: '' }, { emitEvent: false });
      }
    });

    // Auto-calcular semana de cierre
    this.formularioTicket.get('fechaCierre')?.valueChanges.subscribe(valor => {
      if (valor) {
        const [anio, mes, dia] = valor.split('-').map(Number);
        const fechaLocal = new Date(anio, mes - 1, dia);
        this.formularioTicket.patchValue({ semanaCierre: this.calcularSemanaIso(fechaLocal) }, { emitEvent: false });
      } else {
        this.formularioTicket.patchValue({ semanaCierre: '' }, { emitEvent: false });
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
    const textoBuscado = this.textoBusqueda.toLowerCase();

    this.ticketsFiltrados = this.tickets.filter(ticket => {
      // Coincidencia por texto: busca el término en cualquier propiedad del ticket
      const coincideTexto = Object.entries(ticket).some(([key, valor]) => {
        if (valor === undefined || valor === null) return false;
        return String(valor).toLowerCase().includes(textoBuscado);
      });

      // Coincidencia por estado: si no hay filtro, todos pasan
      const coincideEstado = !this.filtroEstado || ticket.estado === this.filtroEstado;

      // Coincidencia por semana ISO seleccionada — DEBE incluir el año: sin
      // esto, un ticket de otro año con el mismo número de semana (ej. semana
      // 32 de 2025 y semana 32 de 2026) se contaba de más acá, mientras que
      // el Tablero (que sí filtra por semana+año) mostraba el número correcto.
      const coincideSemana = ticket.semana === this.semanaSeleccionada
        && ticket.anioISO === this.anioSeleccionado;

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
    this.mensajeErrorModal = '';
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
        estado: 'Abierto',
        estaAsignado: false,
        esRfc: false,
        fechaAsignacion: fechaHoy,
        horaAsignacion: horaTexto,
        semana: semana,
        fechaInicioSolucion: '',
        horaInicioSolucion: '',
        semanaInicioSolucion: '',
        fechaCierre: '',
        horaCierre: '',
        semanaCierre: '',
        sitio: '',
        areaAfectada: ''
      });
    }

    this.referenciaModalTicket.nativeElement.showModal();
  }

  /**
   * Cierra el modal de tickets si existe la instancia.
   */
  cerrarModal() {
    this.referenciaModalTicket.nativeElement.close();
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
    const valoresFormulario = this.formularioTicket.getRawValue();
    this.mensajeErrorModal = '';

    if (this.modoEdicion && this.idEdicionActual) {
      await this.servicioTickets.actualizarTicket(this.idEdicionActual, valoresFormulario);
    } else {
      // 🚨 Validar que el número de ticket no exista para este usuario
      const ticketExistente = await this.servicioTickets.obtenerTicketPorNumero(valoresFormulario.numeroTicket);
      if (ticketExistente) {
        // Mensaje inline dentro del propio modal, no un diálogo aparte: el
        // <dialog> nativo del modal de ticket vive en el "top layer" del
        // navegador y ningún modal de Bootstrap externo (ServicioDialogo)
        // puede aparecer por encima de eso, sin importar su z-index.
        this.mensajeErrorModal = `Ya existe un ticket con el número ${valoresFormulario.numeroTicket}. Si deseas modificarlo, búscalo en la lista y selecciona editar.`;
        return;
      }
      await this.servicioTickets.agregarTicket(valoresFormulario as Ticket);
    }

    this.cerrarModal();
    this.cargarTickets();
  }

  // ---------------------------------------------------------------------------
  // Acciones rápidas (sin modal)
  // ---------------------------------------------------------------------------

  private fechaHoyStr(): string {
    const h = new Date();
    return `${h.getFullYear()}-${(h.getMonth() + 1).toString().padStart(2, '0')}-${h.getDate().toString().padStart(2, '0')}`;
  }

  private horaAhoraStr(): string {
    return new Date().toTimeString().slice(0, 5);
  }

  async iniciarSolucion(ticket: Ticket) {
    const ahora = new Date();
    await this.servicioTickets.actualizarTicket(ticket.id!, {
      estado: 'En Progreso',
      fechaInicioSolucion: this.fechaHoyStr(),
      horaInicioSolucion: this.horaAhoraStr(),
      semanaInicioSolucion: this.calcularSemanaIso(ahora)
    });
    this.cargarTickets();
  }

  async pausarTicket(ticket: Ticket) {
    await this.servicioTickets.actualizarTicket(ticket.id!, { estado: 'Pausado' });
    this.cargarTickets();
  }

  async reanudarTicket(ticket: Ticket) {
    await this.servicioTickets.actualizarTicket(ticket.id!, { estado: 'En Progreso' });
    this.cargarTickets();
  }

  async cerrarTicketRapido(ticket: Ticket) {
    const confirmado = await this.servicioDialogo.confirmar({
      titulo: 'Cerrar Ticket',
      mensaje: `¿Confirmas el cierre del ticket #${ticket.numeroTicket}? Se registrará la hora actual.`,
      tipo: 'success',
      textoConfirmar: 'Cerrar Ahora'
    });
    if (!confirmado) return;
    const ahora = new Date();
    await this.servicioTickets.actualizarTicket(ticket.id!, {
      estado: 'Cerrado',
      fechaCierre: this.fechaHoyStr(),
      horaCierre: this.horaAhoraStr(),
      semanaCierre: this.calcularSemanaIso(ahora)
    });
    this.cargarTickets();
  }

  async reabrirTicket(ticket: Ticket) {
    const confirmado = await this.servicioDialogo.confirmar({
      titulo: 'Reabrir Ticket',
      mensaje: `¿Reabres el ticket #${ticket.numeroTicket}? Se borrarán los datos de cierre y el tiempo acumulado.`,
      tipo: 'warning',
      textoConfirmar: 'Reabrir'
    });
    if (!confirmado) return;
    await this.servicioTickets.actualizarTicket(ticket.id!, {
      estado: 'Abierto',
      fechaCierre: null,
      horaCierre: null,
      semanaCierre: null,
      fechaInicioSolucion: null,
      horaInicioSolucion: null,
      semanaInicioSolucion: null,
      tiempoSolucionMins: null,
      tiempoPausaMins: 0,
      ultimaPausaInicio: null
    });
    this.cargarTickets();
  }

  /**
   * Elimina un ticket previa confirmación del usuario.
   *
   * @param id - Identificador del ticket a eliminar.
   */
  async eliminarTicket(id?: string) {
    if (!id) return;

    const confirmado = await this.servicioDialogo.confirmar({
      titulo: 'Eliminar Ticket',
      mensaje: '¿Estás seguro de eliminar este ticket?',
      tipo: 'danger',
      textoConfirmar: 'Eliminar'
    });
    if (!confirmado) return;

    try {
      await this.servicioTickets.eliminarTicket(id);
      await this.cargarTickets();
    } catch (error) {
      // Antes: sin try/catch, un fallo del DELETE (ej. sesión vencida a mitad
      // de la operación) dejaba el ticket visualmente eliminado en el
      // navegador sin que realmente se hubiera borrado en el servidor.
      await this.servicioDialogo.alerta({
        titulo: 'No se pudo eliminar',
        mensaje: 'El ticket no pudo eliminarse. Verifica tu conexión o vuelve a intentarlo.',
        tipo: 'danger'
      });
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
    this.servicioDialogo.mostrarCargador(`Exportando tickets de la Semana ${this.semanaSeleccionada} - ${this.anioSeleccionado}...`);
    try {
      await this.servicioTickets.exportarAExcel(this.semanaSeleccionada, this.anioSeleccionado);
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
   * @param evento - Evento de cambio del input file.
   */
  async alCambiarArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
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
      input.value = '';
    }
  }
}