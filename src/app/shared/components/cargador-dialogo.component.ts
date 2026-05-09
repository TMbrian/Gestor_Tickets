import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService, LoaderState } from '../../core/services/dialogo.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-loader-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loader-overlay" *ngIf="state.visible" @fadeInOut>
      <div class="loader-card shadow-lg rounded-4 p-5 text-center">
        <div class="spinner-wrapper mb-4">
          <div class="spinner-ring"></div>
          <i class="bi bi-cloud-arrow-up-fill spinner-icon text-primary"></i>
        </div>
        <h5 class="fw-bold text-body-emphasis mb-2">{{ state.message }}</h5>
        <p class="text-muted small mb-0">Por favor espera un momento...</p>
        <div class="progress-bar-wrapper mt-4">
          <div class="progress-bar-animated"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .loader-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }

    .loader-card {
      background: var(--bs-body-bg);
      border: 1px solid rgba(var(--bs-primary-rgb), 0.15);
      min-width: 320px;
      max-width: 400px;
    }

    .spinner-wrapper {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto;
    }

    .spinner-ring {
      position: absolute;
      width: 80px;
      height: 80px;
      border: 4px solid rgba(var(--bs-primary-rgb), 0.1);
      border-top: 4px solid var(--bs-primary);
      border-radius: 50%;
      animation: spin 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
    }

    .spinner-icon {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 1.8rem;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .progress-bar-wrapper {
      height: 4px;
      background: rgba(var(--bs-primary-rgb), 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-bar-animated {
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, var(--bs-primary), rgba(var(--bs-primary-rgb), 0.5));
      border-radius: 4px;
      animation: progressSlide 1.5s ease-in-out infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.95); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
    }

    @keyframes progressSlide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(350%); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class LoaderDialogComponent implements OnInit, OnDestroy {
  state: LoaderState = { visible: false, message: '' };
  private subscription!: Subscription;

  constructor(private dialogService: DialogService) {}

  ngOnInit() {
    this.subscription = this.dialogService.loaderState$.subscribe(s => {
      this.state = s;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
