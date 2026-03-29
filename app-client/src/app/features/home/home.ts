import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { TripService } from '@core/services/trip.service';
import { AuthStore } from '@core/stores/auth.store';
import { EmptyState } from '@features/home/components/empty-state/empty-state';
import { HeroGreeting } from '@features/home/components/hero-greeting/hero-greeting';
import { QuickActionFab } from '@shared/components/quick-action-fab/quick-action-fab';
import { TripCard } from '@shared/components/trip-card/trip-card';
import { tripUiCategory, type Trip } from '@shared/models/trip.model';
import { firstValueFrom } from 'rxjs';

const DASHBOARD_LIMIT = 100;
const PAST_PAGE_SIZE = 10;

function sortUpcoming(a: Trip, b: Trip): number {
  const as = a.startDate ?? '';
  const bs = b.startDate ?? '';
  return as.localeCompare(bs);
}

function sortPast(a: Trip, b: Trip): number {
  const ae = a.endDate ?? a.startDate ?? '';
  const be = b.endDate ?? b.startDate ?? '';
  return be.localeCompare(ae);
}

function mergeById(existing: Trip[], incoming: Trip[]): Trip[] {
  const map = new Map<string, Trip>();
  for (const t of existing) map.set(t.id, t);
  for (const t of incoming) map.set(t.id, t);
  return [...map.values()];
}

function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return 'Something went wrong';
}

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TripCard, QuickActionFab, HeroGreeting, EmptyState],
})
export class Home {
  readonly authStore = inject(AuthStore);

  private readonly tripService = inject(TripService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly showPast = signal(false);

  readonly trips = signal<Trip[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pastLoadingMore = signal(false);
  readonly pastNextOffset = signal(0);
  readonly pastHasMore = signal(false);

  private readonly now = () => new Date();

  readonly activeTrip = computed(() => {
    const n = this.now();
    return this.trips().find((t) => tripUiCategory(t, n) === 'active') ?? null;
  });

  readonly upcomingTrips = computed(() => {
    const n = this.now();
    return this.trips()
      .filter((t) => tripUiCategory(t, n) === 'upcoming')
      .sort(sortUpcoming);
  });

  readonly pastTrips = computed(() => {
    const n = this.now();
    return this.trips()
      .filter((t) => tripUiCategory(t, n) === 'past')
      .sort(sortPast);
  });

  readonly draftTrips = computed(() => {
    const n = this.now();
    return this.trips().filter((t) => tripUiCategory(t, n) === 'draft');
  });

  readonly isEmpty = computed(() => this.trips().length === 0);

  constructor() {
    void this.loadTrips();
  }

  async loadTrips(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [dashboard, pastPage] = await Promise.all([
        firstValueFrom(this.tripService.getTrips({ limit: DASHBOARD_LIMIT, offset: 0 })),
        firstValueFrom(
          this.tripService.getTrips({ category: 'past', limit: PAST_PAGE_SIZE, offset: 0 }),
        ),
      ]);
      const merged = mergeById(dashboard, pastPage);
      this.trips.set(merged);
      this.loading.set(false);
      this.pastNextOffset.set(pastPage.length);
      this.pastHasMore.set(pastPage.length === PAST_PAGE_SIZE);
    } catch (e) {
      this.loading.set(false);
      this.error.set(errorMessage(e));
    }
  }

  async loadMorePast(): Promise<void> {
    if (this.pastLoadingMore() || !this.pastHasMore()) return;
    this.pastLoadingMore.set(true);
    this.error.set(null);
    try {
      const page = await firstValueFrom(
        this.tripService.getTrips({
          category: 'past',
          offset: this.pastNextOffset(),
          limit: PAST_PAGE_SIZE,
        }),
      );
      const merged = mergeById(this.trips(), page);
      this.trips.set(merged);
      this.pastNextOffset.update((o) => o + page.length);
      this.pastHasMore.set(page.length >= PAST_PAGE_SIZE);
      this.pastLoadingMore.set(false);
    } catch (e) {
      this.pastLoadingMore.set(false);
      this.error.set(errorMessage(e));
    }
  }

  async createDraftTrip(): Promise<void> {
    this.error.set(null);
    try {
      const created = await firstValueFrom(
        this.tripService.createTrip({
          title: 'New trip',
          destination: 'Somewhere great',
          status: 'draft',
        }),
      );
      this.trips.set(mergeById(this.trips(), [created]));
    } catch (e) {
      this.error.set(errorMessage(e));
    }
  }

  logout(): void {
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

  togglePast(): void {
    this.showPast.update((v) => !v);
  }

  onTripSelected(trip: Trip): void {
    void this.router.navigate(['/trips', trip.id]);
  }

  onPlanNewTrip(): void {
    void this.createDraftTrip();
  }

  onStartPlanning(): void {
    void this.createDraftTrip();
  }

  onRetryLoad(): void {
    void this.loadTrips();
  }

  onLoadMorePast(): void {
    void this.loadMorePast();
  }
}
