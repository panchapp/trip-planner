import type { TripCategoryFilter } from '@app/modules/trips/dto/trip-query.dto';
import type { Trip, TripStatus } from '@app/modules/trips/entities/trip';

export type TripCreateInput = {
  readonly userId: string;
  readonly title: string;
  readonly destination: string;
  readonly startDate: Date | null;
  readonly endDate: Date | null;
  readonly status: TripStatus;
  readonly coverImageUrl: string | null;
};

export type TripUpdatePatch = Partial<{
  title: string;
  destination: string;
  startDate: Date | null;
  endDate: Date | null;
  status: TripStatus;
  coverImageUrl: string | null;
}>;

export abstract class TripRepository {
  abstract create(data: TripCreateInput): Promise<Trip>;

  abstract findById(id: string): Promise<Trip | null>;

  abstract findByUserId(
    userId: string,
    options: {
      readonly limit: number;
      readonly offset: number;
      readonly status?: TripStatus;
      readonly category?: TripCategoryFilter;
    },
  ): Promise<Trip[]>;

  abstract update(id: string, data: TripUpdatePatch): Promise<Trip | null>;

  abstract delete(id: string): Promise<void>;
}
