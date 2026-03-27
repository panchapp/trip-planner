import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '@app/core/services/auth.service';
import { AuthStore } from '@app/core/stores/auth.store';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  readonly authStore = inject(AuthStore);
  private readonly authService = inject(AuthService);

  signInWithGoogle(): void {
    this.authService.login();
  }
}
