import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ServicioAutenticacion } from '../../core/services';
import { Rol } from '../../core/models';

/**
 * Componente de inicio de sesión, registro y recuperación de contraseña.
 *
 * Gestiona tres modos de operación desde una sola vista:
 * - **Login**: acceso con usuario y contraseña existentes.
 * - **Registro**: creación de una nueva cuenta de administrador.
 * - **Recuperación**: envío de correo para restablecer la contraseña.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container d-flex align-items-center justify-content-center min-vh-100 p-4 py-md-5">
      <!-- Elementos decorativos de fondo animados -->
      <div class="bg-blob blob-1"></div>
      <div class="bg-blob blob-2"></div>
      
      <div class="glass-card shadow-lg p-4 p-md-5 border-0 my-5" style="width: 100%; max-width: 440px;">
        <div class="text-center mb-5">
          <div class="logo-wrapper bg-primary bg-opacity-10 rounded-4 d-inline-flex p-3 mb-4 shadow-sm">
            <i class="bi bi-clouds-fill" style="font-size: 2.2rem; color: var(--bs-primary);"></i>
          </div>
          <h2 class="fw-bolder tracking-tight mb-1 text-primary">TicketManager</h2>
          <p class="text-secondary small fw-medium">
            {{ enModoRegistro ? 'Crea tu cuenta segura en la nube' : 'Acceso administrativo Cloud' }}
          </p>
        </div>

        <form (ngSubmit)="alEnviarFormulario()">

          <!-- Alerta de éxito -->
          <div *ngIf="mensajeExito" class="alert alert-success-glass py-3 mb-4 rounded-4 animate__animated animate__fadeIn">
            <div class="d-flex align-items-center">
              <i class="bi bi-check-circle-fill me-2 fs-5"></i>
              <span class="fw-medium">{{ mensajeExito }}</span>
            </div>
          </div>

          <!-- Alerta de error -->
          <div *ngIf="mensajeError" class="alert alert-danger-glass py-3 mb-4 rounded-4 animate__animated animate__shakeX">
            <div class="d-flex align-items-center">
              <i class="bi bi-exclamation-circle-fill me-2 fs-5"></i>
              <span class="fw-medium">{{ mensajeError }}</span>
            </div>
          </div>

          <!-- Formulario de login y registro -->
          <ng-container *ngIf="!enModoRecuperacion">
            <div class="form-floating mb-3">
              <input type="text" class="form-control rounded-4 shadow-sm" id="campoUsuario"
                     [(ngModel)]="nombreUsuario" name="nombreUsuario" required placeholder="nombre"
                     [disabled]="estaCargando">
              <label for="campoUsuario" class="text-muted small fw-bold">
                <i class="bi bi-person me-2"></i>Usuario (@comasw.com)
              </label>
            </div>

            <div class="form-floating mb-4">
              <input type="password" class="form-control rounded-4 shadow-sm" id="campoContrasena"
                     [(ngModel)]="contrasena" name="contrasena" required placeholder="********"
                     [disabled]="estaCargando">
              <label for="campoContrasena" class="text-muted small fw-bold">
                <i class="bi bi-lock me-2"></i>Contraseña
              </label>
            </div>

            <button type="submit" 
                    class="btn btn-primary btn-lg w-100 fw-bold shadow-lg rounded-pill py-3 d-flex align-items-center justify-content-center gap-2 mb-4" 
                    [disabled]="!nombreUsuario || !contrasena || estaCargando">
              <span *ngIf="!estaCargando">
                {{ enModoRegistro ? 'Registrar Cuenta' : 'Ingresar al Tablero' }}
              </span>
              <span *ngIf="estaCargando" class="spinner-border spinner-border-sm" role="status"></span>
              <i *ngIf="!estaCargando" class="bi bi-box-arrow-in-right"></i>
            </button>
            
            <div class="text-center d-flex flex-column gap-3 mt-2">
              <a href="javascript:void(0)" (click)="alternarModo()" 
                 class="text-decoration-none small text-secondary hover-primary transition">
                {{ enModoRegistro ? '¿Ya tienes cuenta? Ingresa aquí' : '¿No tienes cuenta? Registra tu administrador' }}
              </a>
              <a href="javascript:void(0)" (click)="alternarRecuperacion()" 
                 class="text-decoration-none fw-bold text-primary small">
                Olvidé mi contraseña
              </a>
            </div>
          </ng-container>

          <!-- Formulario de recuperación de contraseña -->
          <ng-container *ngIf="enModoRecuperacion">
            <div class="form-floating mb-4">
              <input type="text" class="form-control rounded-4 shadow-sm" id="campoRecuperacion"
                     [(ngModel)]="nombreUsuario" name="nombreUsuario_recuperacion" required placeholder="usuario"
                     [disabled]="estaCargando">
              <label for="campoRecuperacion" class="text-muted small fw-bold">
                <i class="bi bi-mailbox me-2"></i>Usuario (@comasw.com)
              </label>
            </div>
            
            <!-- Mensaje informativo tras solicitar la recuperación -->
            <div *ngIf="mensajeRecuperacion" class="alert alert-info-glass py-3 mb-4 rounded-4 shadow-sm">
              <i class="bi bi-info-circle-fill me-2 fs-5"></i>
              <span class="small fw-medium">{{ mensajeRecuperacion }}</span>
            </div>

            <button type="button" (click)="alRecuperar()" 
                    class="btn btn-dark btn-lg w-100 fw-bold shadow-sm rounded-pill py-3 mb-4" 
                    [disabled]="!nombreUsuario || estaCargando">
              <span *ngIf="!estaCargando">Recuperar Acceso</span>
              <span *ngIf="estaCargando" class="spinner-border spinner-border-sm"></span>
            </button>
            
            <div class="text-center">
              <a href="javascript:void(0)" (click)="alternarRecuperacion()" 
                 class="text-decoration-none small text-secondary">
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

    .alert-success-glass { background: rgba(25, 135, 84, 0.1); color: #198754; border: 1px solid rgba(25, 135, 84, 0.2); }
    .alert-danger-glass  { background: rgba(220, 53, 69, 0.1);  color: #dc3545; border: 1px solid rgba(220, 53, 69, 0.2); }
    .alert-info-glass    { background: rgba(13, 110, 253, 0.1);  color: #0d6efd; border: 1px solid rgba(13, 110, 253, 0.2); }

    [data-bs-theme="dark"] .glass-card {
      background: rgba(33, 37, 41, 0.7);
      border-color: rgba(255, 255, 255, 0.05) !important;
    }
  `]
})
export class ComponenteLogin {

  /** Nombre de usuario ingresado en el formulario */
  nombreUsuario = '';

  /** Contraseña ingresada en el formulario */
  contrasena = '';

  /** Rol asignado al registrar una nueva cuenta */
  rol: Rol = 'Admin';

  /** Indica si el formulario está en modo registro (true) o login (false) */
  enModoRegistro = false;

  /** Indica si el formulario está en modo recuperación de contraseña */
  enModoRecuperacion = false;

  /** Indica si hay una operación asíncrona en curso */
  estaCargando = false;

  /** Mensaje de error mostrado al usuario tras una operación fallida */
  mensajeError = '';

  /** Mensaje de éxito mostrado al usuario tras una operación exitosa */
  mensajeExito = '';

  /** Mensaje informativo mostrado tras solicitar la recuperación de contraseña */
  mensajeRecuperacion = '';

  /**
   * @param servicioAuth - Servicio de autenticación para login, registro y recuperación.
   * @param enrutador    - Servicio de enrutamiento para redirigir tras autenticarse.
   */
  constructor(
    private servicioAuth: ServicioAutenticacion,
    private enrutador: Router
  ) { }

  /**
   * Alterna entre el modo login y el modo registro.
   * Limpia los mensajes al cambiar de modo.
   */
  alternarModo(): void {
    this.enModoRegistro = !this.enModoRegistro;
    this.enModoRecuperacion = false;
    this.limpiarMensajes();
  }

  /**
   * Alterna entre el modo principal y el modo de recuperación de contraseña.
   * Limpia los mensajes al cambiar de modo.
   */
  alternarRecuperacion(): void {
    this.enModoRecuperacion = !this.enModoRecuperacion;
    this.enModoRegistro = false;
    this.limpiarMensajes();
  }

  /** Limpia todos los mensajes de estado del formulario */
  private limpiarMensajes(): void {
    this.mensajeError = '';
    this.mensajeExito = '';
    this.mensajeRecuperacion = '';
  }

  /**
   * Solicita el envío de un correo de recuperación de contraseña
   * al usuario ingresado en el campo de recuperación.
   */
  async alRecuperar(): Promise<void> {
    this.limpiarMensajes();
    this.estaCargando = true;
    try {
      this.mensajeRecuperacion = await this.servicioAuth.recuperarContrasena(this.nombreUsuario);
    } catch (error: any) {
      this.mensajeError = this.traducirError(error.code || error.message);
    } finally {
      this.estaCargando = false;
    }
  }

  /**
   * Procesa el envío del formulario principal según el modo activo.
   * Valida la contraseña antes de llamar al servicio de autenticación.
   * En modo registro redirige al tablero tras 1.5 segundos; en login, de inmediato.
   */
  async alEnviarFormulario(): Promise<void> {
    this.limpiarMensajes();
    if (!this.nombreUsuario || !this.contrasena) return;

    // Valida el formato de la contraseña antes de enviar al servidor
    const patronContrasena = /^(?=.*[A-Z])(?=.*[0-9])(?=.{8,}).*$/;
    if (!patronContrasena.test(this.contrasena)) {
      this.mensajeError = 'La contraseña debe tener mínimo 8 caracteres, 1 mayúscula y 1 número.';
      return;
    }

    this.estaCargando = true;
    try {
      if (this.enModoRegistro) {
        await this.servicioAuth.registrar(this.nombreUsuario, this.contrasena, this.rol);
        this.mensajeExito = 'Administrador registrado. Redirigiendo...';
        setTimeout(() => this.enrutador.navigate(['/tablero']), 1500);
      } else {
        await this.servicioAuth.iniciarSesion(this.nombreUsuario, this.contrasena);
        this.enrutador.navigate(['/tablero']);
      }
    } catch (error: any) {
      this.mensajeError = this.traducirError(error.code || error.message);
    } finally {
      this.estaCargando = false;
    }
  }

  /**
   * Traduce los códigos de error de Firebase Auth a mensajes legibles en español.
   *
   * @param codigo - Código o mensaje de error devuelto por Firebase.
   * @returns Mensaje de error amigable para mostrar al usuario.
   */
  private traducirError(codigo: string): string {
    switch (codigo) {
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