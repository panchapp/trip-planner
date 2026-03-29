import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TripService } from '@core/services/trip.service';
import { TripWorkspaceStore } from '@core/stores/trip-workspace.store';
import { TripWorkspaceFooter } from '@features/trip-workspace/components/trip-workspace-footer/trip-workspace-footer';
import { TripWorkspaceHeader } from '@features/trip-workspace/components/trip-workspace-header/trip-workspace-header';
import { errorMessage } from '@shared/utils/error.utils';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-trip-workspace',
  templateUrl: './trip-workspace.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, TripWorkspaceHeader, TripWorkspaceFooter],
})
export class TripWorkspace {
  readonly store = inject(TripWorkspaceStore);
  readonly tripService = inject(TripService);

  readonly id = input.required<string>();

  readonly tripLoad = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.tripService.getTrip(id),
  });

  private readonly syncTripResource = effect(() => {
    this.id();
    const status = this.tripLoad.status();
    switch (status) {
      case 'idle':
      case 'loading':
        this.store.markTripLoading();
        break;
      case 'reloading':
        this.store.markTripReloading();
        break;
      case 'error':
        this.store.markTripLoadError(errorMessage(this.tripLoad.error()));
        break;
      case 'resolved':
      case 'local': {
        const trip = this.tripLoad.value();
        if (trip) {
          this.store.setTripFromServer(trip);
        }
        break;
      }
    }
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.store.clear());
  }

  async save(): Promise<void> {
    const trip = this.store.trip();
    const original = this.store.originalTrip();
    if (!trip || !original || !this.store.isDirty()) return;

    this.store.beginSave();
    try {
      const payload = this.store.buildUpdatePayload();
      const updated = await firstValueFrom(this.tripService.updateTrip(trip.id, payload));
      this.store.applySavedTrip(updated);
    } catch (e) {
      this.store.markSaveError(errorMessage(e));
    }
  }
}
