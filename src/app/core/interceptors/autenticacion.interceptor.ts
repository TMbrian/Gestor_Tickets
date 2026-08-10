import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ServicioAutenticacion } from '../services/autenticacion.service';

/**
 * Adjunta `Authorization: Bearer` a las llamadas hacia la API propia y, ante
 * un 401, dispara un refresh (single-flight — resuelto dentro de
 * `ServicioAutenticacion.refrescarSesion$()`, no acá) y reintenta la
 * request original UNA sola vez.
 *
 * Excluye explícitamente `/auth/login`, `/auth/refresh` y `/auth/logout`:
 * ninguna lleva Bearer (login: no hay token todavía; refresh/logout: usan
 * la cookie `rt`, no el header) y ninguna debe disparar un refresh ante su
 * propio 401 — evitaría un loop.
 *
 * Fix de @security-auditor (Bloqueante 1, extendido acá): el logout forzado
 * SOLO se dispara si el error final (del refresh o del reintento) es un
 * `401` real. Un `502`/`503`/timeout no fuerza logout — se propaga el error
 * a quien hizo la request original y la sesión permanece intacta en
 * `ServicioAutenticacion` para el próximo intento.
 *
 * Complejidad cognitiva: `intercept()` = 2 (`||` + `if` dentro del
 * catchError). `manejarNoAutorizado()` = 1 (`if` sobre el status del error
 * final). `esRutaExcluida()` = 1 (lambda de `.some()`). Todas muy por debajo
 * del límite de 15; se mantienen separadas por responsabilidad única, no
 * por necesidad de bajar complejidad.
 */
@Injectable()
export class InterceptorAutenticacion implements HttpInterceptor {

  private static readonly RUTAS_EXCLUIDAS = ['/auth/login', '/auth/refresh', '/auth/logout'];

  /** Pathname base de la API (p.ej. `/api/v1`), calculado una sola vez.
   *  Recomendado de @security-auditor: matchear el pathname EXACTO en vez
   *  de un `.includes()` libre, para no generar falsos positivos con
   *  endpoints futuros que contengan estas substrings como parte de un
   *  nombre más largo (ej. un hipotético `/auth/logout-otras-sesiones`). */
  private readonly basePathname = new URL(environment.apiBaseUrl, window.location.origin).pathname;

  constructor(private readonly servicioAuth: ServicioAutenticacion) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (this.esRutaExcluida(req.url) || !req.url.startsWith(environment.apiBaseUrl)) {
      return next.handle(req);
    }

    return next.handle(this.conBearer(req)).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          return this.manejarNoAutorizado(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private esRutaExcluida(url: string): boolean {
    const pathname = new URL(url, window.location.origin).pathname;
    return InterceptorAutenticacion.RUTAS_EXCLUIDAS.some(
      ruta => pathname === `${this.basePathname}${ruta}`
    );
  }

  private conBearer(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const token = this.servicioAuth.tokenActual;
    return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  }

  /**
   * Refresca (single-flight) y reintenta la request original UNA vez.
   * Solo fuerza logout si el error FINAL (del refresh o del reintento) es
   * un 401 real — cualquier otro código propaga el error sin destruir la
   * sesión (Bloqueante 1 de @security-auditor).
   */
  private manejarNoAutorizado(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return this.servicioAuth.refrescarSesion$().pipe(
      switchMap(() => next.handle(this.conBearer(req))),
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.servicioAuth.forzarCierreSesion();
        }
        return throwError(() => error);
      })
    );
  }
}
