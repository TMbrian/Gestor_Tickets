import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComponenteBarraLateral } from './barra-lateral.component';
import { ComponenteBarraNavegacion } from './barra-navegacion.component';
import { ConfirmDialogComponent, PromptDialogComponent, LoaderDialogComponent } from '../shared/components';
import { FormsModule } from '@angular/forms';
import { ServicioAutenticacion } from '../core/services';

/**
 * Componente raíz de la estructura visual de la aplicación.
 *
 * Compone el layout principal que incluye la barra lateral, la barra de navegación
 * superior y el área de contenido donde se renderizan las rutas hijas.
 * También gestiona el modal de perfil de usuario de forma centralizada para evitar
 * problemas de z-index con otros elementos del DOM.
 */
@Component({
  selector: 'app-diseno',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ComponenteBarraLateral,
    ComponenteBarraNavegacion,
    ConfirmDialogComponent,
    PromptDialogComponent,
    LoaderDialogComponent,
    FormsModule
  ],
  template: `
    <div class="d-flex w-100 custom-vh-100 overflow-hidden bg-body-tertiary">

      <!-- Barra lateral con soporte de colapso y apertura del modal de perfil -->
      <app-barra-lateral
        [estaColapsado]="estaColapsado"
        (abrirPerfil)="alAbrirPerfil()"
        class="flex-shrink-0 z-2"
        style="transition: width 0.3s ease;"
        [style.width]="estaColapsado ? '88px' : '280px'">
      </app-barra-lateral>

      <div class="d-flex flex-column flex-grow-1 overflow-hidden">

        <!-- Barra de navegación superior con botón de colapso -->
        <app-barra-navegacion (alternarBarraLateral)="estaColapsado = !estaColapsado">
        </app-barra-navegacion>

        <!-- Área principal de contenido donde se insertan las rutas hijas -->
        <main class="flex-grow-1 overflow-auto p-4 p-md-5">
          <div class="container-fluid mx-auto px-0" style="max-width: 1400px;">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
    
    <!-- Elementos globales de UI: diálogos y cargador -->
    <app-confirm-dialog></app-confirm-dialog>
    <app-prompt-dialog></app-prompt-dialog>
    <app-loader-dialog></app-loader-dialog>

    <!-- Modal de perfil global (fuera de contextos de z-index limitados) -->
    <div class="modal fade" id="modalPerfil" tabindex="-1" aria-hidden="true" style="z-index: 2000;">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 400px;">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">

          <div class="modal-header border-bottom-0 px-4">
            <h5 class="modal-title fw-bold text-body-emphasis">Mi Perfil</h5>
            <!-- Botón oculto para cerrar el modal programáticamente tras guardar -->
            <button type="button" id="btnCerrarModalPerfil" data-bs-dismiss="modal" class="d-none"></button>
          </div>

          <div class="modal-body p-4">
            <!-- Campo de nombre de usuario -->
            <div class="mb-3">
              <label class="form-label fw-bold text-secondary">Usuario</label>
              <div class="input-group">
                <span class="input-group-text border-end-0 bg-body"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control border-start-0 border-end-0" [(ngModel)]="nuevoNombreUsuario">
                <span class="input-group-text border-start-0 bg-body small text-muted">@comasw.com</span>
              </div>
            </div>

            <!-- Campo de nueva contraseña con toggle de visibilidad -->
            <div class="mb-3">
              <label class="form-label fw-bold text-secondary">Nueva Contraseña</label>
              <div class="input-group">
                <span class="input-group-text border-end-0 bg-body"><i class="bi bi-lock"></i></span>
                <input [type]="mostrarContrasena ? 'text' : 'password'" 
                       class="form-control border-start-0 border-end-0" 
                       [(ngModel)]="nuevaContrasena" 
                       placeholder="Dejar en blanco para no cambiar">
                <button class="btn btn-outline-secondary border-start-0" 
                        type="button" 
                        (click)="mostrarContrasena = !mostrarContrasena">
                  <i class="bi" [ngClass]="mostrarContrasena ? 'bi-eye-slash' : 'bi-eye'"></i>
                </button>
              </div>
            </div>
            
            <!-- Mensajes de error y éxito del guardado de perfil -->
            <div *ngIf="errorPerfil" class="alert alert-danger py-2 small border-0 shadow-sm">
              {{ errorPerfil }}
            </div>
            <div *ngIf="exitoPerfil" class="alert alert-success py-2 small border-0 shadow-sm">
              {{ exitoPerfil }}
            </div>
          </div>

          <div class="modal-footer border-0 pt-0 gap-3">
            <button class="btn btn-danger w-100 fw-bold rounded-pill py-2 shadow-sm" data-bs-dismiss="modal">
              <i class="bi bi-x-circle me-1"></i> Cancelar
            </button>
            <button *ngIf="tieneCambios()" 
                    class="btn btn-primary w-100 fw-bold rounded-pill py-2 shadow-sm" 
                    (click)="guardarPerfil()">
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
export class ComponenteDiseno {

  /** Controla si la barra lateral está en modo colapsado */
  estaColapsado = false;

  // ---------------------------------------------------------------------------
  // Estado del modal de perfil
  // ---------------------------------------------------------------------------

  /** Nuevo nombre de usuario ingresado en el formulario */
  nuevoNombreUsuario = '';

  /** Nombre de usuario original al abrir el modal, usado para detectar cambios */
  nombreUsuarioOriginal = '';

  /** Nueva contraseña ingresada; vacío indica que no se desea cambiar */
  nuevaContrasena = '';

  /** Controla la visibilidad del campo de contraseña en el formulario */
  mostrarContrasena = false;

  /** Mensaje de éxito mostrado tras guardar el perfil correctamente */
  exitoPerfil = '';

  /** Mensaje de error mostrado si ocurre un problema al guardar el perfil */
  errorPerfil = '';

  /** @param servicioAuth - Servicio de autenticación para leer y actualizar el usuario activo */
  constructor(public servicioAuth: ServicioAutenticacion) { }

  /**
   * Inicializa el formulario del modal de perfil con los datos actuales del usuario.
   * Se llama al emitir el evento `abrirPerfil` desde la barra lateral.
   */
  alAbrirPerfil(): void {
    this.nombreUsuarioOriginal = this.servicioAuth.usuarioActual?.nombreUsuario.split('@')[0] || '';
    this.nuevoNombreUsuario = this.nombreUsuarioOriginal;
    this.nuevaContrasena = '';
    this.mostrarContrasena = false;
    this.exitoPerfil = '';
    this.errorPerfil = '';
  }

  /**
   * Verifica si el usuario ha realizado algún cambio en el formulario de perfil.
   * Controla la visibilidad del botón "Actualizar Datos".
   *
   * @returns `true` si el nombre de usuario cambió o si se ingresó una nueva contraseña.
   */
  tieneCambios(): boolean {
    const nombreCambio = this.nuevoNombreUsuario !== this.nombreUsuarioOriginal
      && this.nuevoNombreUsuario.length > 0;
    const contrasenaCambio = this.nuevaContrasena.length > 0;
    return nombreCambio || contrasenaCambio;
  }

  /**
   * Valida y guarda los cambios del perfil del usuario en el servicio de autenticación.
   * Si el guardado es exitoso, cierra el modal automáticamente tras 1.5 segundos.
   */
  async guardarPerfil(): Promise<void> {
    this.errorPerfil = '';
    this.exitoPerfil = '';

    if (!this.nuevoNombreUsuario) {
      this.errorPerfil = 'El usuario no puede estar vacío.';
      return;
    }

    // Valida que la contraseña cumpla el mínimo de seguridad requerido
    const patronContrasena = /^(?=.*[A-Z])(?=.*[0-9])(?=.{8,}).*$/;
    if (this.nuevaContrasena && !patronContrasena.test(this.nuevaContrasena)) {
      this.errorPerfil = 'La contraseña debe tener 8 caracteres, 1 mayúscula y 1 número.';
      return;
    }

    try {
      await this.servicioAuth.actualizarUsuario(
        this.servicioAuth.usuarioActual!.id,
        this.nuevoNombreUsuario,
        this.nuevaContrasena || undefined
      );
      this.exitoPerfil = 'Perfil actualizado con éxito.';

      // Cierra el modal automáticamente tras mostrar el mensaje de éxito
      setTimeout(() => {
        document.getElementById('btnCerrarModalPerfil')?.click();
      }, 1500);
    } catch (error: any) {
      this.errorPerfil = error.message;
    }
  }
}