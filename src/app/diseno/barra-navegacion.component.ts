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
  template: `
    <nav class="navbar navbar-expand-lg bg-body border-bottom px-5 py-3 d-flex justify-content-between align-items-center shadow-sm z-1" 
         style="min-height: 70px;">

      <div class="d-flex align-items-center text-body-emphasis">
        <!-- Botón para colapsar o expandir la barra lateral -->
        <button class="btn btn-link text-body p-0 me-3 d-flex align-items-center" 
                (click)="alternarBarraLateral.emit()" 
                title="Alternar Menú">
          <i class="bi bi-list fs-3"></i>
        </button>
        <h4 class="mb-0 fw-bold tracking-tight">Gestión de Soporte Técnico</h4>
      </div>

      <div class="d-flex align-items-center">
        <!-- Perfil e información del usuario se gestionan desde la barra lateral -->
      </div>
    </nav>
  `
})
export class ComponenteBarraNavegacion {

  /**
   * Emite un evento cuando el usuario hace clic en el botón de menú,
   * indicando al componente padre que debe alternar el estado de la barra lateral.
   */
  @Output() alternarBarraLateral = new EventEmitter<void>();
}