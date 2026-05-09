import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServicioDialogo, OpcionesDialogo } from '../../../core/services/dialogo.service';
import { Subscription } from 'rxjs';

declare var bootstrap: any;

/**
 * Componente de diálogo de confirmación y alerta.
 *
 * Renderiza un modal de Bootstrap centrado que se utiliza tanto para
 * confirmaciones (con botones Aceptar/Cancelar) como para alertas
 * (sólo botón Aceptar). Se suscribe al observable `estadoDialogo$` del
 * `ServicioDialogo` para abrirse de forma reactiva cuando cualquier parte
 * de la aplicación invoque `servicioDialogo.confirmar(...)` o
 * `servicioDialogo.alerta(...)`.
 *
 * El resultado se devuelve a través del callback `resolver` recibido por el
 * estado: `true` al confirmar, `false` al cancelar.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmar-dialogo.component.html',
  styleUrls: ['./confirmar-dialogo.component.scss']
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  /** Referencia al elemento HTML del modal de Bootstrap */
  @ViewChild('confirmModal') referenciaModal!: ElementRef;

  /** Configuración del diálogo actualmente visible (título, mensaje, tipo, etc.) */
  opciones: OpcionesDialogo = { titulo: '', mensaje: '', tipo: 'primary' };

  /** Callback que devuelve el resultado al consumidor que invocó el diálogo */
  private resolver: ((valor: boolean) => void) | null = null;

  /** Instancia del modal de Bootstrap creada al abrirlo por primera vez */
  private instanciaModal: any;

  /** Agrupador de suscripciones para limpiarlas al destruir el componente */
  private suscripcion: Subscription = new Subscription();

  /**
   * Constructor del componente.
   *
   * @param servicioDialogo - Servicio centralizado de diálogos del que se
   *                          escucha el estado del diálogo de confirmación.
   */
  constructor(private servicioDialogo: ServicioDialogo) { }

  /**
   * Hook de ciclo de vida que se suscribe al observable `estadoDialogo$`.
   *
   * Cada nueva emisión configura las opciones del modal, guarda el callback
   * `resolver` y abre el modal.
   */
  ngOnInit() {
    this.suscripcion = this.servicioDialogo.estadoDialogo$.subscribe(estado => {
      this.opciones = estado;
      this.resolver = estado.resolver;
      this.mostrar();
    });
  }

  /**
   * Hook de ciclo de vida que limpia la suscripción al destruir el componente
   * para prevenir fugas de memoria.
   */
  ngOnDestroy() {
    this.suscripcion.unsubscribe();
  }

  /**
   * Abre el modal de Bootstrap, creándolo de forma perezosa la primera vez
   * que se invoca.
   */
  private mostrar() {
    if (!this.instanciaModal) {
      this.instanciaModal = new bootstrap.Modal(this.referenciaModal.nativeElement);
    }
    this.instanciaModal.show();
  }

  /**
   * Acepta el diálogo: cierra el modal y resuelve con `true`.
   */
  alConfirmar() {
    this.instanciaModal.hide();
    if (this.resolver) this.resolver(true);
  }

  /**
   * Rechaza el diálogo: cierra el modal y resuelve con `false` para indicar
   * al consumidor que el usuario canceló la acción.
   */
  alCancelar() {
    this.instanciaModal.hide();
    if (this.resolver) this.resolver(false);
  }

  /**
   * Determina la clase de ícono Bootstrap Icons que se mostrará en la
   * cabecera del modal según el tipo de diálogo.
   *
   * @returns Clase CSS del ícono junto con su color asociado.
   */
  obtenerIcono() {
    switch (this.opciones.tipo) {
      case 'danger': return 'bi-exclamation-triangle-fill text-danger';
      case 'warning': return 'bi-exclamation-circle-fill text-warning';
      case 'success': return 'bi-check-circle-fill text-success';
      default: return 'bi-question-circle-fill text-primary';
    }
  }
}