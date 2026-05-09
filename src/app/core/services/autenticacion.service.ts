import { Injectable } from '@angular/core';
import {
  Auth, authState, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { Usuario, Rol } from '../models/usuario.modelo';

/**
 * Servicio central de autenticación de la aplicación.
 *
 * Gestiona el estado de sesión del usuario mediante Firebase Auth,
 * exponiendo observables reactivos para que el resto de la aplicación
 * pueda reaccionar a cambios de sesión sin acoplarse directamente a Firebase.
 */
@Injectable({
  providedIn: 'root'
})
export class ServicioAutenticacion {

  /** Fuente interna del estado del usuario autenticado */
  private usuarioActualSubject = new BehaviorSubject<Usuario | null>(null);

  /** Observable público del usuario actualmente autenticado */
  public usuarioActual$: Observable<Usuario | null> = this.usuarioActualSubject.asObservable();

  /** Indica de forma reactiva si el usuario autenticado tiene rol de administrador */
  public esAdmin$ = new BehaviorSubject<boolean>(false);

  /**
   * Indica si el servicio de autenticación ya completó su inicialización.
   * El guard de rutas depende de este observable antes de evaluar el acceso.
   */
  public estaInicializado$ = new BehaviorSubject<boolean>(false);

  /**
   * @param auth     - Instancia de Firebase Auth inyectada por AngularFire.
   * @param enrutador - Servicio de enrutamiento para redirigir tras cerrar sesión.
   */
  constructor(private auth: Auth, private enrutador: Router) {
    // Suscripción al estado de autenticación de Firebase.
    // Cada cambio (login, logout, recarga) actualiza el estado local del servicio.
    authState(this.auth).subscribe(usuarioFirebase => {
      if (usuarioFirebase) {
        // Mapeo del usuario de Firebase al modelo interno de la aplicación
        const usuarioMapeado: Usuario = {
          id: usuarioFirebase.uid,
          nombreUsuario: usuarioFirebase.email || '',
          nombre: usuarioFirebase.displayName
            || usuarioFirebase.email?.split('@')[0]
            || '',
          // Por ahora todos los usuarios autenticados se tratan como Admin
          rol: 'Admin' as Rol
        };

        this.usuarioActualSubject.next(usuarioMapeado);
        this.esAdmin$.next(true);
      } else {
        // Sin sesión activa: se limpian los estados
        this.usuarioActualSubject.next(null);
        this.esAdmin$.next(false);
      }

      // Marca el servicio como inicializado tras la primera emisión de Firebase
      this.estaInicializado$.next(true);
    });
  }

  /**
   * Devuelve de forma síncrona el usuario actualmente autenticado.
   * Útil en guards y lógica que no puede suscribirse a un observable.
   */
  get usuarioActual(): Usuario | null {
    return this.usuarioActualSubject.value;
  }

  /**
   * Devuelve de forma síncrona si el usuario actual tiene rol de administrador.
   */
  get esAdmin(): boolean {
    return this.esAdmin$.value;
  }

  /**
   * Inicia sesión con nombre de usuario o correo electrónico y contraseña.
   * Si el valor no contiene `@`, se le agrega el dominio corporativo automáticamente.
   *
   * @param nombreUsuario - Nombre de usuario o correo completo.
   * @param contrasena    - Contraseña del usuario.
   */
  async iniciarSesion(nombreUsuario: string, contrasena: string): Promise<void> {
    const correo = nombreUsuario.includes('@')
      ? nombreUsuario
      : `${nombreUsuario}@comasw.com`;

    await signInWithEmailAndPassword(this.auth, correo, contrasena);
  }

  /**
   * Registra un nuevo usuario en Firebase Auth y asigna su nombre de perfil.
   * Si el nombre de usuario no contiene `@`, se le agrega el dominio corporativo.
   *
   * @param nombreUsuario - Nombre de usuario o correo completo.
   * @param contrasena    - Contraseña para la nueva cuenta.
   * @param rol           - Rol que se asignará al nuevo usuario.
   */
  async registrar(nombreUsuario: string, contrasena: string, rol: Rol): Promise<void> {
    const correo = nombreUsuario.includes('@')
      ? nombreUsuario
      : `${nombreUsuario}@comasw.com`;

    const credencial = await createUserWithEmailAndPassword(this.auth, correo, contrasena);
    await updateProfile(credencial.user, { displayName: nombreUsuario });
  }

  /**
   * Cierra la sesión del usuario actual y redirige a la página de login.
   */
  async cerrarSesion(): Promise<void> {
    await signOut(this.auth);
    this.enrutador.navigate(['/login']);
  }

  /**
   * Actualiza el perfil del usuario autenticado en Firebase y sincroniza
   * el estado local del servicio para reflejar los cambios de inmediato.
   *
   * @param id            - Identificador del usuario (reservado para uso futuro).
   * @param nombreUsuario - Nuevo nombre de usuario o correo.
   * @param contrasena    - Nueva contraseña (opcional; no implementado aún).
   */
  async actualizarUsuario(id: string, nombreUsuario: string, contrasena?: string): Promise<void> {
    const usuarioFirebase = this.auth.currentUser;

    if (usuarioFirebase) {
      if (nombreUsuario) {
        await updateProfile(usuarioFirebase, { displayName: nombreUsuario });
      }

      // Re-dispara la actualización del estado local sin esperar a Firebase
      this.usuarioActualSubject.next({
        ...this.usuarioActualSubject.value!,
        nombre: nombreUsuario,
        nombreUsuario: nombreUsuario.includes('@')
          ? nombreUsuario
          : `${nombreUsuario}@comasw.com`
      });
    }
  }

  /**
   * Envía un correo de recuperación de contraseña al usuario.
   * Si el nombre de usuario no contiene `@`, se le agrega el dominio corporativo.
   *
   * @param nombreUsuario - Nombre de usuario o correo al que enviar el enlace.
   * @returns Mensaje de confirmación con el correo destino.
   */
  async recuperarContrasena(nombreUsuario: string): Promise<string> {
    const correo = nombreUsuario.includes('@')
      ? nombreUsuario
      : `${nombreUsuario}@comasw.com`;

    await sendPasswordResetEmail(this.auth, correo);
    return `Se ha enviado un correo de recuperación a: ${correo}. Revisa tu bandeja de entrada.`;
  }
}