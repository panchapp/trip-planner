import type { RefreshToken } from '@app/modules/auth/entities/refresh-token';

export abstract class RefreshTokenRepository {
  abstract deleteByUserId(userId: string): Promise<void>;
  abstract deleteById(id: string): Promise<void>;
  abstract findByTokenHash(tokenHash: string): Promise<RefreshToken | null>;
  abstract create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken>;
}
