import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { AuthService } from '@modules/auth/auth.service';
import { UserProfileDto } from '@modules/auth/dto/user-profile.dto';
import type { User } from '@modules/auth/entities/user.entity';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

const getCookieOptions = (secure: boolean, maxAge: number) => ({
  httpOnly: true,
  secure,
  sameSite: 'lax' as const,
  maxAge,
  path: '/' as const,
});

const getClearCookieOptions = (secure: boolean) => ({
  httpOnly: true,
  secure,
  sameSite: 'lax' as const,
  path: '/' as const,
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const { accessToken, refreshToken } = await this.authService.issueTokenPair(user);
    const frontendUrl = this.configService.getOrThrow<string>('app.frontendUrl');
    const cookieSecure = this.configService.getOrThrow<boolean>('app.authCookieSecure');
    const accessCookieMaxAgeMs = this.configService.getOrThrow<number>('app.authCookieMaxAgeMs');
    const refreshCookieMaxAgeMs = this.configService.getOrThrow<number>(
      'app.refreshCookieMaxAgeMs',
    );

    res.cookie(ACCESS_COOKIE, accessToken, getCookieOptions(cookieSecure, accessCookieMaxAgeMs));
    res.cookie(REFRESH_COOKIE, refreshToken, getCookieOptions(cookieSecure, refreshCookieMaxAgeMs));
    res.redirect(frontendUrl);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const raw = cookies?.[REFRESH_COOKIE];
    if (typeof raw !== 'string' || raw.length === 0) {
      throw new UnauthorizedException('No refresh token');
    }

    const { accessToken, refreshToken } = await this.authService.refreshFromRawToken(raw);
    const cookieSecure = this.configService.getOrThrow<boolean>('app.authCookieSecure');
    const accessCookieMaxAgeMs = this.configService.getOrThrow<number>('app.authCookieMaxAgeMs');
    const refreshCookieMaxAgeMs = this.configService.getOrThrow<number>(
      'app.refreshCookieMaxAgeMs',
    );

    res.cookie(ACCESS_COOKIE, accessToken, getCookieOptions(cookieSecure, accessCookieMaxAgeMs));
    res.cookie(REFRESH_COOKIE, refreshToken, getCookieOptions(cookieSecure, refreshCookieMaxAgeMs));
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res() res: Response) {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const raw = cookies?.[REFRESH_COOKIE];
    if (typeof raw === 'string' && raw.length > 0) {
      await this.authService.tryRevokeRefreshToken(raw);
    }

    const cookieSecure = this.configService.getOrThrow<boolean>('app.authCookieSecure');
    const clearOpts = getClearCookieOptions(cookieSecure);
    res.clearCookie(ACCESS_COOKIE, clearOpts);
    res.clearCookie(REFRESH_COOKIE, clearOpts);
    res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User): UserProfileDto {
    return this.authService.toProfileDto(user);
  }
}
