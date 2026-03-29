import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { LucideArrowRight } from '@lucide/angular';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideArrowRight],
})
export class EmptyState {
  readonly startPlanning = output<void>();

  onStart(): void {
    this.startPlanning.emit();
  }
}
