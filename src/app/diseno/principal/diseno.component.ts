import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComponenteBarraLateral } from '../barra-lateral/barra-lateral.component';
import { ComponenteBarraNavegacion } from '../barra-navegacion/barra-navegacion.component';
import { ConfirmDialogComponent, PromptDialogComponent, LoaderDialogComponent } from '../../shared/components';
import { FormsModule } from '@angular/forms';
import { ServicioAutenticacion } from '../../core/services';

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
  templateUrl: './diseno.component.html',
  styleUrls: ['./diseno.component.scss']
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