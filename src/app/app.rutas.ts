import { Routes } from '@angular/router';
import { authGuard } from './core/guards/autenticacion.guard';
import { LoginComponent } from './features/autenticacion/login.component';
import { LayoutComponent } from './diseno/diseno.component';
import { DashboardComponent } from './features/tablero/tablero.component';
import { TicketListComponent } from './features/tickets/lista-tickets.component';
import { SettingsComponent } from './features/configuracion/configuracion.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    component: LayoutComponent, 
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'tickets', component: TicketListComponent },
      { path: 'settings', component: SettingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: '' }
];
