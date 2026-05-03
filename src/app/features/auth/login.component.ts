import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Role } from '../../core/models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="d-flex align-items-center justify-content-center vh-100 bg-secondary-subtle">
      <div class="card shadow p-5 border-0" style="width: 420px; border-radius: 12px;">
        <div class="text-center mb-4">
          <div class="bg-primary bg-opacity-10 rounded-circle d-inline-flex p-3 mb-3">
            <i class="bi bi-headset" style="font-size: 2.5rem; color: var(--bs-primary);"></i>
          </div>
          <h3 class="text-primary fw-bold">Ticket Manager</h3>
          <p class="text-muted">{{ isRegisterMode ? 'Crea tu cuenta corporativa' : 'Inicia sesión en tu dashboard local' }}</p>
        </div>
        <form (ngSubmit)="onSubmit()">
            <div *ngIf="successMessage" class="alert alert-success py-2 mt-2"><i class="bi bi-check-circle me-2"></i>{{successMessage}}</div>
            
            <div *ngIf="successMessage" class="alert alert-success py-2 mt-2"><i class="bi bi-check-circle me-2"></i>{{successMessage}}</div>
            
            <ng-container *ngIf="!isRecoveryMode">
              <label class="form-label fw-bold text-secondary">Usuario</label>
              <div class="input-group mb-3">
                <span class="input-group-text bg-body border-end-0"><i class="bi bi-person text-muted"></i></span>
                <input type="text" class="form-control form-control-lg bg-body border-start-0 border-end-0" [(ngModel)]="username" name="username" required placeholder="Ej. administrador">
                <span class="input-group-text bg-body border-start-0 text-muted">@comasw.com</span>
              </div>

              <label class="form-label fw-bold text-secondary">Contraseña</label>
              <div class="input-group mb-4">
                <span class="input-group-text bg-body border-end-0"><i class="bi bi-lock text-muted"></i></span>
                <input type="password" class="form-control form-control-lg bg-body border-start-0" [(ngModel)]="password" name="password" required placeholder="********" pattern="^(?=.*[A-Z])(?=.*[0-9])(?=.{8,}).*$">
              </div>

              <div *ngIf="errorMessage" class="alert alert-danger py-2 mt-2"><i class="bi bi-exclamation-triangle me-2"></i>{{errorMessage}}</div>
              
              <button type="submit" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm" [disabled]="!username || !password">
                {{ isRegisterMode ? 'Registrar Único Administrador' : 'Ingresar' }} <i class="bi bi-arrow-right-short ms-1"></i>
              </button>
              
              <div class="text-center mt-3 d-flex flex-column gap-2">
                <a href="javascript:void(0)" (click)="toggleMode()" *ngIf="!isRegisterMode" class="text-decoration-none small text-muted">
                  ¿No tienes cuenta? Regístrate aquí
                </a>
                <a href="javascript:void(0)" (click)="toggleMode()" *ngIf="isRegisterMode" class="text-decoration-none small text-muted">
                   ¿Ya tienes cuenta? Ingresa aquí
                </a>
                <a href="javascript:void(0)" (click)="toggleRecovery()" class="text-decoration-none fw-bold text-primary">
                  Olvidé mi contraseña
                </a>
              </div>
            </ng-container>

            <!-- Recovery Mode -->
            <ng-container *ngIf="isRecoveryMode">
               <label class="form-label fw-bold text-secondary">Introduce tu usuario</label>
               <div class="input-group mb-3">
                 <span class="input-group-text bg-body border-end-0"><i class="bi bi-envelope text-muted"></i></span>
                 <input type="text" class="form-control form-control-lg bg-body border-start-0 border-end-0" [(ngModel)]="username" name="username_recovery" required placeholder="Ej. administrador">
                 <span class="input-group-text bg-body border-start-0 text-muted">@comasw.com</span>
               </div>
               
               <div *ngIf="errorMessage" class="alert alert-danger py-2 mt-2"><i class="bi bi-exclamation-triangle me-2"></i>{{errorMessage}}</div>
               <div *ngIf="recoveryMessage" class="alert alert-success py-3 shadow-sm border-success" style="white-space: pre-line;">
                  <i class="bi bi-shield-lock-fill me-2"></i>{{recoveryMessage}}
               </div>

               <button type="button" (click)="onRecover()" class="btn btn-primary btn-lg w-100 fw-bold shadow-sm" [disabled]="!username">
                Enviar Recuperación <i class="bi bi-mailbox ms-1"></i>
               </button>
               
               <div class="text-center mt-3">
                <a href="javascript:void(0)" (click)="toggleRecovery()" class="text-decoration-none small">
                   <i class="bi bi-arrow-left"></i> Volver al Inicio
                </a>
              </div>
            </ng-container>
        </form>
      </div>
    </div>
  `
})
export class LoginComponent {
  username = '';
  password = '';
  role: Role = 'Admin';
  isRegisterMode = false;
  isRecoveryMode = false;
  errorMessage = '';
  successMessage = '';
  recoveryMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.isRecoveryMode = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.recoveryMessage = '';
  }

  toggleRecovery() {
    this.isRecoveryMode = !this.isRecoveryMode;
    this.isRegisterMode = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.recoveryMessage = '';
  }

  async onRecover() {
    this.errorMessage = '';
    this.recoveryMessage = '';
    try {
      this.recoveryMessage = await this.authService.recoverPassword(this.username);
    } catch (e: any) {
      this.errorMessage = e.message;
    }
  }

  async onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';
    
    if (this.username && this.password) {
      if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.{8,}).*$/.test(this.password)) {
        this.errorMessage = "La contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número.";
        return;
      }
      
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
        this.errorMessage = e.message;
      }
    }
  }
}
