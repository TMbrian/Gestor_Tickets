import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TicketService } from '../../core/services/ticket.service';
import { TicketStatistics } from '../../core/models/ticket.model';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary-subtle">
      <div>
        <h2 class="fw-bold mb-1 text-body-emphasis">Dashboard</h2>
        <p class="text-muted mb-0">Resumen y métricas de soporte técnico</p>
      </div>
      <button class="btn btn-outline-primary px-4 py-2 fw-semibold rounded-pill shadow-sm" (click)="loadStats()">
        <i class="bi bi-arrow-clockwise me-2"></i> Actualizar
      </button>
    </div>

    <div class="row g-4 mb-4" *ngIf="stats">
      <div class="col-md-3">
        <div class="card border-0 shadow-sm h-100 p-4 rounded-4" style="background: linear-gradient(135deg, var(--bs-primary) 0%, rgba(13,110,253,0.8) 100%); color: white;">
          <h6 class="text-uppercase fw-bold mb-3 opacity-75" style="letter-spacing: 0.5px;">Total de Tickets</h6>
          <h1 class="display-3 fw-bolder mb-0 lh-1">{{ stats.total }}</h1>
        </div>
      </div>
      
      <div class="col-md-3">
         <div class="card border-0 shadow-sm h-100 bg-body rounded-4 p-4">
           <h6 class="text-muted text-uppercase fw-bold mb-3" style="letter-spacing: 0.5px;">Abiertos</h6>
           <div class="d-flex align-items-center mb-0 mt-auto">
             <div class="bg-danger bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px;">
               <i class="bi bi-exclamation-circle-fill text-danger fs-4"></i>
             </div>
             <h1 class="fw-bolder mb-0 text-body-emphasis lh-1">{{ stats.byStatus['Abierto'] || 0 }}</h1>
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
             <h1 class="fw-bolder mb-0 text-body-emphasis lh-1">{{ stats.byStatus['En Progreso'] || 0 }}</h1>
           </div>
         </div>
      </div>

      <div class="col-md-3">
         <div class="card border-0 shadow-sm h-100 bg-body rounded-4 p-4">
           <h6 class="text-muted text-uppercase fw-bold mb-3" style="letter-spacing: 0.5px;">Promedio de Solución</h6>
           <div class="d-flex flex-column mb-0 mt-auto">
             <div class="d-flex align-items-baseline gap-2">
                <h1 class="fw-bolder mb-0 text-success display-5 lh-1">{{ ((stats.averageSolutionTimeMins || 0) / 60).toFixed(1) }}</h1>
                <span class="fs-6 text-muted fw-bold">Horas</span>
             </div>
             <span class="text-success small fw-semibold mt-2"><i class="bi bi-graph-up me-1"></i> Análisis local de tiempos</span>
           </div>
         </div>
      </div>
    </div>

    <!-- Chart section -->
    <div class="row" *ngIf="stats">
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

    <!-- Recent Tickets section -->
    <div class="row pt-4" *ngIf="recentTickets.length > 0">
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
                <tr *ngFor="let t of recentTickets">
                  <td class="px-3 py-3"><span class="text-primary fw-bold font-monospace">{{ t.ticketNumber }}</span></td>
                  <td>{{ t.affectedArea }}</td>
                  <td><span class="text-muted"><i class="bi bi-geo-alt me-1"></i>{{ t.site }}</span></td>
                  <td>{{ t.assignmentDate }}</td>
                  <td>
                    <span class="badge rounded-pill px-3 py-2" [ngClass]="{'bg-danger': t.status === 'Abierto', 'bg-warning text-dark': t.status === 'En Progreso', 'bg-success': t.status === 'Cerrado'}">{{t.status}}</span>
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
  stats: TicketStatistics | null = null;
  chart: any = null;
  statusChart: any = null;
  recentTickets: any[] = [];

  constructor(private ticketService: TicketService) {}

  ngOnInit() {
    this.loadStats();
  }

  async loadStats() {
    this.stats = await this.ticketService.getStatistics();
    const all = await this.ticketService.getTickets();
    
    // Determine recent tickets (sort by createdAt or id descending)
    this.recentTickets = [...all].sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);

    this.renderChart(all);
  }

  renderChart(tickets: any[]) {
    setTimeout(() => {
      const ctx = document.getElementById('weeklyChart') as HTMLCanvasElement;
      if (!ctx) return;

      if (this.chart) {
        this.chart.destroy();
      }

      const closed = tickets.filter(t => t.status === 'Cerrado' && t.assignmentDate);
      const weeks: any = {};
      closed.forEach(t => {
        const d = new Date(t.assignmentDate!);
        if (isNaN(d.getTime())) return;
        const date = new Date(d.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const week1 = new Date(date.getFullYear(), 0, 4);
        const week = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        const label = `Sem ${week} - ${date.getFullYear()}`;
        if (!weeks[label]) { weeks[label] = { count: 0, totalMins: 0 }; }
        weeks[label].count += 1;
        weeks[label].totalMins += (t.solutionTimeMins || 0);
      });

      const labels = Object.keys(weeks).sort((a,b) => {
         const [semA, yearA] = a.replace('Sem ', '').split(' - ');
         const [semB, yearB] = b.replace('Sem ', '').split(' - ');
         if(yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
         return parseInt(semA) - parseInt(semB);
      });
      const dataCount = labels.map(l => weeks[l].count);
      const dataHours = labels.map(l => (weeks[l].totalMins / 60).toFixed(1));

      this.chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels.length > 0 ? labels : ['Semana Actual'],
          datasets: [
            {
              type: 'line',
              label: 'Total de Horas',
              data: dataHours.length > 0 ? dataHours : [0] as any,
              borderColor: '#ffc107',
              backgroundColor: '#ffc107',
              borderWidth: 3,
              tension: 0.3,
              yAxisID: 'y1'
            },
            {
              type: 'bar',
              label: 'Tickets Solucionados',
              data: dataCount.length > 0 ? dataCount : [0],
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
             y: { type: 'linear', display: true, position: 'left', beginAtZero: true, ticks: { stepSize: 1 }, title: { display: true, text: 'Tickets' } },
             y1: { type: 'linear', display: true, position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'Horas' } }
          }
        }
      });

      // Status Chart
      const ctxStatus = document.getElementById('statusChart') as HTMLCanvasElement;
      if (ctxStatus) {
         if (this.statusChart) this.statusChart.destroy();
         this.statusChart = new Chart(ctxStatus, {
           type: 'doughnut',
           data: {
             labels: ['Abierto', 'En Progreso', 'Cerrado'],
             datasets: [{
               data: [
                 this.stats?.byStatus['Abierto'] || 0,
                 this.stats?.byStatus['En Progreso'] || 0,
                 this.stats?.byStatus['Cerrado'] || 0
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
