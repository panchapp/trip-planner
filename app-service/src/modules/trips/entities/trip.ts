export type TripStatus = 'draft' | 'confirmed' | 'cancelled';

export interface Trip {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly destination: string;
  readonly startDate: Date | null;
  readonly endDate: Date | null;
  readonly status: TripStatus;
  readonly coverImageUrl: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
