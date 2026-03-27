import { KNEX } from '@common/database/database.constants';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Knex } from 'knex';

@Injectable()
export class KnexShutdownHook implements OnModuleDestroy {
  constructor(@Inject(KNEX) private readonly knex: Knex) {}

  async onModuleDestroy(): Promise<void> {
    await this.knex.destroy();
  }
}
