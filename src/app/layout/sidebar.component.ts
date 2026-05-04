import { Component, Input, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import { ThemeService, ThemeMode } from '../core/services/theme.service';
import { DialogService } from '../core/services/dialog.service';
import packageInfo from '../../../package.json';

declare var bootstrap: any;

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="d-flex flex-column h-100 shadow-lg border-end overflow-hidden" 
         style="background: linear-gradient(180deg, #1a1d20 0%, #000000 100%); color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: {{ isCollapsed ? '80px' : '280px' }}">
      
      <!-- Brand Header -->
      <div class="p-4 mb-2 border-bottom border-secondary border-opacity-25">
        <a href="/" class="d-flex align-items-center text-white text-decoration-none" [ngClass]="isCollapsed ? 'justify-content-center' : ''">
          <div class="bg-primary bg-gradient rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="min-width: 42px; height: 42px;">
            <i class="bi bi-layers-fill fs-4 text-white"></i>
          </div>
          <span class="fs-4 fw-bold tracking-tight ms-3 text-nowrap" *ngIf="!isCollapsed">ITTickets</span>
        </a>
      </div>
      
      <!-- Main Navigation -->
      <div class="flex-grow-1 px-3 py-4 custom-scrollbar overflow-auto">
        <div class="text-uppercase text-secondary fw-bold mb-3 d-flex align-items-center" style="font-size: 0.7rem; letter-spacing: 1.5px;" *ngIf="!isCollapsed">
          <span class="me-2">Navegación</span>
          <div class="flex-grow-1 border-top border-secondary border-opacity-25"></div>
        </div>
        
        <ul class="nav nav-pills flex-column gap-2 mb-4">
          <li class="nav-item">
            <a routerLink="/dashboard" routerLinkActive="active" class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 py-3" [ngClass]="isCollapsed ? 'justify-content-center px-0' : 'px-3'" title="Dashboard">
              <i class="bi bi-grid-1x2-fill fs-5" [ngClass]="!isCollapsed ? 'me-3' : 'me-0'"></i> 
              <span class="fw-medium" *ngIf="!isCollapsed">Dashboard</span>
            </a>
          </li>
          <li class="nav-item">
            <a routerLink="/tickets" routerLinkActive="active" class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 py-3" [ngClass]="isCollapsed ? 'justify-content-center px-0' : 'px-3'" title="Lista de Tickets">
              <i class="bi bi-table fs-5" [ngClass]="!isCollapsed ? 'me-3' : 'me-0'"></i> 
              <span class="fw-medium" *ngIf="!isCollapsed">Historial de Tickets</span>
            </a>
          </li>
        </ul>

        <!-- Configuracion Section -->
        <div class="text-uppercase text-secondary fw-bold mb-3 d-flex align-items-center" style="font-size: 0.7rem; letter-spacing: 1.5px;" *ngIf="!isCollapsed">
          <span class="me-2">Personalización</span>
          <div class="flex-grow-1 border-top border-secondary border-opacity-25"></div>
        </div>

        <ul class="nav nav-pills flex-column gap-2">
          <!-- Profile Link -->
          <li class="nav-item">
            <a href="javascript:void(0)" data-bs-toggle="modal" data-bs-target="#profileModal" (click)="openProfile.emit()" class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 py-3" [ngClass]="isCollapsed ? 'justify-content-center px-0' : 'px-3'" title="Mi Perfil">
              <i class="bi bi-person-circle fs-5" [ngClass]="!isCollapsed ? 'me-3' : 'me-0'"></i> 
              <span class="fw-medium" *ngIf="!isCollapsed">Mi Perfil ({{ auth.currentUser?.name }})</span>
            </a>
          </li>
          
          <!-- Theme Switcher -->
          <li class="nav-item mb-2" *ngIf="!isCollapsed">
             <div class="px-3 pt-2 pb-1">
                <div class="d-flex bg-dark bg-opacity-50 p-1 rounded-pill border border-secondary border-opacity-25">
                  <button class="btn btn-sm flex-fill rounded-pill py-1 border-0 transition" 
                          [class.btn-primary]="themeService.currentTheme === 'light'" 
                          [class.text-white-50]="themeService.currentTheme !== 'light'"
                          (click)="setTheme('light')" title="Modo Claro">
                    <i class="bi bi-sun-fill"></i>
                  </button>
                  <button class="btn btn-sm flex-fill rounded-pill py-1 border-0 transition" 
                          [class.btn-primary]="themeService.currentTheme === 'dark'"
                          [class.text-white-50]="themeService.currentTheme !== 'dark'"
                          (click)="setTheme('dark')" title="Modo Oscuro">
                    <i class="bi bi-moon-stars-fill"></i>
                  </button>
                  <button class="btn btn-sm flex-fill rounded-pill py-1 border-0 transition" 
                          [class.btn-primary]="themeService.currentTheme === 'system'"
                          [class.text-white-50]="themeService.currentTheme !== 'system'"
                          (click)="setTheme('system')" title="Sistema">
                    <i class="bi bi-display"></i>
                  </button>
                </div>
                <div class="text-center mt-1">
                  <small class="text-secondary" style="font-size: 0.6rem;">Tema: {{ themeService.currentTheme | titlecase }}</small>
                </div>
             </div>
          </li>

          <!-- Logout -->
          <li class="nav-item">
            <a href="javascript:void(0)" (click)="logout()" class="nav-link text-danger opacity-75 d-flex align-items-center rounded-3 py-3" [ngClass]="isCollapsed ? 'justify-content-center px-0' : 'px-3'" title="Cerrar Sesión">
              <i class="bi bi-box-arrow-right fs-5" [ngClass]="!isCollapsed ? 'me-3' : 'me-0'"></i> 
              <span class="fw-bold" *ngIf="!isCollapsed">Cerrar Sesión</span>
            </a>
          </li>
        </ul>
        
        <!-- Bottom Info -->
        <div class="mt-5 pt-3 text-center opacity-25 border-top border-secondary border-opacity-10" *ngIf="!isCollapsed">
           <small class="text-white font-monospace d-block" style="font-size: 0.6rem;">versión {{version}}</small>
        </div>
    </div>
  `,
  styles: [`
    .nav-link.active { background-color: var(--bs-primary) !important; color: white !important; opacity: 1 !important; box-shadow: 0 4px 6px rgba(13, 110, 253, 0.3); }
    .nav-link:hover:not(.active) { background-color: rgba(255,255,255,0.1); opacity: 1 !important; }
    .nav-link { transition: all 0.2s ease; }
    .hover-danger:hover { color: #ff4d4d !important; }
    .shadow-inner { box-shadow: inset 0 2px 4px rgba(0,0,0,0.3); }
  `]
})
export class SidebarComponent {
  @Input() isCollapsed = false;
  @Output() openProfile = new EventEmitter<void>();
  version = packageInfo.version;

  constructor(
    public auth: AuthService,
    public themeService: ThemeService,
    private dialogService: DialogService,
    private router: Router
  ) {}

  setTheme(mode: ThemeMode) {
    this.themeService.setTheme(mode);
  }


  async logout() {
    const confirmed = await this.dialogService.confirm({
      title: '¿Cerrar Sesión?',
      message: '¿Estás seguro de que deseas salir de la aplicación?',
      confirmText: 'Aceptar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      this.auth.logout();
      this.router.navigate(['/login']);
    }
  }
}
