import type { TripCategoryFilter } from '@app/modules/trips/dto/trip-query.dto';
import type { Trip, TripStatus } from '@app/modules/trips/entities/trip';
import {
  TripRepository,
  type TripCreateInput,
  type TripUpdatePatch,
} from '@app/modules/trips/interfaces/trip.repository';
import { KNEX } from '@common/database/database.constants';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Knex } from 'knex';

interface TripRow {
  id: string;
  user_id: string;
  title: string;
  destination: string;
  start_date: Date | null;
  end_date: Date | null;
  status: TripStatus;
  cover_image_url: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: TripRow): Trip {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    destination: row.destination,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    coverImageUrl: row.cover_image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function applyCategoryFilter(
  qb: Knex.QueryBuilder<TripRow>,
  category: TripCategoryFilter,
  now: Date,
): void {
  switch (category) {
    case 'draft':
      qb.andWhere('status', 'draft');
      break;
    case 'active':
      qb.andWhere('status', 'confirmed')
        .whereNotNull('start_date')
        .whereNotNull('end_date')
        .andWhere('start_date', '<=', now)
        .andWhere('end_date', '>=', now);
      break;
    case 'upcoming':
      qb.andWhere('status', 'confirmed')
        .whereNotNull('start_date')
        .andWhere('start_date', '>', now);
      break;
    case 'past':
      qb.andWhere(function () {
        this.where('status', 'cancelled').orWhere(function () {
          this.whereNot('status', 'draft').andWhere(function () {
            this.where(function () {
              this.whereNotNull('end_date').andWhere('end_date', '<', now);
            }).orWhere(function () {
              this.whereNull('end_date')
                .whereNotNull('start_date')
                .andWhere('start_date', '<', now);
            });
          });
        });
      });
      break;
    default: {
      const _exhaustive: never = category;
      throw new InternalServerErrorException(`Unhandled trip category: ${_exhaustive as string}`);
    }
  }
}

function applyListOrder(
  qb: Knex.QueryBuilder<TripRow>,
  category: TripCategoryFilter | undefined,
): void {
  if (category === 'upcoming') {
    qb.orderBy('start_date', 'asc');
    return;
  }
  if (category === 'past') {
    qb.orderByRaw('end_date DESC NULLS LAST, start_date DESC NULLS LAST, updated_at DESC');
    return;
  }
  if (category === 'draft') {
    qb.orderBy('updated_at', 'desc');
    return;
  }
  if (category === 'active') {
    qb.orderBy('start_date', 'desc');
    return;
  }
  qb.orderBy('created_at', 'desc');
}

@Injectable()
export class TripKnexRepository extends TripRepository {
  constructor(@Inject(KNEX) private readonly knex: Knex) {
    super();
  }

  async create(data: TripCreateInput): Promise<Trip> {
    const [row] = await this.knex<TripRow>('trips')
      .insert({
        user_id: data.userId,
        title: data.title,
        destination: data.destination,
        start_date: data.startDate,
        end_date: data.endDate,
        status: data.status,
        cover_image_url: data.coverImageUrl,
      })
      .returning('*');
    return mapRow(row);
  }

  async findById(id: string): Promise<Trip | null> {
    const row = await this.knex<TripRow>('trips').where({ id }).first();
    return row ? mapRow(row) : null;
  }

  async findByUserId(
    userId: string,
    options: {
      readonly limit: number;
      readonly offset: number;
      readonly status?: TripStatus;
      readonly category?: TripCategoryFilter;
    },
  ): Promise<Trip[]> {
    const now = new Date();
    const qb = this.knex<TripRow>('trips').where({ user_id: userId });
    if (options.status !== undefined) {
      qb.andWhere({ status: options.status });
    }
    if (options.category !== undefined) {
      applyCategoryFilter(qb, options.category, now);
    }
    applyListOrder(qb, options.category);
    const rows = await qb.limit(options.limit).offset(options.offset);
    return rows.map(mapRow);
  }

  async update(id: string, data: TripUpdatePatch): Promise<Trip | null> {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) {
      patch.title = data.title;
    }
    if (data.destination !== undefined) {
      patch.destination = data.destination;
    }
    if (data.startDate !== undefined) {
      patch.start_date = data.startDate;
    }
    if (data.endDate !== undefined) {
      patch.end_date = data.endDate;
    }
    if (data.status !== undefined) {
      patch.status = data.status;
    }
    if (data.coverImageUrl !== undefined) {
      patch.cover_image_url = data.coverImageUrl;
    }
    if (Object.keys(patch).length === 0) {
      return this.findById(id);
    }
    patch.updated_at = this.knex.fn.now();
    const rows = await this.knex<TripRow>('trips').where({ id }).update(patch).returning('*');
    const row = rows[0];
    return row ? mapRow(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.knex('trips').where({ id }).del();
  }
}
