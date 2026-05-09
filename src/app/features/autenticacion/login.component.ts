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
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
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