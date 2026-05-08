import { Injectable } from '@angular/core';
import { Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, sendPasswordResetEmail } from '@angular/fire/auth';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { User, Role } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  public isAdmin$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  public isInitialized$ = new BehaviorSubject<boolean>(false);

  constructor(private auth: Auth, private router: Router) {
    authState(this.auth).subscribe(firebaseUser => {
      if (firebaseUser) {
        const user: User = {
          id: firebaseUser.uid,
          username: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
          role: 'Admin' // Currently treating all logged users as Admin
        };
        this.currentUserSubject.next(user);
        this.isAdmin$.next(true);
      } else {
        this.currentUserSubject.next(null);
        this.isAdmin$.next(false);
      }
      this.isInitialized$.next(true);
    });
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAdmin(): boolean {
    return this.isAdmin$.value;
  }

  async login(username: string, password: string): Promise<void> {
    const email = username.includes('@') ? username : `${username}@comasw.com`;
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(username: string, password: string, role: Role): Promise<void> {
    const email = username.includes('@') ? username : `${username}@comasw.com`;
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    await updateProfile(userCredential.user, { displayName: username });
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  async updateUser(id: string, username: string, password?: string): Promise<void> {
    const user = this.auth.currentUser;
    if (user) {
      if (username) {
        await updateProfile(user, { displayName: username });
      }
      // Re-trigger local state update
      this.currentUserSubject.next({
        ...this.currentUserSubject.value!,
        name: username,
        username: username.includes('@') ? username : `${username}@comasw.com`
      });
    }
  }

  async recoverPassword(username: string): Promise<string> {
    const email = username.includes('@') ? username : `${username}@comasw.com`;
    await sendPasswordResetEmail(this.auth, email);
    return `Se ha enviado un correo de recuperación a: ${email}. Revisa tu bandeja de entrada.`;
  }
}
