import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { User, Role } from '../models/user.model';
import { DbService } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(this.getStoredUser());
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  public isAdmin$: Observable<boolean> = new BehaviorSubject<boolean>(this.currentUserSubject.value?.role === 'Admin');

  constructor(private db: DbService) {
    this.currentUser$.subscribe(user => {
      (this.isAdmin$ as BehaviorSubject<boolean>).next(user?.role === 'Admin');
    });
  }

  async register(username: string, password: string, role: Role): Promise<void> {
    const fullUsername = username + '@comasw.com';
    const existingUser = await this.db.users.get({ username: fullUsername });
    
    if (existingUser) {
      throw new Error('El usuario ya existe');
    }

    // Check if an admin already exists
    const adminCount = await this.db.users.count();
    if (adminCount > 0) {
      throw new Error('Solo se permite un Administrador en el sistema. Por favor inicia sesión.');
    }

    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const user = { 
      id: generateId(), 
      username: fullUsername, 
      password,
      name: username, 
      role 
    };
    
    await this.db.users.add(user);
    this.setCurrentUser(user);
  }

  async login(username: string, password: string): Promise<void> {
    const fullUsername = username + '@comasw.com';
    const user = await this.db.users.get({ username: fullUsername });

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.password !== password) {
      throw new Error('Contraseña incorrecta');
    }
    
    this.setCurrentUser(user);
  }

  async updateUser(id: string, username: string, password?: string): Promise<void> {
    const fullUsername = username + (username.includes('@') ? '' : '@comasw.com');
    const updateData: any = { username: fullUsername, name: username };
    if (password) updateData.password = password;

    await this.db.users.update(id, updateData);
    const updatedUser = await this.db.users.get(id);
    if (updatedUser) {
      this.setCurrentUser(updatedUser);
    }
  }

  async recoverPassword(username: string): Promise<string> {
    const fullUsername = username + (username.includes('@') ? '' : '@comasw.com');
    const user = await this.db.users.get({ username: fullUsername });
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    return `Usuario encontrado: ${user.username}\nTu contraseña es: ${user.password}`;
  }

  private setCurrentUser(user: any): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAdmin(): boolean {
    return this.currentUser?.role === 'Admin';
  }

  private getStoredUser(): User | null {
    try {
      const user = localStorage.getItem('currentUser');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }
}
