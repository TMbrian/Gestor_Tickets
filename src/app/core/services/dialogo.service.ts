import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

/**
 * Opciones de configuración base para cualquier tipo de diálogo modal.
 * Usada directamente en alertas y confirmaciones, y extendida por `OpcionesPrompt`.
 */
export interface OpcionesDialogo {
  /** Título principal del diálogo */
  titulo: string;

  /** Mensaje o cuerpo descriptivo que se muestra al usuario */
  mensaje: string;

  /** Texto del botón de confirmación (por defecto: 'Aceptar') */
  textoConfirmar?: string;

  /** Texto del botón de cancelación (por defecto: 'Cancelar') */
  textoCancelar?: string;

  /** Variante visual del diálogo que determina el color del botón principal */
  tipo?: 'primary' | 'danger' | 'warning' | 'success';

  /** Si es `true`, el diálogo se comporta como alerta (sin botón de cancelar) */
  esAlerta?: boolean;
}

/**
 * Opciones extendidas para diálogos de tipo prompt,
 * que permiten al usuario ingresar un valor de texto.
 */
export interface OpcionesPrompt extends OpcionesDialogo {
  /** Valor inicial precargado en el campo de texto */
  valorPorDefecto?: string;

  /** Texto de ayuda visible cuando el campo está vacío */
  placeholder?: string;

  /** Longitud máxima permitida para la entrada de texto */
  maxLength?: number;
}

/**
 * Estado del indicador de carga global de la aplicación.
 * Controlado por `ServicioDialogo` y consumido por el componente de loader.
 */
export interface EstadoCargador {
  /** Indica si el cargador debe mostrarse en pantalla */
  visible: boolean;

  /** Mensaje informativo que acompaña al indicador de carga */
  mensaje: string;
}

/**
 * Servicio centralizado para la gestión de diálogos modales y el cargador global.
 *
 * Expone observables que los componentes de UI escuchan para renderizar
 * confirmaciones, alertas, prompts y estados de carga de forma imperativa
 * desde cualquier parte de la aplicación.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioDialogo {

  /** Subject interno que emite solicitudes de diálogo de confirmación o alerta */
  private subjectDialogo = new Subject<OpcionesDialogo & { resolver: (valor: boolean) => void }>();

  /** Subject interno que emite solicitudes de diálogo de tipo prompt */
  private subjectPrompt = new Subject<OpcionesPrompt & { resolver: (valor: string | null) => void }>();

  /** Subject interno que controla el estado del cargador global */
  private subjectCargador = new BehaviorSubject<EstadoCargador>({ visible: false, mensaje: '' });

  /** Observable que el componente de diálogo escucha para mostrar confirmaciones y alertas */
  estadoDialogo$ = this.subjectDialogo.asObservable();

  /** Observable que el componente de prompt escucha para solicitar entrada de texto */
  estadoPrompt$ = this.subjectPrompt.asObservable();

  /** Observable que el componente de cargador escucha para mostrarse u ocultarse */
  estadoCargador$ = this.subjectCargador.asObservable();

  /**
   * Abre un diálogo de confirmación con botones de aceptar y cancelar.
   *
   * @param opciones - Configuración del título, mensaje y apariencia del diálogo.
   * @returns Promesa que resuelve `true` si el usuario confirmó, `false` si canceló.
   */
  confirmar(opciones: OpcionesDialogo): Promise<boolean> {
    return new Promise((resolver) => {
      this.subjectDialogo.next({ ...opciones, resolver, esAlerta: false });
    });
  }

  /**
   * Abre un diálogo de alerta informativa con un único botón de aceptar.
   *
   * @param opciones - Configuración del título, mensaje y apariencia del diálogo.
   * @returns Promesa que resuelve `true` cuando el usuario cierra la alerta.
   */
  alerta(opciones: OpcionesDialogo): Promise<boolean> {
    return new Promise((resolver) => {
      this.subjectDialogo.next({ ...opciones, resolver, esAlerta: true });
    });
  }

  /**
   * Abre un diálogo de tipo prompt para solicitar un valor de texto al usuario.
   *
   * @param opciones - Configuración del diálogo incluyendo valor por defecto y placeholder.
   * @returns Promesa que resuelve con el texto ingresado, o `null` si el usuario canceló.
   */
  prompt(opciones: OpcionesPrompt): Promise<string | null> {
    return new Promise((resolver) => {
      this.subjectPrompt.next({ ...opciones, resolver });
    });
  }

  /**
   * Muestra el indicador de carga global con un mensaje opcional.
   *
   * @param mensaje - Texto informativo que acompaña al cargador (por defecto: 'Procesando...').
   */
  mostrarCargador(mensaje: string = 'Procesando...'): void {
    this.subjectCargador.next({ visible: true, mensaje });
  }

  /**
   * Oculta el indicador de carga global y limpia su mensaje.
   */
  ocultarCargador(): void {
    this.subjectCargador.next({ visible: false, mensaje: '' });
  }
}