import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { AuthStore } from '@core/stores/auth.store';
import type { Trip } from '@shared/models/trip.model';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysFromNow(iso: string): number {
  const target = startOfDay(new Date(iso));
  const today = startOfDay(new Date());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

@Component({
  selector: 'app-hero-greeting',
  templateUrl: './hero-greeting.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroGreeting {
  private readonly authStore = inject(AuthStore);

  readonly activeTrip = input<Trip | null>(null);
  readonly nextUpcoming = input<Trip | undefined>();

  readonly message = computed(() => {
    const user = this.authStore.user();
    const first = user?.firstName?.trim() || 'there';

    const active = this.activeTrip();
    if (active) {
      return `You're exploring ${active.destination} right now — enjoy every moment, ${first}.`;
    }

    const upcoming = this.nextUpcoming();
    if (upcoming?.startDate) {
      const days = daysFromNow(upcoming.startDate);
      if (days === 0) {
        return `Welcome back, ${first}! ${upcoming.destination} starts today.`;
      }
      if (days > 0) {
        return `Welcome back, ${first}! Your next stop, ${upcoming.destination}, is in ${days} day${days === 1 ? '' : 's'}.`;
      }
    }

    return `Welcome home, ${first}. Where should we wander next?`;
  });
}
