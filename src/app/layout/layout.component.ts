import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { NavbarComponent } from './navbar.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog.component';
import { PromptDialogComponent } from '../shared/components/prompt-dialog.component';
import { LoaderDialogComponent } from '../shared/components/loader-dialog.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, NavbarComponent, ConfirmDialogComponent, PromptDialogComponent, LoaderDialogComponent, FormsModule],
  template: `
    <div class="d-flex w-100 custom-vh-100 overflow-hidden bg-body-tertiary">
      <app-sidebar [isCollapsed]="isCollapsed" (openProfile)="onOpenProfile()" class="flex-shrink-0 z-2" style="transition: width 0.3s ease;" [style.width]="isCollapsed ? '88px' : '280px'"></app-sidebar>
      <div class="d-flex flex-column flex-grow-1 overflow-hidden">
        <app-navbar (toggleSidebar)="isCollapsed = !isCollapsed"></app-navbar>
        <main class="flex-grow-1 overflow-auto p-4 p-md-5">
          <div class="container-fluid mx-auto px-0" style="max-width: 1400px;">
             <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
    
    <!-- Global UI Elements -->
    <app-confirm-dialog></app-confirm-dialog>
    <app-prompt-dialog></app-prompt-dialog>
    <app-loader-dialog></app-loader-dialog>

    <!-- Modal de Perfil Global (fuera de contextos limitados de z-index) -->
    <div class="modal fade" id="profileModal" tabindex="-1" aria-hidden="true" style="z-index: 2000;">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 400px;">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header border-bottom-0 px-4">
            <h5 class="modal-title fw-bold text-body-emphasis">Mi Perfil</h5>
            <!-- Botón X eliminado a petición del usuario ya que existe botón Cancelar -->
            <button type="button" id="profileModalCloseBtn" data-bs-dismiss="modal" class="d-none"></button>
          </div>
          <div class="modal-body p-4">
            <div class="mb-3">
              <label class="form-label fw-bold text-secondary">Usuario</label>
              <div class="input-group">
                <span class="input-group-text border-end-0 bg-body"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control border-start-0 border-end-0" [(ngModel)]="newUsername">
                <span class="input-group-text border-start-0 bg-body small text-muted">@comasw.com</span>
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label fw-bold text-secondary">Nueva Contraseña</label>
              <div class="input-group">
                <span class="input-group-text border-end-0 bg-body"><i class="bi bi-lock"></i></span>
                <input [type]="showPassword ? 'text' : 'password'" class="form-control border-start-0 border-end-0" [(ngModel)]="newPassword" placeholder="Dejar en blanco para no cambiar">
                <button class="btn btn-outline-secondary border-start-0" type="button" (click)="showPassword = !showPassword">
                  <i class="bi" [ngClass]="showPassword ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
              </div>
            </div>
            
            <div *ngIf="profileError" class="alert alert-danger py-2 small border-0 shadow-sm">{{profileError}}</div>
            <div *ngIf="profileSuccess" class="alert alert-success py-2 small border-0 shadow-sm">{{profileSuccess}}</div>
          </div>
          <div class="modal-footer border-0 pt-0 gap-3">
            <button class="btn btn-danger w-100 fw-bold rounded-pill py-2 shadow-sm" data-bs-dismiss="modal">
              <i class="bi bi-x-circle me-1"></i> Cancelar
            </button>
            <button *ngIf="hasChanges()" class="btn btn-primary w-100 fw-bold rounded-pill py-2 shadow-sm" (click)="saveProfile()">
              <i class="bi bi-check-circle me-1"></i> Actualizar Datos
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-vh-100 { height: 100vh; }
  `]
})
export class LayoutComponent {
  isCollapsed = false;

  // Profile management logic moved here to avoid z-index blocking issues
  newUsername = '';
  originalUsername = '';
  newPassword = '';
  showPassword = false;
  profileSuccess = '';
  profileError = '';

  constructor(public auth: AuthService) {}

  onOpenProfile() {
    this.originalUsername = this.auth.currentUser?.username.split('@')[0] || '';
    this.newUsername = this.originalUsername;
    this.newPassword = '';
    this.showPassword = false;
    this.profileSuccess = '';
    this.profileError = '';
  }

  hasChanges(): boolean {
    return (this.newUsername !== this.originalUsername && this.newUsername.length > 0) || (this.newPassword.length > 0);
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
      setTimeout(() => {
        document.getElementById('profileModalCloseBtn')?.click();
      }, 1500);
    } catch (e: any) {
      this.profileError = e.message;
    }
  }
}
