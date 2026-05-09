import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ServicioAutenticacion, ServicioTema, ModoTema, ServicioDialogo } from '../../core/services';
import packageInfo from '../../../../package.json';

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
  templateUrl: './barra-lateral.component.html',
  styleUrls: ['./barra-lateral.component.scss']
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