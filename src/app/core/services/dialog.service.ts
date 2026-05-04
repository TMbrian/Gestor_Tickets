import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface DialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'primary' | 'danger' | 'warning' | 'success';
}

@Injectable({
  providedIn: 'root'
})
export class DialogService {
  private dialogSubject = new Subject<DialogOptions & { resolve: (value: boolean) => void }>();
  
  dialogState$ = this.dialogSubject.asObservable();

  confirm(options: DialogOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.dialogSubject.next({ ...options, resolve });
    });
  }
}
