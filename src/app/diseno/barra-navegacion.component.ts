import { Component, Output, EventEmitter, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/services/autenticacion.service';
import { ThemeService, ThemeMode } from '../core/services/tema.service';
import packageInfo from '../../../package.json';

declare var bootstrap: any;

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <nav class="navbar navbar-expand-lg bg-body border-bottom px-5 py-3 d-flex justify-content-between align-items-center shadow-sm z-1" style="min-height: 70px;">
      <div class="d-flex align-items-center text-body-emphasis">
        <button class="btn btn-link text-body p-0 me-3 d-flex align-items-center" (click)="toggleSidebar.emit()" title="Alternar Menú">
          <i class="bi bi-list fs-3"></i>
        </button>
        <h4 class="mb-0 fw-bold tracking-tight">Gestión de Soporte Técnico</h4>
      </div>
      
      <div class="d-flex align-items-center">
        <!-- Profile info moved to sidebar -->
      </div>
    </nav>

  `
})
export class NavbarComponent {
  @Output() toggleSidebar = new EventEmitter<void>();
  
  constructor() {}
}
