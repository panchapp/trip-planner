import { TripStatus } from '@app/modules/trips/entities/trip';

export class TripResponseDto {
  readonly id!: string;
  readonly userId!: string;
  readonly title!: string;
  readonly destination!: string;
  readonly startDate!: string | null;
  readonly endDate!: string | null;
  readonly status!: TripStatus;
  readonly coverImageUrl!: string | null;
  readonly createdAt!: string;
  readonly updatedAt!: string;
}
