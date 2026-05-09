import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ServicioTickets, ServicioDialogo } from '../../core/services';
import { EstadisticasTicket } from '../../core/models';
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
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary-subtle">
      <div>
        <h2 class="fw-bold mb-1 text-body-emphasis d-flex align-items-center">
          <i class="bi bi-speedometer2 text-primary me-2"></i>
          Tablero
        </h2>
        <p class="text-muted mb-0">Semana {{semanaSeleccionada}}, {{anioSeleccionado}}</p>
      </div>
      
      <div class="d-flex align-items-center gap-3">
        <div class="d-flex align-items-center justify-content-center bg-body-tertiary border rounded-3 p-1 shadow-sm">
          <button class="btn btn-sm btn-light border-0 rounded-2" (click)="cambiarSemana(-1)" title="Semana Anterior">
            <i class="bi bi-chevron-left"></i>
          </button>
          <div class="flex-grow-1 text-center px-2">
            <span class="fw-bold text-primary small text-uppercase" style="letter-spacing: 0.5px;">Semana {{ semanaSeleccionada }}</span>
            <span *ngIf="semanaSeleccionada === semanaActual && anioSeleccionado === anioActual" class="badge bg-primary ms-2"
              style="font-size: 0.6rem;">ACTUAL</span>
          </div>
          <button class="btn btn-sm btn-light border-0 rounded-2" (click)="cambiarSemana(1)" title="Semana Siguiente">
            <i class="bi bi-chevron-right"></i>
          </button>
          <button *ngIf="semanaSeleccionada !== semanaActual || anioSeleccionado !== anioActual" class="btn btn-sm btn-link text-decoration-none fw-bold p-1 ms-1"
            (click)="irASemanaActual()" style="font-size: 0.75rem;">
            Hoy
          </button>
        </div>
        
        <button class="btn btn-primary px-4 py-2 fw-semibold rounded-pill shadow-sm" (click)="refrescarConCargador()">
          <i class="bi bi-arrow-clockwise me-2"></i> Actualizar
        </button>
      </div>
    </div>

    <div class="row g-4 mb-4" *ngIf="estadisticas">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm h-100 p-4 rounded-4" style="background: linear-gradient(135deg, var(--bs-primary) 0%, rgba(13,110,253,0.8) 100%); color: white;">
          <h6 class="text-uppercase fw-bold mb-3 opacity-75" style="letter-spacing: 0.5px;">Total de Tickets</h6>
          <h1 class="display-3 fw-bolder mb-0 lh-1">{{ estadisticas.total }}</h1>
        </div>
      </div>
      
      <div class="col-md-3">
         <div class="card border-0 shadow-sm h-100 bg-body rounded-4 p-4">
           <h6 class="text-muted text-uppercase fw-bold mb-3" style="letter-spacing: 0.5px;">Abiertos</h6>
           <div class="d-flex align-items-center mb-0 mt-auto">
             <div class="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
               <i class="bi bi-exclamation-circle-fill text-danger fs-4"></i>
             </div>
             <h1 class="fw-bolder mb-0 text-body-emphasis lh-1">{{ estadisticas.porEstado['Abierto'] || 0 }}</h1>
           </div>
         </div>
      </div>

      <div class="col-md-3">
         <div class="card border-0 shadow-sm h-100 bg-body rounded-4 p-4">
           <h6 class="text-muted text-uppercase fw-bold mb-3" style="letter-spacing: 0.5px;">En Progreso</h6>
           <div class="d-flex align-items-center mb-0 mt-auto">
             <div class="bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
               <i class="bi bi-arrow-repeat text-warning fs-3"></i>
             </div>
             <h1 class="fw-bolder mb-0 text-body-emphasis lh-1">{{ estadisticas.porEstado['En Progreso'] || 0 }}</h1>
           </div>
         </div>
      </div>

      <div class="col-md-3">
         <div class="card border-0 shadow-sm h-100 bg-body rounded-4 p-4">
           <h6 class="text-muted text-uppercase fw-bold mb-3" style="letter-spacing: 0.5px;">Promedio de Solución</h6>
           <div class="d-flex flex-column mb-0 mt-auto">
             <div class="d-flex align-items-baseline gap-2">
                <h1 class="fw-bolder mb-0 text-success display-5 lh-1">{{ ((estadisticas.promedioTiempoSolucionMins || 0) / 60).toFixed(1) }}</h1>
                <span class="fs-6 text-muted fw-bold">Horas</span>
             </div>
             <span class="text-success small fw-semibold mt-2"><i class="bi bi-graph-up me-1"></i> Análisis local de tiempos</span>
           </div>
         </div>
      </div>
    </div>

    <!-- Sección de gráficas -->
    <div class="row" *ngIf="estadisticas">
      <div class="col-md-8">
        <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
          <h6 class="text-uppercase fw-bold mb-4" style="letter-spacing: 0.5px;">Tickets Resueltos por Semana (Histórico)</h6>
          <div style="height: 300px;">
            <canvas id="weeklyChart"></canvas>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
          <h6 class="text-uppercase fw-bold mb-4" style="letter-spacing: 0.5px;">Distribución de Estado</h6>
          <div style="height: 300px; position:relative;">
            <canvas id="statusChart"></canvas>
          </div>
        </div>
      </div>
    </div>

    <!-- Sección de tickets recientes -->
    <div class="row pt-4" *ngIf="ticketsRecientes.length > 0">
      <div class="col-12">
        <div class="card border-0 shadow-sm rounded-4 p-4 text-start">
          <div class="d-flex justify-content-between align-items-center mb-4">
             <h6 class="text-uppercase fw-bold mb-0" style="letter-spacing: 0.5px;">Tickets Recientes</h6>
             <a routerLink="/tickets" class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold">Ver todos</a>
          </div>
          <div class="table-responsive custom-scrollbar">
            <table class="table table-hover align-middle mb-0">
              <thead class="border-bottom text-secondary">
                <tr>
                  <th class="fw-semibold px-3 py-3">TICKET</th>
                  <th class="fw-semibold py-3">ÁREA AFECTADA</th>
                  <th class="fw-semibold py-3">SITIO</th>
                  <th class="fw-semibold py-3">ASIGNACIÓN</th>
                  <th class="fw-semibold py-3">ESTADO</th>
                </tr>
              </thead>
              <tbody class="border-top-0">
                <tr *ngFor="let ticket of ticketsRecientes">
                  <td class="px-3 py-3"><span class="text-primary fw-bold font-monospace">{{ ticket.numeroTicket }}</span></td>
                  <td>{{ ticket.areaAfectada }}</td>
                  <td><span class="text-muted"><i class="bi bi-geo-alt me-1"></i>{{ ticket.sitio }}</span></td>
                  <td>{{ ticket.fechaAsignacion }}</td>
                  <td>
                    <span class="badge rounded-pill px-3 py-2" [ngClass]="{'bg-danger': ticket.estado === 'Abierto', 'bg-warning text-dark': ticket.estado === 'En Progreso', 'bg-success': ticket.estado === 'Cerrado'}">{{ticket.estado}}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
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
    private servicioTickets: ServicioTickets,
    private servicioDialogo: ServicioDialogo
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
    this.estadisticas = await this.servicioTickets.obtenerEstadisticas(this.semanaSeleccionada, this.anioSeleccionado);
    const todosLosTickets = await this.servicioTickets.obtenerTickets();

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
    const fechaUtc = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const numeroDia = fechaUtc.getUTCDay() || 7;
    fechaUtc.setUTCDate(fechaUtc.getUTCDate() + 4 - numeroDia);
    const inicioAnio = new Date(Date.UTC(fechaUtc.getUTCFullYear(), 0, 1));
    const semana = Math.ceil((((fechaUtc.getTime() - inicioAnio.getTime()) / 86400000) + 1) / 7);
    return { week: semana, year: fechaUtc.getUTCFullYear() };
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
        const fechaAsignacion = new Date(ticket.fechaAsignacion!);
        if (isNaN(fechaAsignacion.getTime())) return;

        // Calcular semana ISO de la fecha de asignación
        const fecha = new Date(fechaAsignacion.getTime());
        fecha.setHours(0, 0, 0, 0);
        fecha.setDate(fecha.getDate() + 3 - (fecha.getDay() + 6) % 7);
        const primeraSemana = new Date(fecha.getFullYear(), 0, 4);
        const numeroSemana = 1 + Math.round(
          ((fecha.getTime() - primeraSemana.getTime()) / 86400000 - 3 + (primeraSemana.getDay() + 6) % 7) / 7
        );

        const etiqueta = `Sem ${numeroSemana} - ${fecha.getFullYear()}`;
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
        if (anioA !== anioB) return parseInt(anioA) - parseInt(anioB);
        return parseInt(semA) - parseInt(semB);
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
            labels: ['Abierto', 'En Progreso', 'Cerrado'],
            datasets: [{
              data: [
                this.estadisticas?.porEstado['Abierto'] || 0,
                this.estadisticas?.porEstado['En Progreso'] || 0,
                this.estadisticas?.porEstado['Cerrado'] || 0
              ],
              backgroundColor: ['#dc3545', '#ffc107', '#198754'],
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