import { Component, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';
import packageInfo from '../../../package.json';

declare var bootstrap: any;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <nav class="navbar navbar-expand-lg bg-body border-bottom px-5 py-3 d-flex justify-content-between align-items-center shadow-sm z-1" style="min-height: 70px;">
      <div class="d-flex align-items-center">
        <button class="btn btn-link text-body p-0 me-3 d-flex align-items-center" (click)="toggleSidebar.emit()" title="Menú">
          <i class="bi bi-list fs-3"></i>
        </button>
        <h4 class="mb-0 fw-bold text-body-emphasis">Gestión de Soporte Técnico</h4>
      </div>
      <div class="d-flex flex-row align-items-center gap-4">
        
        <button class="btn btn-outline-secondary rounded-circle d-flex p-2 border-0 shadow-sm transition" (click)="toggleTheme()" title="Cambiar Tema" style="background: var(--bs-tertiary-bg);">
          <i class="bi fs-5 text-body" [ngClass]="isDarkTheme ? 'bi-sun-fill' : 'bi-moon-stars-fill'"></i>
        </button>

        <div class="dropdown">
          <div class="d-flex align-items-center p-1 pe-3 bg-secondary-subtle rounded-pill border dropdown-toggle" style="cursor: pointer;" data-bs-toggle="dropdown">
            <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 38px; height: 38px;">
              <span class="fw-bold text-white">{{ (auth.currentUser?.name | slice:0:1) || 'A' }}</span>
            </div>
            <div class="text-start me-3 d-none d-md-block" style="line-height:1.2;">
              <div class="fw-bold text-body">{{ auth.currentUser?.name }}</div>
              <div class="badge rounded-pill text-bg-warning" style="font-size: 0.65rem;">
                Administrador
              </div>
            </div>
            <i class="bi bi-chevron-down text-muted small"></i>
          </div>
          <ul class="dropdown-menu dropdown-menu-end shadow border-0 p-2 mt-2">
            <li>
              <a class="dropdown-item rounded-2 py-2 d-flex align-items-center" href="javascript:void(0)" (click)="openProfileModal()">
                <i class="bi bi-person-gear me-2"></i> Ajustes de Perfil
              </a>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li>
              <a class="dropdown-item rounded-2 py-2 text-danger d-flex align-items-center" href="javascript:void(0)" (click)="logout()">
                <i class="bi bi-box-arrow-right me-2"></i> Cerrar Sesión
              </a>
            </li>
            <li><hr class="dropdown-divider"></li>
            <li class="px-3 py-1 mt-1">
              <small class="text-muted d-block text-center font-monospace" style="font-size: 0.7rem;">v{{version}}</small>
            </li>
          </ul>
        </div>

      </div>
    </nav>

    <!-- Modal de Perfil en el Menú -->
    <div class="modal fade" #profileModal tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 400px;">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header bg-dark text-white px-4">
            <h5 class="modal-title fw-bold">Mi Perfil</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label fw-bold text-secondary">Usuario</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" [(ngModel)]="newUsername">
                <span class="input-group-text small text-muted">@comasw.com</span>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fw-bold text-secondary">Nueva Contraseña</label>
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-lock"></i></span>
                <input type="password" class="form-control" [(ngModel)]="newPassword" placeholder="Dejar en blanco para no cambiar">
              </div>
            </div>
            
            <div *ngIf="profileError" class="alert alert-danger py-2 small border-0 shadow-sm">{{profileError}}</div>
            <div *ngIf="profileSuccess" class="alert alert-success py-2 small border-0 shadow-sm">{{profileSuccess}}</div>
          </div>
          <div class="modal-footer border-0 pt-0">
            <button class="btn btn-primary w-100 fw-bold rounded-pill py-2 shadow-sm" (click)="saveProfile()">Actualizar Datos</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  @ViewChild('profileModal') profileModalRef!: ElementRef;
  
  isDarkTheme = false;
  profileModalInstance: any;
  version = packageInfo.version;

  // Profile data
  newUsername = '';
  newPassword = '';
  profileSuccess = '';
  profileError = '';

  constructor(public auth: AuthService, private router: Router) {
    if (document.documentElement.getAttribute('data-bs-theme') === 'dark') {
      this.isDarkTheme = true;
    }
  }

  toggleTheme() {
    this.isDarkTheme = !this.isDarkTheme;
    document.documentElement.setAttribute('data-bs-theme', this.isDarkTheme ? 'dark' : 'light');
  }

  openProfileModal() {
    if (!this.profileModalInstance) {
      this.profileModalInstance = new bootstrap.Modal(this.profileModalRef.nativeElement);
    }
    this.newUsername = this.auth.currentUser?.username.split('@')[0] || '';
    this.newPassword = '';
    this.profileSuccess = '';
    this.profileError = '';
    this.profileModalInstance.show();
  }

  async saveProfile() {
    this.profileError = '';
    this.profileSuccess = '';
    if (!this.newUsername) {
      this.profileError = 'El usuario no puede estar vacío';
      return;
    }
    if (this.newPassword && !/^(?=.*[A-Z])(?=.*[0-9])(?=.{8,}).*$/.test(this.newPassword)) {
      this.profileError = 'La contraseña debe tener 8 caracteres, 1 mayúscula y 1 número.';
      return;
    }
    try {
      await this.auth.updateUser(this.auth.currentUser!.id, this.newUsername, this.newPassword || undefined);
      this.profileSuccess = 'Perfil actualizado con éxito';
      setTimeout(() => this.profileModalInstance?.hide(), 1500);
    } catch (e: any) {
      this.profileError = e.message;
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
