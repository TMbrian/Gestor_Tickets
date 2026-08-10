import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, finalize, map, shareReplay, tap } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { Usuario, Rol } from '../models/usuario.modelo';
import { environment } from '../../../environments/environment';

/** Margen de refresco proactivo (ADR 0005, pendiente de implementación #5):
 *  se refresca 2 minutos antes de que venza el access token, para que el
 *  caso de uso central (cronómetro corriendo una jornada completa) casi
 *  nunca dependa del camino reactivo (401 + reintento) del interceptor. */
const MARGEN_REFRESCO_PROACTIVO_MS = 2 * 60 * 1000;

interface UsuarioApiDto {
  id: string;
  nombreUsuario: string;
  nombre: string;
  rol: string;
  activo: boolean;
  creadoEn: number;
}

interface RespuestaLogin {
  token: string;
  expiraEn: string; // DateTimeOffset serializado como ISO 8601 por System.Text.Json
  usuario: UsuarioApiDto;
}

/**
 * Servicio central de autenticación de la aplicación (Fase 4 — reemplaza
 * Firebase Auth por la API propia, ADR 0005 de `ticket-manager-api`).
 *
 * Superficie pública preservada EXACTAMENTE igual que la versión Firebase
 * para no tocar componentes ni el guard: `usuarioActual$`, `esAdmin$`,
 * `estaInicializado$`, `usuarioActual`, `esAdmin`, `iniciarSesion`,
 * `registrar`, `cerrarSesion`, `actualizarUsuario`, `recuperarContrasena`.
 *
 * Nuevo (aditivo, no rompe superficie previa): `tokenActual`, `refrescarSesion$`,
 * `forzarCierreSesion`, `intentarRefrescoInicial` — usados por el
 * interceptor HTTP y por el bootstrap de la app.
 *
 * El access token vive SOLO en memoria (nunca `localStorage`/`sessionStorage`,
 * por diseño del ADR 0005 — mitiga exfiltración por XSS).
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioAutenticacion {

  private usuarioActualSubject = new BehaviorSubject<Usuario | null>(null);
  public usuarioActual$: Observable<Usuario | null> = this.usuarioActualSubject.asObservable();

  public esAdmin$ = new BehaviorSubject<boolean>(false);
  public estaInicializado$ = new BehaviorSubject<boolean>(false);

  /** Access token JWT, solo en memoria. */
  private tokenEnMemoria: string | null = null;

  /** Refresco proactivo programado tras cada login/refresh exitoso. */
  private idTimeoutRefrescoProactivo: ReturnType<typeof setTimeout> | null = null;

  /** Single-flight: mientras haya un refresh en curso, todo el mundo
   *  (interceptor ante un 401, el propio timer proactivo, o varios 401
   *  en paralelo) comparte esta misma llamada en vez de disparar una por
   *  cada disparador. Vive acá y no en el interceptor a propósito: cubre
   *  también la carrera entre el refresco proactivo por temporizador y el
   *  reactivo por 401, que un single-flight solo-en-el-interceptor no
   *  vería (son dos disparadores independientes). */
  private refrescoEnCurso$: Observable<void> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly enrutador: Router
  ) {}

  get usuarioActual(): Usuario | null {
    return this.usuarioActualSubject.value;
  }

  get esAdmin(): boolean {
    return this.esAdmin$.value;
  }

  /** Usado por el interceptor para adjuntar `Authorization: Bearer`. */
  get tokenActual(): string | null {
    return this.tokenEnMemoria;
  }

  /**
   * Silent refresh de arranque. Se invoca desde `APP_INITIALIZER` en
   * `main.ts`, ANTES de que el guard evalúe cualquier ruta. Nunca rechaza:
   * sin sesión previa (o expirada) simplemente arranca sin usuario, y
   * `estaInicializado$` se marca en `true` en cualquier caso — el guard ya
   * espera ese observable, no hace falta tocar `autenticacion.guard.ts`.
   */
  async intentarRefrescoInicial(): Promise<void> {
    try {
      await firstValueFrom(this.refrescarSesion$());
    } catch {
      // Silencioso por diseño (ADR 0005): sin sesión válida (401) o ante un
      // problema de red al arrancar, se arranca sin usuario autenticado y
      // el guard redirige a /login. No hay sesión previa en memoria que
      // proteger en este punto (recién arrancó la app), así que no aplica
      // la distinción de estados del Bloqueante 1 acá.
    } finally {
      this.estaInicializado$.next(true);
    }
  }

  async iniciarSesion(nombreUsuario: string, contrasena: string): Promise<void> {
    const respuesta = await firstValueFrom(
      this.http.post<RespuestaLogin>(
        `${environment.apiBaseUrl}/auth/login`,
        { nombreUsuario, contrasena },
        { withCredentials: true }
      )
    );
    this.aplicarSesion(respuesta);
  }

  /**
   * Refresca la sesión contra `/auth/refresh`. Single-flight: si ya hay un
   * refresco en curso, devuelve el mismo Observable compartido en vez de
   * disparar una llamada nueva.
   *
   * Manejo de errores (fix de @security-auditor, Bloqueante 1): SOLO un
   * `401` real (sesión expirada/revocada/reuso detectado — el único código
   * que devuelve `/auth/refresh` según el ADR 0005) limpia la sesión local.
   * Cualquier otro error (timeout, `status 0` sin conexión, `502/503` de un
   * proxy transitorio) se propaga tal cual SIN tocar `usuarioActualSubject`
   * ni el token en memoria: la sesión sigue viva, y el próximo disparador
   * (el timer proactivo reprogramado, o el siguiente 401 real que capture
   * el interceptor) puede reintentar más tarde. Tratar un blip de red como
   * logout iría en contra del objetivo central del ADR (jornada larga con
   * cronómetro corriendo no debe perderse por un problema transitorio).
   */
  refrescarSesion$(): Observable<void> {
    if (!this.refrescoEnCurso$) {
      this.refrescoEnCurso$ = this.http.post<RespuestaLogin>(
        `${environment.apiBaseUrl}/auth/refresh`, null, { withCredentials: true }
      ).pipe(
        tap(respuesta => this.aplicarSesion(respuesta)),
        map(() => void 0),
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            this.limpiarSesion();
          }
          return throwError(() => error);
        }),
        finalize(() => { this.refrescoEnCurso$ = null; }),
        shareReplay(1)
      );
    }
    return this.refrescoEnCurso$;
  }

  /** Cierre de sesión iniciado por el usuario: avisa al backend (revoca la
   *  familia de refresh tokens) y limpia el estado local. Best-effort: si la
   *  llamada de red falla, igual se limpia localmente (el backend además
   *  responde 204 siempre, por diseño, así que un fallo acá es solo de red).
   *  A diferencia de `refrescarSesion$()`, acá SIEMPRE se limpia el estado
   *  sin importar el código: es una acción explícita del usuario, no una
   *  inferencia a partir de un error transitorio. */
  async cerrarSesion(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<void>(`${environment.apiBaseUrl}/auth/logout`, null, { withCredentials: true })
      );
    } catch {
      // best-effort — ver comentario arriba.
    }
    this.limpiarSesion();
    this.enrutador.navigate(['/login']);
  }

  /** Cierre de sesión forzado por el interceptor cuando el refresh (o el
   *  reintento posterior a un refresh exitoso) devuelve un 401 real. NO
   *  llama a `/auth/logout`: si ya hubo un 401, el token es inválido
   *  server-side (expirado, revocado o reuso detectado) y una llamada extra
   *  no aporta nada. Importante: quien llama a este método (el interceptor)
   *  ya verificó que el error es un 401 real antes de invocarlo — ver
   *  `InterceptorAutenticacion.manejarNoAutorizado()`. */
  forzarCierreSesion(): void {
    this.limpiarSesion();
    this.enrutador.navigate(['/login']);
  }

  /**
   * Actualiza el nombre para mostrar contra `PATCH /api/v1/usuarios/{id}`.
   * Requiere rol Admin en el backend (`RequireAuthorization("SoloAdmin")`
   * sobre todo el grupo `/usuarios`).
   *
   * Fix de @security-auditor (Bloqueante 3): si se pasa `contrasena` con
   * un valor no vacío, se lanza un error explícito en vez de ignorarlo en
   * silencio. La versión anterior de este método (y también la vieja
   * implementación con Firebase) descartaba `contrasena` sin avisar — si el
   * usuario cambia de contraseña porque sospecha un compromiso de
   * credenciales, un fallo silencioso es el peor resultado posible: cree
   * que rotó la contraseña y no pasó nada. El backend tampoco lo
   * soportaría de todas formas: `ActualizarUsuarioRequest` no tiene campo
   * `Contrasena` ni `NombreUsuario`, solo `Nombre`, `Rol` y `Activo`.
   */
  async actualizarUsuario(id: string, nombreUsuario: string, contrasena?: string): Promise<void> {
    if (contrasena) {
      throw new Error(
        'El cambio de contraseña no está disponible: la API todavía no expone un endpoint para ' +
        'rotarla (el backend solo permite actualizar nombre, rol y estado activo). Si el motivo es ' +
        'un compromiso de credenciales, contactá a un Administrador para que gestione la cuenta ' +
        'directamente en la base. Pendiente de decisión de producto — ver diseño Fase 4.'
      );
    }

    const dto = await firstValueFrom(
      this.http.patch<UsuarioApiDto>(`${environment.apiBaseUrl}/usuarios/${id}`, { nombre: nombreUsuario })
    );
    this.usuarioActualSubject.next(this.mapearUsuario(dto));
  }

  /**
   * NO IMPLEMENTADO CONTRA LA API — decisión de producto pendiente.
   * La API no tiene autoregistro: `POST /api/v1/usuarios` exige
   * `RequireAuthorization("SoloAdmin")`, o sea ya hace falta estar logueado
   * como Admin para crear un usuario. El flujo actual del login (registrarse
   * sin sesión previa) no tiene equivalente server-side.
   */
  async registrar(_nombreUsuario: string, _contrasena: string, _rol: Rol): Promise<void> {
    throw new Error(
      'El autoregistro ya no está disponible: crear usuarios requiere una sesión de Administrador. ' +
      'Pendiente de decisión de producto (ver diseño Fase 4, @security-auditor / @product-analyst).'
    );
  }

  /**
   * NO IMPLEMENTADO CONTRA LA API — no existe endpoint de recuperación de
   * contraseña por correo en el backend (no hay infraestructura de email).
   */
  async recuperarContrasena(_nombreUsuario: string): Promise<string> {
    throw new Error(
      'La recuperación de contraseña por correo no está implementada en la API. ' +
      'Pendiente de decisión de producto (ver diseño Fase 4).'
    );
  }

  // ───────────────────────────────────────────────────────────────────────

  private aplicarSesion(respuesta: RespuestaLogin): void {
    this.tokenEnMemoria = respuesta.token;
    this.usuarioActualSubject.next(this.mapearUsuario(respuesta.usuario));
    this.esAdmin$.next(respuesta.usuario.rol === 'Admin');
    this.programarRefrescoProactivo(new Date(respuesta.expiraEn));
  }

  /**
   * Fix de @security-auditor (Bloqueante 2): allow-list explícito, NUNCA un
   * spread amplio del DTO. `usuarioActualSubject` es inspeccionable desde
   * Angular DevTools (Redux DevTools / component explorer también, si se
   * usan) — un campo que el backend agregue a `UsuarioDto` sin pensar en el
   * cliente (o un cambio futuro del DTO) no debe poder colarse a memoria
   * del front solo por venir en la respuesta HTTP. Si `UsuarioDto` gana un
   * campo nuevo mañana, este mapeo lo ignora por defecto hasta que alguien
   * decida explícitamente exponerlo acá.
   */
  private mapearUsuario(dto: UsuarioApiDto): Usuario {
    return {
      id: dto.id,
      nombreUsuario: dto.nombreUsuario,
      nombre: dto.nombre,
      rol: dto.rol as Rol
    };
  }

  private limpiarSesion(): void {
    this.tokenEnMemoria = null;
    this.usuarioActualSubject.next(null);
    this.esAdmin$.next(false);
    this.cancelarRefrescoProactivo();
  }

  private programarRefrescoProactivo(expiraEn: Date): void {
    this.cancelarRefrescoProactivo();
    const demoraMs = expiraEn.getTime() - Date.now() - MARGEN_REFRESCO_PROACTIVO_MS;
    this.idTimeoutRefrescoProactivo = setTimeout(
      () => this.refrescarSesion$().subscribe({
        error: () => { /* transitorio: la sesión sigue viva (ver refrescarSesion$); un 401 real
                          ya se limpió a sí mismo. El interceptor reintentará ante el próximo request. */ }
      }),
      Math.max(demoraMs, 0)
    );
  }

  private cancelarRefrescoProactivo(): void {
    if (this.idTimeoutRefrescoProactivo !== null) {
      clearTimeout(this.idTimeoutRefrescoProactivo);
      this.idTimeoutRefrescoProactivo = null;
    }
  }
}
