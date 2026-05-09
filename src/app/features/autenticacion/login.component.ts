import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/autenticacion.service';
import { Role } from '../../core/models/usuario.modelo';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container d-flex align-items-center justify-content-center min-vh-100 p-4 py-md-5">
      <!-- Animated Background elements -->
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>
      
      <div class="glass-card shadow-lg p-4 p-md-5 border-0 my-5" style="width: 100%; max-width: 440px;">
        <div class="text-center mb-5">
          <div class="logo-wrapper bg-primary bg-opacity-10 rounded-4 d-inline-flex p-3 mb-4 shadow-sm">
            <i class="bi bi-clouds-fill" style="font-size: 2.2rem; color: var(--bs-primary);"></i>
          </div>
          <h2 class="fw-bolder tracking-tight mb-1 text-primary">TicketManager</h2>
          <p class="text-secondary small fw-medium">{{ isRegisterMode ? 'Crea tu cuenta segura en la nube' : 'Acceso administrativo Cloud' }}</p>
        </div>

        <form (ngSubmit)="onSubmit()">
            <!-- Alerts -->
            <div *ngIf="successMessage" class="alert alert-success-glass py-3 mb-4 rounded-4 animate__animated animate__fadeIn">
              <div class="d-flex align-items-center">
                <i class="bi bi-check-circle-fill me-2 fs-5"></i>
                <span class="fw-medium">{{successMessage}}</span>
              </div>
            </div>

            <div *ngIf="errorMessage" class="alert alert-danger-glass py-3 mb-4 rounded-4 animate__animated animate__shakeX">
              <div class="d-flex align-items-center">
                <i class="bi bi-exclamation-circle-fill me-2 fs-5"></i>
                <span class="fw-medium">{{errorMessage}}</span>
              </div>
            </div>

            <ng-container *ngIf="!isRecoveryMode">
              <div class="form-floating mb-3">
                <input type="text" class="form-control rounded-4 shadow-sm" id="userInput"
                       [(ngModel)]="username" name="username" required placeholder="nombre"
                       [disabled]="isLoading">
                <label for="userInput" class="text-muted small fw-bold"><i class="bi bi-person me-2"></i>Usuario (@comasw.com)</label>
              </div>

              <div class="form-floating mb-4">
                <input type="password" class="form-control rounded-4 shadow-sm" id="passInput"
                       [(ngModel)]="password" name="password" required placeholder="********"
                       [disabled]="isLoading">
                <label for="passInput" class="text-muted small fw-bold"><i class="bi bi-lock me-2"></i>Contraseña</label>
              </div>

              <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold shadow-lg rounded-pill py-3 d-flex align-items-center justify-content-center gap-2 mb-4" 
                      [disabled]="!username || !password || isLoading">
                <span *ngIf="!isLoading">{{ isRegisterMode ? 'Registrar Cuenta' : 'Ingresar al Dashboard' }}</span>
                <span *ngIf="isLoading" class="spinner-border spinner-border-sm" role="status"></span>
                <i *ngIf="!isLoading" class="bi bi-box-arrow-in-right"></i>
              </button>
              
              <div class="text-center d-flex flex-column gap-3 mt-2">
                <a href="javascript:void(0)" (click)="toggleMode()" class="text-decoration-none small text-secondary hover-primary transition">
                  {{ isRegisterMode ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Registra tu administrador' }}
                </a>
                <a href="javascript:void(0)" (click)="toggleRecovery()" class="text-decoration-none fw-bold text-primary small">
                  Olvidé mi contraseña
                </a>
              </div>
            </ng-container>

            <!-- Recovery Mode -->
            <ng-container *ngIf="isRecoveryMode">
               <div class="form-floating mb-4">
                  <input type="text" class="form-control rounded-4 shadow-sm" id="recoverInput"
                         [(ngModel)]="username" name="username_recovery" required placeholder="usuario"
                         [disabled]="isLoading">
                  <label for="recoverInput" class="text-muted small fw-bold"><i class="bi bi-mailbox me-2"></i>Usuario (@comasw.com)</label>
               </div>
               
               <div *ngIf="recoveryMessage" class="alert alert-info-glass py-3 mb-4 rounded-4 shadow-sm">
                  <i class="bi bi-info-circle-fill me-2 fs-5"></i>
                  <span class="small fw-medium">{{recoveryMessage}}</span>
               </div>

               <button type="button" (click)="onRecover()" class="btn btn-dark btn-lg w-100 fw-bold shadow-sm rounded-pill py-3 mb-4" 
                       [disabled]="!username || isLoading">
                <span *ngIf="!isLoading">Recuperar Acceso</span>
                <span *ngIf="isLoading" class="spinner-border spinner-border-sm"></span>
               </button>
               
               <div class="text-center">
                <a href="javascript:void(0)" (click)="toggleRecovery()" class="text-decoration-none small text-secondary">
                   <i class="bi bi-arrow-left"></i> Volver al Inicio
                </a>
              </div>
            </ng-container>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      background: linear-gradient(135deg, var(--bs-body-bg) 0%, var(--bs-tertiary-bg) 100%);
      position: relative;
      overflow: hidden;
    }
    .bg-blob {
      position: absolute;
      width: 400px;
      height: 400px;
      background: var(--bs-primary);
      filter: blur(80px);
      opacity: 0.08;
      border-radius: 50%;
      z-index: 0;
    }
    .blob-1 { top: -100px; right: -100px; }
    .blob-2 { bottom: -100px; left: -100px; }
    
    .glass-card {
      background: rgba(var(--bs-body-bg-rgb), 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(var(--bs-primary-rgb), 0.1) !important;
      border-radius: 28px;
      z-index: 10;
    }

    .form-control {
      background: rgba(var(--bs-body-bg-rgb), 0.5) !important;
      border: 1px solid rgba(var(--bs-secondary-rgb), 0.1);
      height: 60px;
    }
    .form-control:focus {
      background: var(--bs-body-bg) !important;
      box-shadow: 0 0 0 4px rgba(var(--bs-primary-rgb), 0.15);
      border-color: var(--bs-primary);
    }

    .btn-primary {
      background: linear-gradient(135deg, #0d6efd 0%, #0b5ed7 100%);
      border: none;
    }
    
    .hover-primary:hover { color: var(--bs-primary) !important; }
    .transition { transition: all 0.2s ease; }

    /* Custom Glass Alerts */
    .alert-success-glass { background: rgba(25, 135, 84, 0.1); color: #198754; border: 1px solid rgba(25, 135, 84, 0.2); }
    .alert-danger-glass { background: rgba(220, 53, 69, 0.1); color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.2); }
    .alert-info-glass { background: rgba(13, 110, 253, 0.1); color: #0d6efd; border: 1px solid rgba(13, 110, 253, 0.2); }

    [data-bs-theme="dark"] .glass-card {
      background: rgba(33, 37, 41, 0.7);
      border-color: rgba(255, 255, 255, 0.05) !important;
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  role: Role = 'Admin';
  isRegisterMode = false;
  isRecoveryMode = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  recoveryMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.isRecoveryMode = false;
    this.resetMessages();
  }

  toggleRecovery() {
    this.isRecoveryMode = !this.isRecoveryMode;
    this.isRegisterMode = false;
    this.resetMessages();
  }

  private resetMessages() {
    this.errorMessage = '';
    this.successMessage = '';
    this.recoveryMessage = '';
  }

  async onRecover() {
    this.resetMessages();
    this.isLoading = true;
    try {
      this.recoveryMessage = await this.authService.recoverPassword(this.username);
    } catch (e: any) {
      this.errorMessage = this.translateError(e.code || e.message);
    } finally {
      this.isLoading = false;
    }
  }

  async onSubmit() {
    this.resetMessages();
    
    if (this.username && this.password) {
      if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.{8,}).*$/.test(this.password)) {
        this.errorMessage = "La contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número.";
        return;
      }
      
      this.isLoading = true;
      try {
        if (this.isRegisterMode) {
          await this.authService.register(this.username, this.password, this.role);
          this.successMessage = "Administrador registrado. Redirigiendo...";
          setTimeout(() => this.router.navigate(['/dashboard']), 1500);
        } else {
          await this.authService.login(this.username, this.password);
          this.router.navigate(['/dashboard']);
        }
      } catch (e: any) {
        this.errorMessage = this.translateError(e.code || e.message);
      } finally {
        this.isLoading = false;
      }
    }
  }

  private translateError(code: string): string {
    switch (code) {
      case 'auth/user-not-found': return 'El usuario no existe.';
      case 'auth/wrong-password': return 'Contraseña incorrecta.';
      case 'auth/email-already-in-use': return 'Este usuario ya está registrado.';
      case 'auth/weak-password': return 'La contraseña es muy débil (mínimo 6 caracteres).';
      case 'auth/invalid-email': return 'Formato de usuario/email inválido.';
      case 'auth/network-request-failed': return 'Error de red. Revisa tu conexión.';
      default: return 'Error al procesar la solicitud. Revisa tus credenciales.';
    }
  }
}
