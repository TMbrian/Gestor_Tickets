import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService, PromptOptions } from '../../core/services/dialog.service';
import { Subscription } from 'rxjs';

declare var bootstrap: any;

@Component({
  selector: 'app-prompt-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal fade" #promptModal tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 450px;">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header border-0 pb-0 pt-4 px-4 d-flex justify-content-center">
            <div class="rounded-circle bg-opacity-10 d-flex align-items-center justify-content-center" 
                 [ngClass]="'bg-' + options.type" 
                 style="width: 70px; height: 70px;">
              <i class="bi fs-2" [ngClass]="getIcon()"></i>
            </div>
          </div>
          <div class="modal-body text-center p-4">
            <h4 class="fw-bold mb-2 text-body-emphasis">{{ options.title }}</h4>
            <p class="text-secondary mb-3">{{ options.message }}</p>
            
            <div class="text-start">
              <input type="text" 
                     class="form-control form-control-lg rounded-3 border-2 shadow-sm" 
                     [(ngModel)]="inputValue" 
                     [placeholder]="options.placeholder || ''"
                     (keyup.enter)="onConfirm()"
                     #inputElement>
            </div>
          </div>
          <div class="modal-footer border-0 p-4 pt-0 d-flex gap-2">
            <button type="button" class="btn btn-danger flex-fill rounded-pill py-2 fw-medium" (click)="onDecline()">
              {{ options.cancelText || 'Cancelar' }}
            </button>
            <button type="button" class="btn flex-fill rounded-pill py-2 fw-bold shadow-sm" 
                    [ngClass]="'btn-' + options.type"
                    [disabled]="!inputValue.trim()"
                    (click)="onConfirm()">
              {{ options.confirmText || 'Aceptar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-content { background-color: var(--bs-body-bg); color: var(--bs-body-color); }
    .form-control:focus {
      border-color: var(--bs-primary);
      box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.15);
    }
  `]
})
export class PromptDialogComponent implements OnInit, OnDestroy {
  @ViewChild('promptModal') modalRef!: ElementRef;
  @ViewChild('inputElement') inputElement!: ElementRef;
  
  options: PromptOptions = { title: '', message: '', type: 'primary' };
  inputValue: string = '';
  private resolve: ((value: string | null) => void) | null = null;
  private modalInstance: any;
  private subscription: Subscription = new Subscription();

  constructor(private dialogService: DialogService) {}

  ngOnInit() {
    this.subscription = this.dialogService.promptState$.subscribe(state => {
      this.options = state;
      this.inputValue = state.defaultValue || '';
      this.resolve = state.resolve;
      this.show();
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private show() {
    if (!this.modalInstance) {
      this.modalInstance = new bootstrap.Modal(this.modalRef.nativeElement);
    }
    this.modalInstance.show();
    
    // Focus input after modal animation
    setTimeout(() => {
      this.inputElement.nativeElement.focus();
      this.inputElement.nativeElement.select();
    }, 500);
  }

  onConfirm() {
    if (!this.inputValue.trim()) return;
    this.modalInstance.hide();
    if (this.resolve) this.resolve(this.inputValue.trim());
  }

  onDecline() {
    this.modalInstance.hide();
    if (this.resolve) this.resolve(null);
  }

  getIcon() {
    switch (this.options.type) {
      case 'danger': return 'bi-exclamation-triangle text-danger';
      case 'warning': return 'bi-exclamation-circle text-warning';
      case 'success': return 'bi-check-circle text-success';
      default: return 'bi-pencil-square text-primary';
    }
  }
}
