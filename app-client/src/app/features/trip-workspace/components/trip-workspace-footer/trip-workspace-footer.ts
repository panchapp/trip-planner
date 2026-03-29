import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { TripWorkspaceStore } from '@core/stores/trip-workspace.store';

@Component({
  selector: 'app-trip-workspace-footer',
  templateUrl: './trip-workspace-footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TripWorkspaceFooter {
  readonly store = inject(TripWorkspaceStore);
  readonly saveRequested = output<void>();

  onSave(): void {
    this.saveRequested.emit();
  }
}
