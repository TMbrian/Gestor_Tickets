import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ServicioTickets, ServicioDialogo } from '../../core/services';
import { EstadisticasTicket } from '../../core/models';
import { UtilidadesFecha } from '../../core/utils/utilidades-fecha';
import Chart from 'chart.js/auto';

/**
 * Componente del Tablero principal.
 *
 * Muestra una vista resumen del estado de los tickets de soporte filtrados
 * por semana ISO: tarjetas con totales, gráfica histórica de tickets resueltos,
 * gráfica de distribución por estado y un listado de tickets recientes.
 *
 * Permite navegar entre semanas, regresar a la semana actual y refrescar
 * los datos manualmente mostrando un loader durante la carga.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './tablero.component.html',
  styleUrls: ['./tablero.component.scss']
})
export class DashboardComponent implements OnInit {
  /** Estadísticas agregadas de tickets para la semana y año seleccionados */
  estadisticas: EstadisticasTicket | null = null;

  /** Instancia de la gráfica de barras y línea (tickets resueltos por semana) */
  graficaSemanal: any = null;

  /** Instancia de la gráfica tipo dona (distribución por estado) */
  graficaEstado: any = null;

  /** Listado de los tickets más recientes mostrados en la tabla inferior */
  ticketsRecientes: any[] = [];

  /** Número de la semana ISO actualmente visualizada en el dashboard */
  semanaSeleccionada: number = 1;

  /** Año ISO correspondiente a la semana visualizada */
  anioSeleccionado: number = new Date().getFullYear();

  /** Número de la semana ISO real (la del día de hoy) */
  semanaActual: number = 1;

  /** Año ISO real (el del día de hoy) */
  anioActual: number = new Date().getFullYear();

  /**
   * Constructor del componente.
   *
   * @param ServicioTickets - Servicio que provee tickets y estadísticas agregadas.
   * @param servicioDialogo - Servicio para mostrar diálogos y el loader global.
   */
  constructor(
    private readonly servicioTickets: ServicioTickets,
    private readonly servicioDialogo: ServicioDialogo
  ) { }

  /**
   * Hook del ciclo de vida que se ejecuta al inicializar el componente.
   *
   * Calcula la semana ISO actual a partir de la fecha de hoy, la fija como
   * semana seleccionada y dispara la carga inicial de estadísticas.
   */
  ngOnInit() {
    const fechaActual = new Date();
    const semanaIso = this.calcularSemanaIso(fechaActual);
    this.semanaActual = semanaIso.week;
    this.anioActual = semanaIso.year;
    this.semanaSeleccionada = this.semanaActual;
    this.anioSeleccionado = this.anioActual;
    this.cargarEstadisticas();
  }

  /**
   * Carga las estadísticas de la semana seleccionada y el listado completo
   * de tickets, calcula los más recientes y vuelve a renderizar las gráficas.
   *
   * @returns Promise<void> que se resuelve cuando todos los datos fueron cargados.
   */
  async cargarEstadisticas() {
    // Un solo fetch: antes se llamaba a obtenerEstadisticas() (que internamente
    // descarga TODO el historial) y después, por separado, a obtenerTickets()
    // otra vez para las gráficas — el historial completo viajaba dos veces por
    // cada render y por cada clic de semana anterior/siguiente.
    const todosLosTickets = await this.servicioTickets.obtenerTickets();
    this.estadisticas = this.servicioTickets.calcularEstadisticas(todosLosTickets, this.semanaSeleccionada, this.anioSeleccionado);

    // Determinar tickets recientes (orden descendente por creadoEn)
    this.ticketsRecientes = [...todosLosTickets]
      .sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0))
      .slice(0, 5);

    this.renderizarGraficas(todosLosTickets);
  }

  /**
   * Refresca los datos del dashboard mostrando el loader global.
   *
   * Garantiza que el loader sea visible al menos 3 segundos para evitar
   * parpadeos cuando la carga es instantánea.
   *
   * @returns Promise<void> que se resuelve al ocultar el loader.
   */
  async refrescarConCargador() {
    this.servicioDialogo.mostrarCargador('Actualizando datos del Tablero...');
    const tiempoInicio = Date.now();
    try {
      await this.cargarEstadisticas();
      const tiempoTranscurrido = Date.now() - tiempoInicio;
      if (tiempoTranscurrido < 3000) {
        await new Promise(resolver => setTimeout(resolver, 3000 - tiempoTranscurrido));
      }
    } finally {
      this.servicioDialogo.ocultarCargador();
    }
  }

  /**
   * Cambia la semana visualizada desplazando el calendario.
   *
   * @param desplazamiento - Número de semanas a sumar (positivo) o restar (negativo).
   */
  cambiarSemana(desplazamiento: number) {
    const fecha = this.obtenerFechaDesdeSemana(this.semanaSeleccionada, this.anioSeleccionado);
    fecha.setDate(fecha.getDate() + (desplazamiento * 7));
    const semanaIso = this.calcularSemanaIso(fecha);
    this.semanaSeleccionada = semanaIso.week;
    this.anioSeleccionado = semanaIso.year;
    this.cargarEstadisticas();
  }

  /**
   * Reposiciona la vista en la semana ISO actual y recarga los datos.
   */
  irASemanaActual() {
    this.semanaSeleccionada = this.semanaActual;
    this.anioSeleccionado = this.anioActual;
    this.cargarEstadisticas();
  }

  /**
   * Calcula el número de semana ISO 8601 y su año correspondiente para una fecha dada.
   *
   * Sigue el algoritmo estándar: la semana 1 es aquella que contiene el primer
   * jueves del año.
   *
   * @param fecha - Fecha de la cual se desea calcular la semana ISO.
   * @returns Objeto con el número de semana ISO y el año al que pertenece.
   */
  private calcularSemanaIso(fecha: Date): { week: number, year: number } {
    return {
      week: UtilidadesFecha.calcularSemanaISO(fecha),
      year: UtilidadesFecha.calcularAnioISO(fecha)
    };
  }

  /**
   * Obtiene la fecha del lunes correspondiente al inicio de una semana ISO.
   *
   * @param semana - Número de semana ISO (1-53).
   * @param anio - Año al que pertenece la semana.
   * @returns Fecha del primer día (lunes) de esa semana.
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
   * Renderiza ambas gráficas del dashboard: la histórica semanal de tickets
   * cerrados y la dona de distribución por estado.
   *
   * Se ejecuta dentro de un `setTimeout` para garantizar que los elementos
   * `<canvas>` ya estén presentes en el DOM tras el ciclo de detección de cambios.
   *
   * @param tickets - Listado completo de tickets utilizado para construir las series.
   */
  renderizarGraficas(tickets: any[]) {
    setTimeout(() => {
      const canvasSemanal = document.getElementById('weeklyChart') as HTMLCanvasElement;
      if (!canvasSemanal) return;

      // Destruir la gráfica previa para evitar fugas de memoria al re-renderizar
      if (this.graficaSemanal) {
        this.graficaSemanal.destroy();
      }

      // Filtrar únicamente tickets cerrados con fecha de asignación válida
      const ticketsCerrados = tickets.filter(t => t.estado === 'Cerrado' && t.fechaAsignacion);

      /** Acumulador de conteos y minutos totales por etiqueta de semana */
      const semanas: any = {};

      ticketsCerrados.forEach(ticket => {
        // parsearFechaLocal (no new Date() directo): mismo motivo que en
        // ServicioTickets.obtenerEstadisticas — evita que new Date('YYYY-MM-DD')
        // (interpretado como UTC) oculte un sábado/domingo real y rompa el
        // desplazamiento de fin de semana de ADR-0001.
        const fechaAsignacion = UtilidadesFecha.parsearFechaLocal(ticket.fechaAsignacion);
        if (Number.isNaN(fechaAsignacion.getTime())) return;

        // Calcular semana y año ISO de la fecha de asignación (ADR-0001, fuente canónica)
        const numeroSemana = UtilidadesFecha.calcularSemanaISO(fechaAsignacion);
        const anioRef = UtilidadesFecha.calcularAnioISO(fechaAsignacion);

        const etiqueta = `Sem ${numeroSemana} - ${anioRef}`;
        if (!semanas[etiqueta]) {
          semanas[etiqueta] = { count: 0, totalMins: 0 };
        }
        semanas[etiqueta].count += 1;
        semanas[etiqueta].totalMins += (ticket.tiempoSolucionMins || 0);
      });

      // Ordenar etiquetas cronológicamente: primero por año y luego por semana
      const etiquetas = Object.keys(semanas).sort((a, b) => {
        const [semA, anioA] = a.replace('Sem ', '').split(' - ');
        const [semB, anioB] = b.replace('Sem ', '').split(' - ');
        if (anioA !== anioB) return Number.parseInt(anioA, 10) - Number.parseInt(anioB, 10);
        return Number.parseInt(semA, 10) - Number.parseInt(semB, 10);
      });

      const datosConteo = etiquetas.map(etiqueta => semanas[etiqueta].count);
      const datosHoras = etiquetas.map(etiqueta => (semanas[etiqueta].totalMins / 60).toFixed(1));

      this.graficaSemanal = new Chart(canvasSemanal, {
        type: 'bar',
        data: {
          labels: etiquetas.length > 0 ? etiquetas : ['Semana Actual'],
          datasets: [
            {
              type: 'line',
              label: 'Total de Horas',
              data: datosHoras.length > 0 ? datosHoras : [0] as any,
              borderColor: '#ffc107',
              backgroundColor: '#ffc107',
              borderWidth: 3,
              tension: 0.3,
              yAxisID: 'y1'
            },
            {
              type: 'bar',
              label: 'Tickets Solucionados',
              data: datosConteo.length > 0 ? datosConteo : [0],
              backgroundColor: 'rgba(13, 110, 253, 0.7)',
              borderRadius: 4,
              yAxisID: 'y'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: true, position: 'top' } },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              beginAtZero: true,
              ticks: { stepSize: 1 },
              title: { display: true, text: 'Tickets' }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              beginAtZero: true,
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Horas' }
            }
          }
        }
      });

      // Gráfica de distribución por estado (dona)
      const canvasEstado = document.getElementById('statusChart') as HTMLCanvasElement;
      if (canvasEstado) {
        if (this.graficaEstado) this.graficaEstado.destroy();
        this.graficaEstado = new Chart(canvasEstado, {
          type: 'doughnut',
          data: {
            labels: ['Abierto', 'En Progreso', 'Pausado', 'Cerrado'],
            datasets: [{
              data: [
                this.estadisticas?.porEstado['Abierto'] || 0,
                this.estadisticas?.porEstado['En Progreso'] || 0,
                this.estadisticas?.porEstado['Pausado'] || 0,
                this.estadisticas?.porEstado['Cerrado'] || 0
              ],
              backgroundColor: ['#dc3545', '#ffc107', '#0dcaf0', '#198754'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }

    }, 100);
  }
}