import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Componente raíz de la aplicación.
 *
 * Actúa como contenedor principal: únicamente renderiza el `<router-outlet>`
 * donde Angular monta los componentes correspondientes a la ruta activa.
 * No contiene lógica propia.
 *
 * Nota: El import de `ConfirmDialogComponent` se conserva para uso futuro;
 * actualmente no está declarado en `imports` ni se proyecta en el template.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <router-outlet></router-outlet>
  `,
  styles: []
})
export class AppComponent { }