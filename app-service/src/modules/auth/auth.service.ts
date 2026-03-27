import { UserProfileDto } from '@modules/auth/dto/user-profile.dto';
import { RefreshToken } from '@modules/auth/entities/refresh-token.entity';
import { User } from '@modules/auth/entities/user.entity';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';

export interface JwtPayload {
  sub: string;
  email: string;
  typ: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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
    let user = await this.userRepository.findOne({
      where: { googleId: profile.googleId },
    });

    if (user) {
      user.firstName = profile.firstName;
      user.lastName = profile.lastName;
      user.avatarUrl = profile.avatarUrl ?? null;
      await this.userRepository.save(user);
      return user;
    }

    user = this.userRepository.create({
      googleId: profile.googleId,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatarUrl: profile.avatarUrl ?? null,
    });
    return this.userRepository.save(user);
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
    await this.refreshTokenRepository.delete({ userId: user.id });
    const entity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashRefreshToken(rawRefreshToken),
      expiresAt: this.getRefreshExpiryDate(),
    });
    await this.refreshTokenRepository.save(entity);
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
    const row = await this.refreshTokenRepository.findOne({
      where: { tokenHash: presentedHash },
    });

    if (!row || row.userId !== payload.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (row.expiresAt.getTime() < Date.now()) {
      await this.refreshTokenRepository.delete({ id: row.id });
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.refreshTokenRepository.delete({ id: row.id });

    const accessToken = this.signAccessToken(user);
    const newRefreshToken = this.signRefreshToken(user);
    const newRow = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashRefreshToken(newRefreshToken),
      expiresAt: this.getRefreshExpiryDate(),
    });
    await this.refreshTokenRepository.save(newRow);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async revokeAllRefreshTokensForUserId(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  async tryRevokeRefreshToken(rawRefreshToken: string): Promise<void> {
    const secret = this.configService.getOrThrow<string>('app.jwtRefreshSecret');
    try {
      const payload = this.jwtService.verify<JwtPayload>(rawRefreshToken, { secret });
      if (payload.typ !== 'refresh' || !payload.sub) {
        return;
      }
      const presentedHash = this.hashRefreshToken(rawRefreshToken);
      const row = await this.refreshTokenRepository.findOne({
        where: { tokenHash: presentedHash },
      });
      if (!row || row.userId !== payload.sub) {
        return;
      }
      await this.refreshTokenRepository.delete({ id: row.id });
    } catch {
      // Invalid or expired token — cookies still cleared by controller.
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
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
