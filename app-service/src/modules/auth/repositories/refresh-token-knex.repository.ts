import type { RefreshToken } from '@app/modules/auth/entities/refresh-token';
import { KNEX } from '@common/database/database.constants';
import { RefreshTokenRepository } from '@modules/auth/interfaces/refresh-token.repository';
import { Inject, Injectable } from '@nestjs/common';
import type { Knex } from 'knex';

interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

function mapRow(row: RefreshTokenRow): RefreshToken {
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

@Injectable()
export class RefreshTokenKnexRepository extends RefreshTokenRepository {
  constructor(@Inject(KNEX) private readonly knex: Knex) {
    super();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.knex('refresh_tokens').where({ user_id: userId }).delete();
  }

  async deleteById(id: string): Promise<void> {
    await this.knex('refresh_tokens').where({ id }).delete();
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const row = await this.knex<RefreshTokenRow>('refresh_tokens')
      .where({ token_hash: tokenHash })
      .first();
    return row ? mapRow(row) : null;
  }

  async create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    const [row] = await this.knex<RefreshTokenRow>('refresh_tokens')
      .insert({
        user_id: data.userId,
        token_hash: data.tokenHash,
        expires_at: data.expiresAt,
      })
      .returning('*');
    return mapRow(row);
  }
}
