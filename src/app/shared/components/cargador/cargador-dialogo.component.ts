import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicioDialogo, EstadoCargador } from '../../../core/services/dialogo.service';
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
  templateUrl: './cargador-dialogo.component.html',
  styleUrls: ['./cargador-dialogo.component.scss']
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
  constructor(private readonly servicioDialogo: ServicioDialogo) { }

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