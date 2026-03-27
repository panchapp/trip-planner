/** Mirrors backend `TripResponseDto` (ISO date strings). */
export type TripStatus = 'draft' | 'confirmed' | 'cancelled';

/** Server-side filter / UX grouping (see `TripQueryDto.category`). */
export type TripCategory = 'active' | 'upcoming' | 'past' | 'draft';

export interface Trip {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly destination: string;
  readonly startDate: string | null;
  readonly endDate: string | null;
  readonly status: TripStatus;
  readonly coverImageUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TripListQuery {
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: TripStatus;
  readonly category?: TripCategory;
}

export interface CreateTripPayload {
  readonly title: string;
  readonly destination: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly status?: TripStatus;
  readonly coverImageUrl?: string;
}

export type UpdateTripPayload = Partial<CreateTripPayload>;

function parseDate(iso: string | null): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Start of local calendar day for comparisons with all-day-style trip bounds. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Categorizes a trip for dashboard sections. Drafts stay in drafts regardless of dates.
 */
export function tripUiCategory(trip: Trip, now: Date = new Date()): TripCategory {
  if (trip.status === 'draft') {
    return 'draft';
  }

  const today = startOfDay(now);
  const start = parseDate(trip.startDate);
  const end = parseDate(trip.endDate);

  if (start && end) {
    const startDay = startOfDay(start);
    const endDay = startOfDay(end);
    if (today >= startDay && today <= endDay && trip.status === 'confirmed') {
      return 'active';
    }
    if (endDay < today) {
      return 'past';
    }
    if (startDay > today) {
      return 'upcoming';
    }
  } else if (start && !end) {
    const startDay = startOfDay(start);
    if (startDay > today) return 'upcoming';
    if (startDay < today) return 'past';
  } else if (!start && end) {
    const endDay = startOfDay(end);
    if (endDay < today) return 'past';
  }

  if (trip.status === 'cancelled') {
    return 'past';
  }

  return 'upcoming';
}

export function isPastTrip(trip: Trip, now: Date = new Date()): boolean {
  return tripUiCategory(trip, now) === 'past';
}
