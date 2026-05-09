import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServicioAutenticacion, ServicioTema, ModoTema, ServicioDialogo } from '../core/services';
import packageInfo from '../../../package.json';

declare var bootstrap: any;

/**
 * Componente de barra lateral de navegación principal.
 *
 * Muestra los enlaces de navegación, el selector de tema visual,
 * el acceso al perfil del usuario y el botón de cierre de sesión.
 * Soporta un modo colapsado para liberar espacio en pantallas pequeñas.
 */
@Component({
  selector: 'app-barra-lateral',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="d-flex flex-column h-100 shadow-lg border-end overflow-hidden" 
         style="background: linear-gradient(180deg, #1a1d20 0%, #000000 100%); color: white; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); width: {{ estaColapsado ? '80px' : '280px' }}">
      
      <!-- Encabezado de marca -->
      <div class="p-4 mb-2 border-bottom border-secondary border-opacity-25">
        <a routerLink="/" class="d-flex align-items-center text-white text-decoration-none" [ngClass]="estaColapsado ? 'justify-content-center' : ''">
          <div class="bg-primary bg-gradient rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="min-width: 42px; height: 42px;">
            <i class="bi bi-layers-fill fs-4 text-white"></i>
          </div>
          <span class="fs-4 fw-bold tracking-tight ms-3 text-nowrap" *ngIf="!estaColapsado">ITTickets</span>
        </a>
      </div>
      
      <!-- Navegación principal -->
      <div class="flex-grow-1 px-3 py-4 custom-scrollbar overflow-auto">
        <div class="text-uppercase text-secondary fw-bold mb-3 d-flex align-items-center" 
             style="font-size: 0.7rem; letter-spacing: 1.5px;" 
             *ngIf="!estaColapsado">
          <span class="me-2">Navegación</span>
          <div class="flex-grow-1 border-top border-secondary border-opacity-25"></div>
        </div>
        
        <ul class="nav nav-pills flex-column gap-2 mb-4">
          <!-- Enlace al tablero principal -->
          <li class="nav-item">
            <a routerLink="/tablero" routerLinkActive="active" 
               class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 py-3" 
               [ngClass]="estaColapsado ? 'justify-content-center px-0' : 'px-3'" 
               title="Tablero">
              <i class="bi bi-grid-1x2-fill fs-5" [ngClass]="!estaColapsado ? 'me-3' : 'me-0'"></i> 
              <span class="fw-medium" *ngIf="!estaColapsado">Tablero</span>
            </a>
          </li>
          <!-- Enlace al historial de tickets -->
          <li class="nav-item">
            <a routerLink="/tickets" routerLinkActive="active" 
               class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 py-3" 
               [ngClass]="estaColapsado ? 'justify-content-center px-0' : 'px-3'" 
               title="Historial de Tickets">
              <i class="bi bi-table fs-5" [ngClass]="!estaColapsado ? 'me-3' : 'me-0'"></i> 
              <span class="fw-medium" *ngIf="!estaColapsado">Historial de Tickets</span>
            </a>
          </li>
          <!-- Enlace a la configuración de catálogos -->
          <li class="nav-item">
            <a routerLink="/configuracion" routerLinkActive="active" 
               class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 py-3" 
               [ngClass]="estaColapsado ? 'justify-content-center px-0' : 'px-3'" 
               title="Configuración de Catálogos">
              <i class="bi bi-gear-fill fs-5" [ngClass]="!estaColapsado ? 'me-3' : 'me-0'"></i> 
              <span class="fw-medium" *ngIf="!estaColapsado">Configuración</span>
            </a>
          </li>
        </ul>

        <!-- Sección de personalización -->
        <div class="text-uppercase text-secondary fw-bold mb-3 d-flex align-items-center" 
             style="font-size: 0.7rem; letter-spacing: 1.5px;" 
             *ngIf="!estaColapsado">
          <span class="me-2">Personalización</span>
          <div class="flex-grow-1 border-top border-secondary border-opacity-25"></div>
        </div>

        <ul class="nav nav-pills flex-column gap-2">
          <!-- Enlace al perfil del usuario -->
          <li class="nav-item">
            <a href="javascript:void(0)" 
               data-bs-toggle="modal" 
               data-bs-target="#modalPerfil" 
               (click)="abrirPerfil.emit()" 
               class="nav-link text-white opacity-75 d-flex align-items-center rounded-3 py-3" 
               [ngClass]="estaColapsado ? 'justify-content-center px-0' : 'px-3'" 
               title="Mi Perfil">
              <i class="bi bi-person-circle fs-5" [ngClass]="!estaColapsado ? 'me-3' : 'me-0'"></i> 
              <span class="fw-medium" *ngIf="!estaColapsado">
                Mi Perfil ({{ servicioAuth.usuarioActual?.nombre }})
              </span>
            </a>
          </li>
          
          <!-- Selector de tema visual: claro, oscuro o sistema -->
          <li class="nav-item mb-2" *ngIf="!estaColapsado">
            <div class="px-3 pt-2 pb-1">
              <div class="d-flex bg-dark bg-opacity-50 p-1 rounded-pill border border-secondary border-opacity-25">
                <button class="btn btn-sm flex-fill rounded-pill py-1 border-0 transition" 
                        [class.btn-primary]="servicioTema.temaActual === 'light'" 
                        [class.text-white-50]="servicioTema.temaActual !== 'light'"
                        (click)="cambiarTema('light')" 
                        title="Modo Claro">
                  <i class="bi bi-sun-fill"></i>
                </button>
                <button class="btn btn-sm flex-fill rounded-pill py-1 border-0 transition" 
                        [class.btn-primary]="servicioTema.temaActual === 'dark'"
                        [class.text-white-50]="servicioTema.temaActual !== 'dark'"
                        (click)="cambiarTema('dark')" 
                        title="Modo Oscuro">
                  <i class="bi bi-moon-stars-fill"></i>
                </button>
                <button class="btn btn-sm flex-fill rounded-pill py-1 border-0 transition" 
                        [class.btn-primary]="servicioTema.temaActual === 'system'"
                        [class.text-white-50]="servicioTema.temaActual !== 'system'"
                        (click)="cambiarTema('system')" 
                        title="Sistema">
                  <i class="bi bi-display"></i>
                </button>
              </div>
              <div class="text-center mt-1">
                <small class="text-secondary" style="font-size: 0.6rem;">
                  Tema: {{ servicioTema.temaActual | titlecase }}
                </small>
              </div>
            </div>
          </li>

          <!-- Botón de cierre de sesión -->
          <li class="nav-item">
            <button (click)="cerrarSesion()" 
                    class="btn btn-danger w-100 fw-bold rounded-pill py-2 shadow-sm d-flex align-items-center justify-content-center" 
                    [ngClass]="estaColapsado ? 'px-2' : 'px-3'" 
                    title="Cerrar Sesión">
              <i class="bi bi-box-arrow-right fs-5" [ngClass]="!estaColapsado ? 'me-2' : 'me-0'"></i> 
              <span *ngIf="!estaColapsado">Cerrar Sesión</span>
            </button>
          </li>
        </ul>
      </div>
      
      <!-- Insignia de versión fija al pie de la barra -->
      <div class="mt-auto bg-primary py-2 text-center">
        <small class="text-white fw-medium" style="font-size: 0.75rem;" *ngIf="!estaColapsado">
          Versión {{ version }}
        </small>
        <small class="text-white fw-medium" style="font-size: 0.65rem;" *ngIf="estaColapsado">
          v{{ version }}
        </small>
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
export class ComponenteBarraLateral {

  /** Indica si la barra lateral está en modo colapsado (solo iconos) */
  @Input() estaColapsado = false;

  /** Emite un evento cuando el usuario hace clic en el enlace de perfil */
  @Output() abrirPerfil = new EventEmitter<void>();

  /** Versión de la aplicación leída desde `package.json` */
  version = packageInfo.version;

  /**
   * @param servicioAuth     - Servicio de autenticación para acceder al usuario activo.
   * @param servicioTema     - Servicio de tema para leer y cambiar el modo visual.
   * @param servicioDialogo  - Servicio de diálogos para mostrar la confirmación de logout.
   * @param enrutador        - Servicio de enrutamiento para redirigir tras cerrar sesión.
   */
  constructor(
    public servicioAuth: ServicioAutenticacion,
    public servicioTema: ServicioTema,
    private servicioDialogo: ServicioDialogo,
    private enrutador: Router
  ) { }

  /**
   * Cambia el tema visual de la aplicación al modo indicado.
   *
   * @param modo - Modo de tema a aplicar: 'light', 'dark' o 'system'.
   */
  cambiarTema(modo: ModoTema): void {
    this.servicioTema.establecerTema(modo);
  }

  /**
   * Solicita confirmación al usuario y, si acepta, cierra la sesión
   * y redirige a la página de inicio de sesión.
   */
  async cerrarSesion(): Promise<void> {
    const confirmado = await this.servicioDialogo.confirmar({
      titulo: '¿Cerrar Sesión?',
      mensaje: '¿Estás seguro de que deseas salir de la aplicación?',
      textoConfirmar: 'Aceptar',
      textoCancelar: 'Cancelar',
      tipo: 'danger'
    });

    if (confirmado) {
      await this.servicioAuth.cerrarSesion();
    }
  }
}