import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicioDialogo, EstadoCargador } from '../../core/services/dialogo.service';
import { Subscription } from 'rxjs';

/**
 * Componente del cargador global de la aplicación.
 *
 * Renderiza una capa superpuesta a pantalla completa con un spinner animado,
 * un mensaje contextual y una barra de progreso indeterminada. Se controla
 * de forma reactiva escuchando el observable `estadoCargador$` del
 * `ServicioDialogo`, de modo que cualquier parte de la aplicación puede
 * mostrarlo u ocultarlo invocando `mostrarCargador(...)` u `ocultarCargador()`.
 */
@Component({
  selector: 'app-loader-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-overlay" *ngIf="estado.visible" @fadeInOut>
      <div class="loader-card shadow-lg rounded-4 p-5 text-center">
        <div class="spinner-wrapper mb-4">
          <div class="spinner-ring"></div>
          <i class="bi bi-cloud-arrow-up-fill spinner-icon text-primary"></i>
        </div>
        <h5 class="fw-bold text-body-emphasis mb-2">{{ estado.mensaje }}</h5>
        <p class="text-muted small mb-0">Por favor espera un momento...</p>
        <div class="progress-bar-wrapper mt-4">
          <div class="progress-bar-animated"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }

    .loader-card {
      background: var(--bs-body-bg);
      border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
      min-width: 320px;
      max-width: 400px;
    }

    .spinner-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto;
    }

    .spinner-ring {
      position: absolute;
      width: 80px;
      height: 80px;
      border: 4px solid rgba(var(--bs-primary-rgb), 0.1);
      border-top: 4px solid var(--bs-primary);
      border-radius: 50%;
      animation: spin 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
    }

    .spinner-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.8rem;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .progress-bar-wrapper {
      height: 4px;
      background: rgba(var(--bs-primary-rgb), 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar-animated {
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, var(--bs-primary), rgba(var(--bs-primary-rgb), 0.5));
      border-radius: 4px;
      animation: progressSlide 1.5s ease-in-out infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.95); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
    }

    @keyframes progressSlide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class LoaderDialogComponent implements OnInit, OnDestroy {
  /** Estado actual del cargador: visibilidad y mensaje a mostrar */
  estado: EstadoCargador = { visible: false, mensaje: '' };

  /** Suscripción al observable del cargador, liberada al destruir el componente */
  private suscripcion!: Subscription;

  /**
   * Constructor del componente.
   *
   * @param servicioDialogo - Servicio centralizado de diálogos del que se
   *                          escucha el estado del cargador global.
   */
  constructor(private servicioDialogo: ServicioDialogo) { }

  /**
   * Hook de ciclo de vida que se suscribe al observable `estadoCargador$`.
   *
   * Cada nueva emisión actualiza el estado local del componente, provocando
   * la re-renderización de la capa superpuesta.
   */
  ngOnInit() {
    this.suscripcion = this.servicioDialogo.estadoCargador$.subscribe(nuevoEstado => {
      this.estado = nuevoEstado;
    });
  }

  /**
   * Hook de ciclo de vida que limpia la suscripción al destruir el componente
   * para prevenir fugas de memoria.
   */
  ngOnDestroy() {
    this.suscripcion.unsubscribe();
  }
}