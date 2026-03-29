import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { Trip, UpdateTripPayload } from '@shared/models/trip.model';
import { sameCalendarDate } from '@shared/utils/trip-date.utils';

type TripField = 'title' | 'startDate' | 'endDate';

const initialState = {
  trip: null as Trip | null,
  originalTrip: null as Trip | null,
  loading: false,
  saving: false,
  error: null as string | null,
};

export const TripWorkspaceStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ trip, originalTrip }) => ({
    isDirty: () => {
      const t = trip();
      const o = originalTrip();
      if (!t || !o) return false;
      return (
        t.title !== o.title ||
        !sameCalendarDate(t.startDate, o.startDate) ||
        !sameCalendarDate(t.endDate, o.endDate)
      );
    },
  })),
  withMethods((store) => ({
    markTripLoading(): void {
      patchState(store, { loading: true, error: null, trip: null, originalTrip: null });
    },

    markTripReloading(): void {
      patchState(store, { loading: true, error: null });
    },

    markTripLoadError(message: string): void {
      patchState(store, {
        loading: false,
        trip: null,
        originalTrip: null,
        error: message,
      });
    },

    setTripFromServer(trip: Trip): void {
      patchState(store, {
        loading: false,
        error: null,
        trip,
        originalTrip: trip,
      });
    },

    revertField(field: TripField): void {
      const current = store.trip();
      const original = store.originalTrip();
      if (!current || !original) return;
      if (field === 'title') {
        patchState(store, { trip: { ...current, title: original.title } });
        return;
      }
      patchState(store, {
        trip: {
          ...current,
          [field]: original[field],
        },
      });
    },

    updateField(field: TripField, value: string | null): void {
      const current = store.trip();
      if (!current) return;
      const next: Trip =
        field === 'title'
          ? { ...current, title: value ?? '' }
          : {
              ...current,
              [field]: value === '' || value === null ? null : value,
            };
      patchState(store, { trip: next });
    },

    buildUpdatePayload(): UpdateTripPayload {
      const trip = store.trip();
      const original = store.originalTrip();
      if (!trip || !original) return {};
      return {
        ...(trip.title !== original.title ? { title: trip.title } : {}),
        ...(!sameCalendarDate(trip.startDate, original.startDate)
          ? { startDate: trip.startDate ?? undefined }
          : {}),
        ...(!sameCalendarDate(trip.endDate, original.endDate)
          ? { endDate: trip.endDate ?? undefined }
          : {}),
      };
    },

    beginSave(): void {
      patchState(store, { saving: true, error: null });
    },

    applySavedTrip(trip: Trip): void {
      patchState(store, {
        trip,
        originalTrip: trip,
        saving: false,
      });
    },

    markSaveError(message: string): void {
      patchState(store, { saving: false, error: message });
    },

    clear(): void {
      patchState(store, { ...initialState });
    },
  })),
);
