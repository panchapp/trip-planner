import { AuthService } from '@modules/auth/auth.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('app.googleClientId'),
      clientSecret: configService.getOrThrow<string>('app.googleClientSecret'),
      callbackURL: configService.getOrThrow<string>('app.googleCallbackUrl'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id: googleId, emails, name, photos } = profile;
    const email = emails?.[0]?.value;
    const firstName = name?.givenName ?? '';
    const lastName = name?.familyName ?? '';
    const avatarUrl = photos?.[0]?.value ?? null;

    if (!email) {
      done(new Error('Email not provided by Google'), undefined);
      return;
    }

    try {
      const user = await this.authService.findOrCreateUser({
        googleId,
        email,
        firstName,
        lastName,
        avatarUrl,
      });
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
