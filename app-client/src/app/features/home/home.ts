import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { AuthStore } from '@app/core/stores/auth.store';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  protected readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.authStore.setUser(null);
        void this.router.navigateByUrl('/login');
      },
      error: () => {
        this.authStore.setUser(null);
        void this.router.navigateByUrl('/login');
      },
    });
  }
}
