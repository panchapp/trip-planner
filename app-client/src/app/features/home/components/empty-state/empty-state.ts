import { ChangeDetectionStrategy, Component, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly startPlanning = output<void>();

  onStart(): void {
    this.startPlanning.emit();
  }
}
