import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideCalendar } from '@lucide/angular';
import type { Trip } from '@shared/models/trip.model';
import { tripUiCategory } from '@shared/models/trip.model';

@Component({
  selector: 'app-trip-card',
  templateUrl: './trip-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCalendar],
})
export class TripCard {
  readonly trip = input.required<Trip>();
  /** Shown when the API does not yet expose collaborator counts. */
  readonly collaboratorCount = input<number>(0);

  readonly selectTrip = output<Trip>();

  readonly badgeLabel = computed(() => {
    const t = this.trip();
    const cat = tripUiCategory(t);
    if (cat === 'active') return 'Current trip';
    if (cat === 'draft') return 'Draft';
    if (cat === 'upcoming') return 'Upcoming';
    if (cat === 'past') return 'Past';
    return null;
  });

  formatDateRange(trip: Trip): string {
    if (!trip.startDate && !trip.endDate) {
      return 'Dates to be set';
    }
    const opts: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    };
    const start = trip.startDate
      ? new Date(trip.startDate).toLocaleDateString(undefined, opts)
      : '…';
    const end = trip.endDate ? new Date(trip.endDate).toLocaleDateString(undefined, opts) : '…';
    return `${start} – ${end}`;
  }

  onSelect(): void {
    this.selectTrip.emit(this.trip());
  }
}
