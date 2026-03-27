import { registerAs } from '@nestjs/config';
import { z } from 'zod';

const appConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  isProduction: z.boolean(),
  googleClientId: z.string().min(1),
  googleClientSecret: z.string().min(1),
  googleCallbackUrl: z.string().url(),
  jwtSecret: z.string().min(1),
  jwtExpiresInSeconds: z.number().int().positive(),
  jwtRefreshSecret: z.string().min(1),
  jwtRefreshExpiresInSeconds: z.number().int().positive(),
  authCookieSecure: z.boolean(),
  authCookieMaxAgeMs: z.number().int().positive(),
  refreshCookieMaxAgeMs: z.number().int().positive(),
  databaseUrl: z.url(),
  corsOrigin: z.url(),
  frontendUrl: z.url(),
  throttleTtlMs: z.number().int().positive(),
  throttleLimit: z.number().int().positive(),
});

type AppConfig = z.infer<typeof appConfigSchema>;

function configFromEnv(): unknown {
  return {
    port: parseInt(process.env['PORT'] ?? '', 10),
    isProduction: process.env['NODE_ENV'] === 'production',
    googleClientId: process.env['GOOGLE_CLIENT_ID'],
    googleClientSecret: process.env['GOOGLE_CLIENT_SECRET'],
    googleCallbackUrl: process.env['GOOGLE_CALLBACK_URL'],
    jwtSecret: process.env['JWT_SECRET'],
    jwtExpiresInSeconds: parseInt(process.env['JWT_EXPIRES_IN_SECONDS'] ?? '', 10),
    jwtRefreshSecret: process.env['JWT_REFRESH_SECRET'],
    jwtRefreshExpiresInSeconds: parseInt(process.env['JWT_REFRESH_EXPIRES_IN_SECONDS'] ?? '', 10),
    authCookieSecure: process.env['AUTH_COOKIE_SECURE'] === 'true',
    authCookieMaxAgeMs: parseInt(process.env['AUTH_COOKIE_MAX_AGE_MS'] ?? '', 10),
    refreshCookieMaxAgeMs: parseInt(process.env['REFRESH_COOKIE_MAX_AGE_MS'] ?? '', 10),
    databaseUrl: process.env['DATABASE_URL'],
    corsOrigin: process.env['FRONTEND_URL'],
    frontendUrl: process.env['FRONTEND_URL'],
    throttleTtlMs: parseInt(process.env['THROTTLE_TTL_MS'] ?? '', 10),
    throttleLimit: parseInt(process.env['THROTTLE_LIMIT'] ?? '', 10),
  };
}

export default registerAs('app', (): AppConfig => {
  const result = appConfigSchema.safeParse(configFromEnv());

  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${detail}`);
  }

  return result.data;
});
