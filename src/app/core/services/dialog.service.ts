import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'warning' | 'success';
  isAlert?: boolean;
}

export interface PromptOptions extends DialogOptions {
  defaultValue?: string;
  placeholder?: string;
}

export interface LoaderState {
  visible: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialogSubject = new Subject<DialogOptions & { resolve: (value: boolean) => void }>();
  private promptSubject = new Subject<PromptOptions & { resolve: (value: string | null) => void }>();
  private loaderSubject = new BehaviorSubject<LoaderState>({ visible: false, message: '' });
  
  dialogState$ = this.dialogSubject.asObservable();
  promptState$ = this.promptSubject.asObservable();
  loaderState$ = this.loaderSubject.asObservable();

  confirm(options: DialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.dialogSubject.next({ ...options, resolve, isAlert: false });
    });
  }

  alert(options: DialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.dialogSubject.next({ ...options, resolve, isAlert: true });
    });
  }

  prompt(options: PromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
      this.promptSubject.next({ ...options, resolve });
    });
  }

  showLoader(message: string = 'Procesando...') {
    this.loaderSubject.next({ visible: true, message });
  }

  hideLoader() {
    this.loaderSubject.next({ visible: false, message: '' });
  }
}
