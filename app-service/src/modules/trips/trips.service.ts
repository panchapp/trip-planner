import type { User } from '@app/modules/auth/entities/user';
import type { CreateTripDto } from '@app/modules/trips/dto/create-trip.dto';
import type { TripQueryDto } from '@app/modules/trips/dto/trip-query.dto';
import { TripResponseDto } from '@app/modules/trips/dto/trip-response.dto';
import type { UpdateTripDto } from '@app/modules/trips/dto/update-trip.dto';
import type { Trip, TripStatus } from '@app/modules/trips/entities/trip';
import {
  TripRepository,
  type TripUpdatePatch,
} from '@app/modules/trips/interfaces/trip.repository';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;

@Injectable()
export class TripsService {
  constructor(private readonly tripRepository: TripRepository) {}

  async create(user: User, dto: CreateTripDto): Promise<TripResponseDto> {
    const startDate = dto.startDate ? new Date(dto.startDate) : null;
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    const status: TripStatus = dto.status ?? 'draft';
    const coverImageUrl = dto.coverImageUrl ?? null;
    this.assertDateOrder(startDate, endDate);
    this.assertConfirmedHasDates(status, startDate, endDate);
    const trip = await this.tripRepository.create({
      userId: user.id,
      title: dto.title,
      destination: dto.destination,
      startDate,
      endDate,
      status,
      coverImageUrl,
    });
    return this.toResponseDto(trip);
  }

  async findAll(user: User, query: TripQueryDto): Promise<TripResponseDto[]> {
    const limit = query.limit ?? DEFAULT_LIMIT;
    const offset = query.offset ?? DEFAULT_OFFSET;
    const trips = await this.tripRepository.findByUserId(user.id, {
      limit,
      offset,
      status: query.status,
      category: query.category,
    });
    return trips.map((t) => this.toResponseDto(t));
  }

  async findOne(user: User, id: string): Promise<TripResponseDto> {
    const trip = await this.requireOwnedTrip(user.id, id);
    return this.toResponseDto(trip);
  }

  async update(user: User, id: string, dto: UpdateTripDto): Promise<TripResponseDto> {
    const trip = await this.requireOwnedTrip(user.id, id);
    const nextStart =
      dto.startDate !== undefined
        ? dto.startDate
          ? new Date(dto.startDate)
          : null
        : trip.startDate;
    const nextEnd =
      dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : trip.endDate;
    const nextStatus: TripStatus = dto.status ?? trip.status;
    this.assertDateOrder(nextStart, nextEnd);
    this.assertConfirmedHasDates(nextStatus, nextStart, nextEnd);
    const patch = this.buildUpdatePatch(dto, nextStart, nextEnd, nextStatus);
    const updated = await this.tripRepository.update(id, patch);
    if (!updated) {
      throw new NotFoundException(`Trip #${id} not found`);
    }
    return this.toResponseDto(updated);
  }

  async remove(user: User, id: string): Promise<void> {
    await this.requireOwnedTrip(user.id, id);
    await this.tripRepository.delete(id);
  }

  private buildUpdatePatch(
    dto: UpdateTripDto,
    nextStart: Date | null,
    nextEnd: Date | null,
    nextStatus: TripStatus,
  ): TripUpdatePatch {
    const patch: TripUpdatePatch = {};
    if (dto.title !== undefined) {
      patch.title = dto.title;
    }
    if (dto.destination !== undefined) {
      patch.destination = dto.destination;
    }
    if (dto.startDate !== undefined) {
      patch.startDate = nextStart;
    }
    if (dto.endDate !== undefined) {
      patch.endDate = nextEnd;
    }
    if (dto.status !== undefined) {
      patch.status = nextStatus;
    }
    if (dto.coverImageUrl !== undefined) {
      patch.coverImageUrl = dto.coverImageUrl ?? null;
    }
    return patch;
  }

  private async requireOwnedTrip(userId: string, id: string): Promise<Trip> {
    const trip = await this.tripRepository.findById(id);
    if (!trip || trip.userId !== userId) {
      throw new NotFoundException(`Trip #${id} not found`);
    }
    return trip;
  }

  private assertDateOrder(start: Date | null, end: Date | null): void {
    if (start !== null && end !== null && start.getTime() > end.getTime()) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }
  }

  private assertConfirmedHasDates(status: TripStatus, start: Date | null, end: Date | null): void {
    if (status === 'confirmed' && (start === null || end === null)) {
      throw new BadRequestException('Confirmed trips require startDate and endDate');
    }
  }

  private toResponseDto(trip: Trip): TripResponseDto {
    return {
      id: trip.id,
      userId: trip.userId,
      title: trip.title,
      destination: trip.destination,
      startDate: trip.startDate?.toISOString() ?? null,
      endDate: trip.endDate?.toISOString() ?? null,
      status: trip.status,
      coverImageUrl: trip.coverImageUrl,
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
    };
  }
}
