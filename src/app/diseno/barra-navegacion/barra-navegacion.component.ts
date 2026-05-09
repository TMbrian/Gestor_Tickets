import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Componente de barra de navegación superior de la aplicación.
 *
 * Muestra el título principal del sistema y el botón para alternar
 * la visibilidad de la barra lateral. La información de perfil y
 * tema se gestiona directamente desde `ComponenteBarraLateral`.
 */
@Component({
  selector: 'app-barra-navegacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './barra-navegacion.component.html',
  styleUrls: ['./barra-navegacion.component.scss']
})
export class ComponenteBarraNavegacion {

  /**
   * Emite un evento cuando el usuario hace clic en el botón de menú,
   * indicando al componente padre que debe alternar el estado de la barra lateral.
   */
  @Output() alternarBarraLateral = new EventEmitter<void>();
}