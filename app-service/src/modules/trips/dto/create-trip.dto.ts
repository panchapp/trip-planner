import type { TripStatus } from '@app/modules/trips/entities/trip';
import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTripDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  readonly title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  readonly destination!: string;

  @IsOptional()
  @IsDateString()
  readonly startDate?: string;

  @IsOptional()
  @IsDateString()
  readonly endDate?: string;

  @IsOptional()
  @IsIn(['draft', 'confirmed', 'cancelled'])
  readonly status?: TripStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  readonly coverImageUrl?: string;
}
