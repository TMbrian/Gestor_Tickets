import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServicioDialogo, OpcionesPrompt } from '../../../core/services/dialogo.service';
import { Subscription } from 'rxjs';

declare var bootstrap: any;

/**
 * Componente de diálogo de tipo prompt.
 *
 * Renderiza un modal de Bootstrap con un campo de texto que permite al usuario
 * ingresar un valor. Se suscribe al observable `estadoPrompt$` del
 * `ServicioDialogo` para abrirse de forma reactiva cada vez que cualquier
 * parte de la aplicación solicita un prompt mediante `servicioDialogo.prompt(...)`.
 *
 * El resultado se devuelve a través del callback `resolver` recibido por el
 * estado: la cadena ingresada al confirmar, o `null` al cancelar.
 */
@Component({
  selector: 'app-prompt-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entrada-dialogo.component.html',
  styleUrls: ['./entrada-dialogo.component.scss']
})
export class PromptDialogComponent implements OnInit, OnDestroy {
  /** Referencia al elemento HTML del modal de Bootstrap */
  @ViewChild('promptModal') referenciaModal!: ElementRef;

  /** Referencia al input de texto para enfocarlo y seleccionarlo al abrir */
  @ViewChild('campoEntrada') campoEntrada!: ElementRef;

  /** Configuración del prompt actualmente visible (título, mensaje, tipo, etc.) */
  opciones: OpcionesPrompt = { titulo: '', mensaje: '', tipo: 'primary' };

  /** Valor de texto que el usuario está ingresando o ya ingresó en el campo */
  valorIngresado: string = '';

  /** Callback que devuelve el resultado al consumidor que invocó el prompt */
  private resolver: ((valor: string | null) => void) | null = null;

  /** Instancia del modal de Bootstrap creada al abrirlo por primera vez */
  private instanciaModal: any;

  /** Agrupador de suscripciones para limpiarlas al destruir el componente */
  private suscripcion: Subscription = new Subscription();

  /**
   * Constructor del componente.
   *
   * @param servicioDialogo - Servicio centralizado de diálogos del que se
   *                          escucha el estado del prompt.
   */
  constructor(private servicioDialogo: ServicioDialogo) { }

  /**
   * Hook de ciclo de vida que se suscribe al observable `estadoPrompt$`.
   *
   * Cada nueva emisión configura las opciones del modal, precarga el valor
   * por defecto, guarda el callback `resolver` y abre el modal.
   */
  ngOnInit() {
    this.suscripcion = this.servicioDialogo.estadoPrompt$.subscribe(estado => {
      this.opciones = estado;
      this.valorIngresado = estado.valorPorDefecto || '';
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
   * Abre el modal de Bootstrap y enfoca el campo de entrada tras la
   * animación de apertura, seleccionando el contenido para facilitar la
   * edición del valor por defecto.
   */
  private mostrar() {
    if (!this.instanciaModal) {
      this.instanciaModal = new bootstrap.Modal(this.referenciaModal.nativeElement);
    }
    this.instanciaModal.show();

    // Enfocar el input después de la animación del modal
    setTimeout(() => {
      this.campoEntrada.nativeElement.focus();
      this.campoEntrada.nativeElement.select();
    }, 500);
  }

  /**
   * Acepta el valor ingresado: cierra el modal y resuelve el prompt con el
   * texto saneado. No hace nada si el valor está vacío.
   */
  alConfirmar() {
    if (!this.valorIngresado.trim()) return;
    this.instanciaModal.hide();
    if (this.resolver) this.resolver(this.valorIngresado.trim());
  }

  /**
   * Cancela el prompt: cierra el modal y resuelve con `null` para indicar
   * al consumidor que el usuario abandonó la captura.
   */
  alCancelar() {
    this.instanciaModal.hide();
    if (this.resolver) this.resolver(null);
  }

  /**
   * Determina la clase de ícono Bootstrap Icons que se mostrará en la
   * cabecera del modal según el tipo de prompt.
   *
   * @returns Clase CSS del ícono junto con su color asociado.
   */
  obtenerIcono() {
    switch (this.opciones.tipo) {
      case 'danger': return 'bi-exclamation-triangle text-danger';
      case 'warning': return 'bi-exclamation-circle text-warning';
      case 'success': return 'bi-check-circle text-success';
      default: return 'bi-pencil-square text-primary';
    }
  }
}