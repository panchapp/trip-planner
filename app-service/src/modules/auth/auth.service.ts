import type { User } from '@app/modules/auth/entities/user';
import { UserProfileDto } from '@modules/auth/dto/user-profile.dto';
import { RefreshTokenRepository } from '@modules/auth/interfaces/refresh-token.repository';
import { UserRepository } from '@modules/auth/interfaces/user.repository';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  typ: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async findOrCreateUser(profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  }): Promise<User> {
    const existing = await this.userRepository.findByGoogleId(profile.googleId);

    if (existing) {
      return this.userRepository.updateProfile(existing.id, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        avatarUrl: profile.avatarUrl ?? null,
      });
    }

    return this.userRepository.create({
      googleId: profile.googleId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl ?? null,
    });
  }

  signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      typ: 'access',
    };
    const expiresIn = this.configService.getOrThrow<number>('app.jwtExpiresInSeconds');
    return this.jwtService.sign(payload, { expiresIn });
  }

  signRefreshToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      typ: 'refresh',
    };
    const secret = this.configService.getOrThrow<string>('app.jwtRefreshSecret');
    const expiresIn = this.configService.getOrThrow<number>('app.jwtRefreshExpiresInSeconds');
    return this.jwtService.sign(payload, { secret, expiresIn });
  }

  async issueTokenPair(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);
    await this.replaceAllRefreshSessionsForUser(user, refreshToken);
    return { accessToken, refreshToken };
  }

  private hashRefreshToken(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }

  private getRefreshExpiryDate(): Date {
    const ttlSeconds = this.configService.getOrThrow<number>('app.jwtRefreshExpiresInSeconds');
    return new Date(Date.now() + ttlSeconds * 1000);
  }

  private async replaceAllRefreshSessionsForUser(
    user: User,
    rawRefreshToken: string,
  ): Promise<void> {
    await this.refreshTokenRepository.deleteByUserId(user.id);
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashRefreshToken(rawRefreshToken),
      expiresAt: this.getRefreshExpiryDate(),
    });
  }

  async refreshFromRawToken(
    rawRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const secret = this.configService.getOrThrow<string>('app.jwtRefreshSecret');
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(rawRefreshToken, { secret });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const presentedHash = this.hashRefreshToken(rawRefreshToken);
    const row = await this.refreshTokenRepository.findByTokenHash(presentedHash);

    if (!row || row.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (row.expiresAt.getTime() < Date.now()) {
      await this.refreshTokenRepository.deleteById(row.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.refreshTokenRepository.deleteById(row.id);

    const accessToken = this.signAccessToken(user);
    const newRefreshToken = this.signRefreshToken(user);
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashRefreshToken(newRefreshToken),
      expiresAt: this.getRefreshExpiryDate(),
    });

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeAllRefreshTokensForUserId(userId: string): Promise<void> {
    await this.refreshTokenRepository.deleteByUserId(userId);
  }

  async tryRevokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const secret = this.configService.getOrThrow<string>('app.jwtRefreshSecret');
    try {
      const payload = this.jwtService.verify<JwtPayload>(rawRefreshToken, { secret });
      if (payload.typ !== 'refresh' || !payload.sub) {
        return;
      }
      const presentedHash = this.hashRefreshToken(rawRefreshToken);
      const row = await this.refreshTokenRepository.findByTokenHash(presentedHash);
      if (!row || row.userId !== payload.sub) {
        return;
      }
      await this.refreshTokenRepository.deleteById(row.id);
    } catch {
      // Invalid or expired token — cookies still cleared by controller.
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
