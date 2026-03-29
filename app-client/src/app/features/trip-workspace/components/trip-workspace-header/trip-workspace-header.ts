import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TripWorkspaceStore } from '@core/stores/trip-workspace.store';
import { LucidePencil } from '@lucide/angular';
import { DatePickerField } from '@shared/components/date-picker-field/date-picker-field';
import { fromDateInputValue, toDateInputValue } from '@shared/utils/trip-date.utils';

@Component({
  selector: 'app-trip-workspace-header',
  templateUrl: './trip-workspace-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DatePickerField, LucidePencil],
})
export class TripWorkspaceHeader {
  readonly injector = inject(Injector);
  readonly store = inject(TripWorkspaceStore);

  readonly titleEditing = signal(false);

  private readonly titleInputRef = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  readonly trip = computed(() => this.store.trip());
  readonly dateInputStart = computed(() => toDateInputValue(this.trip()?.startDate ?? null));
  readonly dateInputEnd = computed(() => toDateInputValue(this.trip()?.endDate ?? null));
  readonly dateMaxForStart = computed(() => {
    const t = this.trip();
    return t?.endDate ? toDateInputValue(t.endDate) : null;
  });
  readonly dateMinForEnd = computed(() => {
    const t = this.trip();
    return t?.startDate ? toDateInputValue(t.startDate) : null;
  });

  onTitleInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.store.updateField('title', v);
  }

  startTitleEdit(): void {
    this.titleEditing.set(true);
    afterNextRender(
      () => {
        const el = this.titleInputRef()?.nativeElement;
        el?.focus();
        el?.select();
      },
      { injector: this.injector },
    );
  }

  finishTitleEdit(): void {
    this.titleEditing.set(false);
  }

  onTitleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.store.revertField('title');
      this.finishTitleEdit();
    }
  }

  onStartDateChange(ymd: string): void {
    this.store.updateField('startDate', fromDateInputValue(ymd));
  }

  onEndDateChange(ymd: string): void {
    this.store.updateField('endDate', fromDateInputValue(ymd));
  }
}
