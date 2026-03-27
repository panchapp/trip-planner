import type { TripStatus } from '@app/modules/trips/entities/trip';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export type TripCategoryFilter = 'active' | 'upcoming' | 'past' | 'draft';

export class TripQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  readonly offset?: number;

  @IsOptional()
  @IsIn(['draft', 'confirmed', 'cancelled'])
  readonly status?: TripStatus;

  @IsOptional()
  @IsIn(['active', 'upcoming', 'past', 'draft'])
  readonly category?: TripCategoryFilter;
}
