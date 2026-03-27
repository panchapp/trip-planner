import type { User } from '@app/modules/auth/entities/user';
import { KNEX } from '@common/database/database.constants';
import { UserRepository } from '@modules/auth/interfaces/user.repository';
import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';

interface UserRow {
  id: string;
  email: string;
  google_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  created_at: Date;
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    googleId: row.google_id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

@Injectable()
export class UserKnexRepository extends UserRepository {
  constructor(@Inject(KNEX) private readonly knex: Knex) {
    super();
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.knex<UserRow>('users').where({ google_id: googleId }).first();
    return row ? mapRow(row) : null;
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.knex<UserRow>('users').where({ id }).first();
    return row ? mapRow(row) : null;
  }

  async create(data: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  }): Promise<User> {
    const [row] = await this.knex<UserRow>('users')
      .insert({
        google_id: data.googleId,
        email: data.email,
        first_name: data.firstName,
        last_name: data.lastName,
        avatar_url: data.avatarUrl,
      })
      .returning('*');
    return mapRow(row);
  }

  async updateProfile(
    id: string,
    data: { firstName: string; lastName: string; avatarUrl: string | null },
  ): Promise<User> {
    const [row] = await this.knex<UserRow>('users')
      .where({ id })
      .update({
        first_name: data.firstName,
        last_name: data.lastName,
        avatar_url: data.avatarUrl,
      })
      .returning('*');
    return mapRow(row);
  }
}
