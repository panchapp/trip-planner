import { AuthController } from '@modules/auth/auth.controller';
import { AuthService } from '@modules/auth/auth.service';
import { RefreshTokenRepository } from '@modules/auth/interfaces/refresh-token.repository';
import { UserRepository } from '@modules/auth/interfaces/user.repository';
import { RefreshTokenKnexRepository } from '@modules/auth/repositories/refresh-token-knex.repository';
import { UserKnexRepository } from '@modules/auth/repositories/user-knex.repository';
import { GoogleOAuthStrategy } from '@modules/auth/strategies/google-oauth.strategy';
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('app.jwtSecret'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('app.jwtExpiresInSeconds'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: UserRepository, useClass: UserKnexRepository },
    { provide: RefreshTokenRepository, useClass: RefreshTokenKnexRepository },
    GoogleOAuthStrategy,
    JwtStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
