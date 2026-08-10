import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ServicioAutenticacion } from '../../core/services';

/** Prefijo mínimo válido para un `returnUrl` de origen interno (defensa
 *  contra open-redirect si alguien manipula el query param del enlace de
 *  login: se exige ruta relativa de la app, nunca protocolo-relativa `//`
 *  ni una URL absoluta externa). */
const PREFIJO_RUTA_INTERNA_VALIDA = '/';

/**
 * Componente de inicio de sesión.
 *
 * Fase 4: los modos de registro y recuperación de contraseña se retiraron de
 * la vista — la API (`ticket-manager-api`) no tiene autoregistro anónimo
 * (`POST /usuarios` exige rol Admin) ni recuperación por correo. Quedan como
 * pendiente de decisión de producto (ver `ServicioAutenticacion.registrar`/
 * `recuperarContrasena`, que siguen lanzando error explícito por si algo
 * externo los invoca).
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class ComponenteLogin {

  /** Nombre de usuario ingresado en el formulario */
  nombreUsuario = '';

  /** Contraseña ingresada en el formulario */
  contrasena = '';

  /** Indica si hay una operación asíncrona en curso */
  estaCargando = false;

  /** Mensaje de error mostrado al usuario tras una operación fallida */
  mensajeError = '';

  /**
   * @param servicioAuth - Servicio de autenticación para login.
   * @param enrutador    - Servicio de enrutamiento para redirigir tras autenticarse.
   */
  constructor(
    private servicioAuth: ServicioAutenticacion,
    private enrutador: Router,
    private rutaActiva: ActivatedRoute
  ) { }

  /**
   * Procesa el envío del formulario de login.
   */
  async alEnviarFormulario(): Promise<void> {
    this.mensajeError = '';
    if (!this.nombreUsuario || !this.contrasena) return;

    this.estaCargando = true;
    try {
      await this.servicioAuth.iniciarSesion(this.nombreUsuario, this.contrasena);
      this.enrutador.navigateByUrl(this.obtenerUrlDestino());
    } catch (error) {
      this.mensajeError = this.extraerMensajeError(error);
    } finally {
      this.estaCargando = false;
    }
  }

  /** Determina a dónde navegar tras un login exitoso: la ruta originalmente
   *  pedida (`returnUrl`, propagada por el guard) si es una ruta interna
   *  válida, o `/tablero` por defecto. Rechaza explícitamente cualquier
   *  valor que no empiece con `/` o que sea protocolo-relativo (`//host`),
   *  para no habilitar un open-redirect vía query param manipulado. */
  private obtenerUrlDestino(): string {
    const returnUrl = this.rutaActiva.snapshot.queryParams['returnUrl'];
    const esRutaInternaValida = typeof returnUrl === 'string'
      && returnUrl.startsWith(PREFIJO_RUTA_INTERNA_VALIDA)
      && !returnUrl.startsWith('//');
    return esRutaInternaValida ? returnUrl : '/tablero';
  }

  /**
   * Extrae un mensaje de error seguro para mostrar al usuario.
   *
   * El backend ya devuelve mensajes genéricos y pensados para el usuario
   * final en el body de sus respuestas de error (ej. `{"error": "Usuario o
   * contraseña incorrectos."}`, `{"error": "Sesión expirada..."}`) — se usa
   * ESE mensaje, y nunca `error.message` de Angular (que puede traer texto
   * técnico como `Http failure response for .../auth/login: 401 Unauthorized`
   * o, ante un 500 sin manejar, detalles de framework/stack que no deben
   * llegar a la UI).
   */
  private extraerMensajeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return error.error.error;
    }
    return 'Error al procesar la solicitud. Revisa tus credenciales.';
  }
}