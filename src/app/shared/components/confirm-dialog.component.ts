import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService, DialogOptions } from '../../core/services/dialog.service';
import { Subscription } from 'rxjs';

declare var bootstrap: any;

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal fade" #confirmModal tabindex="-1" aria-hidden="true" data-bs-backdrop="static">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 400px;">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          <div class="modal-header border-0 pb-0 pt-4 px-4 d-flex justify-content-center">
            <div class="rounded-circle bg-opacity-10 p-3" [ngClass]="'bg-' + options.type">
              <i class="bi fs-1" [ngClass]="getIcon()"></i>
            </div>
          </div>
          <div class="modal-body text-center p-4">
            <h4 class="fw-bold mb-2">{{ options.title }}</h4>
            <p class="text-secondary mb-0">{{ options.message }}</p>
          </div>
          <div class="modal-footer border-0 p-4 pt-0 d-flex gap-2">
            <button type="button" class="btn btn-light flex-fill rounded-pill py-2 fw-medium" (click)="onDecline()">
              {{ options.cancelText || 'Cancelar' }}
            </button>
            <button type="button" class="btn flex-fill rounded-pill py-2 fw-bold shadow-sm" [ngClass]="'btn-' + options.type" (click)="onConfirm()">
              {{ options.confirmText || 'Aceptar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-content { background-color: var(--bs-body-bg); color: var(--bs-body-color); }
    .btn-light { background-color: var(--bs-secondary-bg); border-color: var(--bs-border-color); color: var(--bs-body-color); }
    .btn-light:hover { background-color: var(--bs-tertiary-bg); }
  `]
})
export class ConfirmDialogComponent implements OnInit, OnDestroy {
  @ViewChild('confirmModal') modalRef!: ElementRef;
  
  options: DialogOptions = { title: '', message: '', type: 'primary' };
  private resolve: ((value: boolean) => void) | null = null;
  private modalInstance: any;
  private subscription: Subscription = new Subscription();

  constructor(private dialogService: DialogService) {}

  ngOnInit() {
    this.subscription = this.dialogService.dialogState$.subscribe(state => {
      this.options = state;
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
  }

  onConfirm() {
    this.modalInstance.hide();
    if (this.resolve) this.resolve(true);
  }

  onDecline() {
    this.modalInstance.hide();
    if (this.resolve) this.resolve(false);
  }

  getIcon() {
    switch (this.options.type) {
      case 'danger': return 'bi-exclamation-triangle-fill text-danger';
      case 'warning': return 'bi-exclamation-circle-fill text-warning';
      case 'success': return 'bi-check-circle-fill text-success';
      default: return 'bi-question-circle-fill text-primary';
    }
  }
}
