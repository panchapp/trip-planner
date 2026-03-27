import { KNEX } from '@common/database/database.constants';
import { KnexShutdownHook } from '@common/database/knex-shutdown.hook';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import knex, { type Knex } from 'knex';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: KNEX,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Knex => {
        return knex({
          client: 'pg',
          connection: configService.getOrThrow<string>('app.databaseUrl'),
          pool: { min: 0, max: 10 },
        });
      },
    },
    KnexShutdownHook,
  ],
  exports: [KNEX],
})
export class DatabaseModule {}
