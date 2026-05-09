import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/** Modos de tema visual disponibles en la aplicación */
export type ModoTema = 'light' | 'dark' | 'system';

/** Clave usada para persistir la preferencia de tema en localStorage */
const CLAVE_PREFERENCIA_TEMA = 'theme-preference';

/**
 * Servicio de gestión del tema visual de la aplicación.
 *
 * Permite alternar entre los modos claro, oscuro y automático (sistema).
 * Persiste la preferencia del usuario en `localStorage` y reacciona
 * a cambios en la preferencia del sistema operativo en tiempo real.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioTema {

  /** Subject interno que mantiene el modo de tema activo */
  private subjectTema = new BehaviorSubject<ModoTema>(this.obtenerTemaGuardado());

  /** Observable público del modo de tema activo */
  tema$ = this.subjectTema.asObservable();

  constructor() {
    this.inicializarTema();

    // Escucha cambios en la preferencia de tema del sistema operativo.
    // Solo tiene efecto cuando el modo activo es 'system'.
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (this.subjectTema.value === 'system') {
        this.aplicarTema('system');
      }
    });
  }

  /**
   * Inicializa el tema al arrancar el servicio aplicando
   * la preferencia guardada o el valor por defecto ('system').
   */
  private inicializarTema(): void {
    const modo = this.obtenerTemaGuardado();
    this.subjectTema.next(modo);
    this.aplicarTema(modo);
  }

  /**
   * Cambia el tema activo, persiste la preferencia en `localStorage`
   * y aplica los cambios visuales de inmediato en el DOM.
   *
   * @param modo - Modo de tema a establecer: 'light', 'dark' o 'system'.
   */
  establecerTema(modo: ModoTema): void {
    localStorage.setItem(CLAVE_PREFERENCIA_TEMA, modo);
    this.subjectTema.next(modo);
    this.aplicarTema(modo);
  }

  /**
   * Devuelve de forma síncrona el modo de tema actualmente activo.
   */
  get temaActual(): ModoTema {
    return this.subjectTema.value;
  }

  /**
   * Aplica el tema indicado al DOM modificando los atributos de Bootstrap
   * y las clases del `body`. Si el modo es 'system', detecta la preferencia
   * del sistema operativo y aplica 'dark' o 'light' según corresponda.
   *
   * @param modo - Modo de tema a aplicar en el DOM.
   */
  private aplicarTema(modo: ModoTema): void {
    let temaEfectivo: Exclude<ModoTema, 'system'> = modo as Exclude<ModoTema, 'system'>;

    if (modo === 'system') {
      try {
        const sistemaEsOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
        temaEfectivo = sistemaEsOscuro ? 'dark' : 'light';
      } catch (error) {
        console.warn('No se pudo detectar el tema del sistema; se usará el modo claro.', error);
        temaEfectivo = 'light';
      }
    }

    // Se aplica en el elemento raíz y en el body para máxima compatibilidad con Bootstrap
    document.documentElement.setAttribute('data-bs-theme', temaEfectivo);

    if (temaEfectivo === 'dark') {
      document.body.setAttribute('data-bs-theme', 'dark');
      document.body.classList.add('bg-dark', 'text-white');
    } else {
      document.body.setAttribute('data-bs-theme', 'light');
      document.body.classList.remove('bg-dark', 'text-white');
    }
  }

  /**
   * Lee la preferencia de tema almacenada en `localStorage`.
   * Retorna `'system'` si no existe ninguna preferencia guardada.
   */
  private obtenerTemaGuardado(): ModoTema {
    return (localStorage.getItem(CLAVE_PREFERENCIA_TEMA) as ModoTema) || 'system';
  }
}