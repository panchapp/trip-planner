import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-quick-action-fab',
  templateUrl: './quick-action-fab.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuickActionFab {
  readonly planNewTrip = output<void>();

  onClick(): void {
    this.planNewTrip.emit();
  }
}
