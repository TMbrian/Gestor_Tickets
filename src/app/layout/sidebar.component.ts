import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="d-flex flex-column p-4 h-100 shadow-sm border-end" style="background-color: var(--bs-dark); color: white; overflow: hidden;">
      <a href="/" class="d-flex align-items-center mb-4 text-white text-decoration-none" [ngClass]="isCollapsed ? 'justify-content-center px-0' : ''">
        <i class="bi bi-layers-fill fs-3 text-primary" [ngClass]="isCollapsed ? 'me-0' : 'me-3'"></i>
        <span class="fs-4 fw-bold tracking-tight" *ngIf="!isCollapsed">ITTickets</span>
      </a>
      
      <span class="text-uppercase text-secondary fw-bold mb-3 text-center" style="font-size: 0.75rem; letter-spacing: 1px;" *ngIf="!isCollapsed">Menu</span>
      <ul class="nav nav-pills flex-column mb-auto gap-2">
        <li class="nav-item">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 p-3" [ngClass]="isCollapsed ? 'justify-content-center px-0' : ''" title="Dashboard">
            <i class="bi bi-grid-1x2-fill fs-5" [ngClass]="!isCollapsed ? 'me-3' : 'me-0'"></i> <span class="fw-medium text-lg" *ngIf="!isCollapsed">Dashboard</span>
          </a>
        </li>
        <li>
          <a routerLink="/tickets" routerLinkActive="active" class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 p-3" [ngClass]="isCollapsed ? 'justify-content-center px-0' : ''" title="Histórico Excel">
            <i class="bi bi-table fs-5" [ngClass]="!isCollapsed ? 'me-3' : 'me-0'"></i> <span class="fw-medium text-lg" *ngIf="!isCollapsed">Histórico Excel</span>
          </a>
        </li>
      </ul>
      
      <div class="mt-auto bg-black bg-opacity-25 rounded p-3 d-flex align-items-center" [ngClass]="isCollapsed ? 'justify-content-center p-2' : ''">
        <i class="bi bi-hdd-network text-success fs-3" [ngClass]="!isCollapsed ? 'me-3' : 'me-0'" title="Modo Offline"></i>
        <div *ngIf="!isCollapsed">
          <h6 class="mb-0 fw-bold">Modo Offline</h6>
          <small class="text-white-50 d-block" style="font-size: 0.75rem;">Datos locales (DexieDB)</small>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nav-link.active { background-color: var(--bs-primary) !important; color: white !important; opacity: 1 !important; box-shadow: 0 4px 6px rgba(13, 110, 253, 0.2); }
    .nav-link:hover:not(.active) { background-color: rgba(255,255,255,0.05); }
    .nav-link { transition: all 0.2s ease; }
  `]
})
export class SidebarComponent {
  @Input() isCollapsed = false;
}
