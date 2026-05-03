import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './sidebar.component';
import { NavbarComponent } from './navbar.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, NavbarComponent],
  template: `
    <div class="d-flex w-100 custom-vh-100 overflow-hidden bg-body-tertiary">
      <app-sidebar [isCollapsed]="isCollapsed" class="flex-shrink-0 z-2" style="transition: width 0.3s ease;" [style.width]="isCollapsed ? '88px' : '280px'"></app-sidebar>
      <div class="d-flex flex-column flex-grow-1 overflow-hidden">
        <app-navbar (toggleSidebar)="isCollapsed = !isCollapsed"></app-navbar>
        <main class="flex-grow-1 overflow-auto p-4 p-md-5">
          <div class="container-fluid mx-auto px-0" style="max-width: 1400px;">
             <router-outlet></router-outlet>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .custom-vh-100 { height: 100vh; }
  `]
})
export class LayoutComponent {
  isCollapsed = false;
}
